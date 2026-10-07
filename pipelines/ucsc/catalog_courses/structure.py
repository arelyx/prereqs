"""Structure stage: fetch snapshot -> deterministic prereq groups -> structured snapshot.

Reads courses.json from the newest (or a named) catalog_courses fetch
snapshot. No network, no model: every course's raw_requirements goes through
prereq_parse (the hot path); texts the parser marks ambiguous are resolved by
prereq_overrides.json (the warm path, hand-written by a frontier agent and
keyed by the text's sha1). A full catalog run takes about a second.

Per-course output fields:
  prereq_groups   CNF (outer AND, inner OR); [] = none; null = unresolved
  coreqs          CNF of courses that must be taken in the same term
  concurrent_ok   codes in prereq_groups that may be taken in the same term
  prereq_source   "parser" | "override" | "unresolved" | "none" (no text)

Guards:
- Unresolved (ambiguous and not overridden) courses get prereq_groups=null,
  never a guess, and are listed in the snapshot's ambiguous.json (the work
  queue for the warm path). Over 10% unresolved aborts the run: that means the
  catalog's phrasing changed, not that a few texts are odd.
- Stale overrides (raw text changed since the override was written) are
  ignored and reported; so are overrides for codes no longer in the catalog.
- Prereq codes not present in the scraped catalog are kept (they may
  reference another edition) but reported in the manifest as unresolved codes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

from common.guards import FailureBudget, PipelineAbort, expect
from common.snapshot import SnapshotWriter, latest, load_manifest

from . import prereq_overrides, prereq_parse

MAX_UNRESOLVED_RATIO = 0.10


def run(fetch_snapshot: Path | None = None) -> Path:
    src = fetch_snapshot or latest("ucsc", "catalog_courses")
    expect(src is not None, "no catalog_courses fetch snapshot to structure")
    src_manifest = load_manifest(src)
    expect(
        src_manifest.get("stage") == "fetch",
        "source snapshot is not a fetch snapshot",
        path=str(src),
    )
    courses = json.loads((src / "courses.json").read_text())
    overrides = prereq_overrides.load()

    writer = SnapshotWriter("ucsc", "catalog_courses_structured")
    try:
        return _run_inner(writer, courses, src, src_manifest, overrides)
    except BaseException:
        writer.abort()
        raise


def structure_courses(courses: list[dict], overrides: dict[str, dict]) -> tuple[list[dict], dict]:
    """Pure core: returns (structured records, report). Raises GuardViolation
    when the unresolved ratio exceeds MAX_UNRESOLVED_RATIO."""
    catalog_codes = {c["code"] for c in courses}
    with_text = [c for c in courses if (c.get("raw_requirements") or "").strip()]
    budget = FailureBudget(total=max(len(with_text), 1), max_ratio=MAX_UNRESOLVED_RATIO)

    counts: Counter = Counter()
    stale: list[dict] = []
    ambiguous: list[dict] = []
    unresolved_codes: set[str] = set()
    structured: list[dict] = []
    for course in courses:
        rec = dict(course)
        raw = course.get("raw_requirements") or ""
        if not raw.strip():
            rec.update(prereq_groups=[], coreqs=[], concurrent_ok=[], prereq_source="none")
            structured.append(rec)
            continue
        try:
            parsed = prereq_parse.parse(raw, catalog_codes, self_code=course["code"])
        except Exception as exc:  # a parser bug must not be silently skipped
            parsed = prereq_parse.ParseResult(
                groups=None, confidence=prereq_parse.AMBIGUOUS, reason=f"parser error: {exc!r}"
            )
        counts[parsed.confidence] += 1
        res = prereq_overrides.resolve(course["code"], raw, parsed, overrides)
        counts[res.source] += 1
        if res.stale:
            stale.append({"code": course["code"], "raw_sha1": prereq_parse.raw_sha1(raw)})
        if res.source == "unresolved":
            ambiguous.append(
                {
                    "code": course["code"],
                    "raw_requirements": raw,
                    "raw_sha1": prereq_parse.raw_sha1(raw),
                    "reason": parsed.reason,
                    "parser_best_effort": parsed.to_dict(),
                }
            )
            budget.record(course["code"], f"ambiguous: {parsed.reason}")
        rec.update(
            prereq_groups=(res.groups or []) if res.source != "unresolved" else None,
            coreqs=res.coreqs,
            concurrent_ok=res.concurrent_ok,
            prereq_source=res.source,
        )
        for group in (rec["prereq_groups"] or []) + rec["coreqs"]:
            unresolved_codes.update(g for g in group if g not in catalog_codes)
        structured.append(rec)

    orphans = sorted(set(overrides) - catalog_codes)
    report = {
        "counts": {
            "courses": len(structured),
            "with_requirement_text": len(with_text),
            "parser_certain": counts[prereq_parse.CERTAIN],
            "parser_ambiguous": counts[prereq_parse.AMBIGUOUS],
            "from_parser": counts["parser"],
            "overridden": counts["override"],
            "unresolved": counts["unresolved"],
            "stale_overrides": len(stale),
            "orphan_overrides": len(orphans),
            "with_prereq_groups": sum(1 for r in structured if r["prereq_groups"]),
            "with_coreqs": sum(1 for r in structured if r["coreqs"]),
        },
        "stale_overrides": stale,
        "orphan_overrides": orphans,
        "unresolved": [{"code": a["code"], "reason": a["reason"]} for a in ambiguous],
        "unresolved_prereq_codes": sorted(unresolved_codes),
        "ambiguous": ambiguous,
    }
    return structured, report


def _run_inner(writer, courses, src, src_manifest, overrides) -> Path:
    structured, report = structure_courses(courses, overrides)
    ambiguous = report.pop("ambiguous")
    writer.write_json("courses.json", structured)
    writer.write_json("ambiguous.json", ambiguous)
    overrides_sha1 = hashlib.sha1(prereq_overrides.OVERRIDES_PATH.read_bytes()).hexdigest() \
        if prereq_overrides.OVERRIDES_PATH.exists() else None
    final = writer.finalize(
        {
            "stage": "structured",
            "source_snapshot": str(src),
            "catalog_year": src_manifest.get("catalog_year"),
            # exporter provenance reads model/prompt_version; there is no model.
            "model": "none (deterministic parser)",
            "prompt_version": prereq_parse.PARSER_VERSION,
            "parser_version": prereq_parse.PARSER_VERSION,
            "overrides_sha1": overrides_sha1,
            **report,
        }
    )
    c = report["counts"]
    print(
        f"structured {c['with_requirement_text']} requirement texts: {c['from_parser']} parser, "
        f"{c['overridden']} override, {c['unresolved']} unresolved, {c['stale_overrides']} stale overrides",
        file=sys.stderr,
    )
    for s in report["stale_overrides"]:
        print(f"  STALE override (text changed): {s['code']}", file=sys.stderr)
    for code in report["orphan_overrides"]:
        print(f"  ORPHAN override (code not in catalog): {code}", file=sys.stderr)
    if report["unresolved"]:
        print(f"  unresolved queue: {final / 'ambiguous.json'}", file=sys.stderr)
    print(f"snapshot: {final}")
    return final


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fetch-snapshot", type=Path, help="specific fetch snapshot dir")
    args = ap.parse_args()
    try:
        run(fetch_snapshot=args.fetch_snapshot)
    except PipelineAbort as exc:
        print(f"PIPELINE ABORTED: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
