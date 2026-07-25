"""Structure stage: fetch snapshot → LLM prereq groups → structured snapshot.

Reads courses.json from the newest (or a named) catalog_courses fetch
snapshot; never touches the network except localhost Ollama. Progress is
appended to progress.jsonl in staging so an interrupted run can --resume
without re-paying for completed LLM calls (a full catalog run is ~1,800 calls
/ ~30 min on the 4GB GPU).

Guards:
- Per-course: model output failing to parse/validate → course quarantined
  with prereq_groups=null (never guessed), recorded in the FailureBudget;
  budget over 5% aborts the run (systemic drift, not item noise).
- Cross-reference: prereq codes not present in the scraped catalog are kept
  (they may reference another edition) but reported in the manifest as
  unresolved for audit.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

from common.guards import FailureBudget, PipelineAbort, expect
from common.ollama import DEFAULT_MODEL, OllamaError, chat_json
from common.snapshot import SnapshotWriter, latest, load_manifest

from . import prompts


def run(
    fetch_snapshot: Path | None = None,
    model: str = DEFAULT_MODEL,
    limit: int | None = None,
    resume_from: Path | None = None,
) -> None:
    src = fetch_snapshot or latest("ucsc", "catalog_courses")
    expect(src is not None, "no catalog_courses fetch snapshot to structure")
    src_manifest = load_manifest(src)
    expect(
        src_manifest.get("stage") == "fetch",
        "source snapshot is not a fetch snapshot",
        path=str(src),
    )
    courses = json.loads((src / "courses.json").read_text())

    done: dict[str, dict] = {}
    if resume_from is not None:
        for line in (resume_from / "progress.jsonl").read_text().splitlines():
            rec = json.loads(line)
            done[rec["code"]] = rec
        print(f"resuming: {len(done)} courses already structured", file=sys.stderr)

    writer = SnapshotWriter("ucsc", "catalog_courses_structured")
    progress_path = writer.path("progress.jsonl")
    try:
        _run_inner(writer, progress_path, courses, src, src_manifest, model, limit, done)
    except BaseException:
        # Keep staging for --resume instead of discarding paid LLM work.
        preserved = writer.staging_dir
        print(f"aborted; progress preserved for --resume at {preserved}", file=sys.stderr)
        raise


def _run_inner(writer, progress_path, courses, src, src_manifest, model, limit, done):
    llm_courses = [c for c in courses if prompts.needs_llm(c["raw_requirements"])]
    if limit:
        llm_courses = llm_courses[:limit]
    budget = FailureBudget(total=max(len(llm_courses), 1), max_ratio=0.05)
    catalog_codes = {c["code"] for c in courses}

    t0 = time.monotonic()
    calls = 0
    with progress_path.open("a") as progress:
        for i, course in enumerate(llm_courses):
            if course["code"] in done:
                continue
            raw = course["raw_requirements"]
            groups: list | None = []
            try:
                parsed, _metrics = chat_json(
                    prompts.SYSTEM_PROMPT,
                    prompts.user_message(prompts.preprocess(raw)),
                    model=model,
                )
                calls += 1
                if parsed is None:
                    budget.record(course["code"], "unparseable model output")
                    groups = None
                else:
                    groups = prompts.clean_groups(parsed, raw)
            except OllamaError as exc:
                budget.record(course["code"], f"ollama error: {exc}")
                groups = None
            progress.write(json.dumps({"code": course["code"], "prereq_groups": groups}) + "\n")
            progress.flush()
            done[course["code"]] = {"code": course["code"], "prereq_groups": groups}
            if (i + 1) % 100 == 0:
                rate = calls / max(time.monotonic() - t0, 1)
                print(
                    f"  {i + 1}/{len(llm_courses)} ({rate:.1f} calls/s, "
                    f"{len(budget.failures)} failures)",
                    file=sys.stderr,
                )

    structured = []
    unresolved: set[str] = set()
    with_groups = 0
    for course in courses:
        rec = dict(course)
        entry = done.get(course["code"])
        if entry is not None:
            rec["prereq_groups"] = entry["prereq_groups"]
        elif prompts.needs_llm(course["raw_requirements"]):
            rec["prereq_groups"] = None  # not processed in a --limit run
        else:
            rec["prereq_groups"] = []
        if rec["prereq_groups"]:
            with_groups += 1
            for group in rec["prereq_groups"]:
                unresolved.update(g for g in group if g not in catalog_codes)
        structured.append(rec)

    writer.write_json("courses.json", structured)
    final = writer.finalize(
        {
            "stage": "structured",
            "source_snapshot": str(src),
            "catalog_year": src_manifest.get("catalog_year"),
            "model": model,
            "prompt_version": prompts.PROMPT_VERSION,
            "counts": {
                "courses": len(structured),
                "llm_candidates": len(llm_courses),
                "llm_calls": calls,
                "with_prereq_groups": with_groups,
                "quarantined": len(budget.failures),
            },
            "failures": budget.failures,
            "unresolved_prereq_codes": sorted(unresolved),
        }
    )
    print(f"snapshot: {final}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fetch-snapshot", type=Path, help="specific fetch snapshot dir")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--limit", type=int, help="only structure the first N LLM candidates")
    ap.add_argument(
        "--resume", type=Path, dest="resume_from",
        help="path to an aborted run's .staging dir (reuses its progress.jsonl)",
    )
    args = ap.parse_args()
    try:
        run(
            fetch_snapshot=args.fetch_snapshot,
            model=args.model,
            limit=args.limit,
            resume_from=args.resume_from,
        )
    except PipelineAbort as exc:
        print(f"PIPELINE ABORTED: {exc}", file=sys.stderr)
        sys.exit(2)
    finally:
        # Old finalized staging dirs from --resume runs are safe to clean by hand;
        # we never auto-delete them here.
        pass


if __name__ == "__main__":
    main()
