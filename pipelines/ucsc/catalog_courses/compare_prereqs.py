"""Compare the deterministic parser against the committed (qwen3:4b) groups.

    python -m ucsc.catalog_courses.compare_prereqs [--out report.md] [--sample N] [--seed S]

Reads data-committed/ucsc/courses/*.json, re-parses every course's
raw_requirements (with prereq_overrides.json applied), and reports:
  - exact CNF agreement (order-insensitive within and across groups)
  - same-set-of-codes agreement
  - disagreements bucketed by category, with a random sample
The committed groups are a baseline, not ground truth.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

from . import prereq_overrides, prereq_parse

COMMITTED = Path(__file__).resolve().parents[3] / "data-committed" / "ucsc" / "courses"


def load_courses() -> list[dict]:
    out = []
    for f in sorted(COMMITTED.glob("*.json")):
        out.extend(json.loads(f.read_text())["courses"])
    return out


def canon(groups) -> frozenset:
    return frozenset(frozenset(g) for g in (groups or []))


def codes_of(groups) -> frozenset:
    return frozenset(c for g in (groups or []) for c in g)


def categorize(qwen, mine) -> str:
    q, m = codes_of(qwen), codes_of(mine)
    if not q and m:
        return "qwen empty, parser has groups"
    if q and not m:
        return "parser empty, qwen has groups"
    if q == m:
        return "same codes, different grouping"
    if m < q:
        return "qwen has extra codes"
    if q < m:
        return "parser has extra codes"
    return "different codes"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--sample", type=int, default=40)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    courses = load_courses()
    known = {c["code"] for c in courses}
    overrides = prereq_overrides.load()
    rows = []
    stats = Counter()
    for c in courses:
        raw = c.get("raw_requirements")
        if not raw:
            continue
        res = prereq_parse.parse(raw, known, self_code=c["code"])
        resolved = prereq_overrides.resolve(c["code"], raw, res, overrides)
        stats["with_text"] += 1
        stats[resolved.source] += 1
        rows.append((c, res, resolved))

    compared = [(c, res, r) for c, res, r in rows if r.groups is not None or r.source != "unresolved"]
    exact = sum(1 for c, _, r in compared if canon(c["prereq_groups"]) == canon(r.groups))
    same_codes = sum(1 for c, _, r in compared if codes_of(c["prereq_groups"]) == codes_of(r.groups))
    disagree = [(c, res, r) for c, res, r in compared if canon(c["prereq_groups"]) != canon(r.groups)]
    cats = defaultdict(list)
    for c, res, r in disagree:
        cats[categorize(c["prereq_groups"], r.groups)].append((c, res, r))

    n = len(compared)
    lines = [
        "# Deterministic prereq parser vs committed qwen3:4b groups",
        "",
        f"parser version: `{prereq_parse.PARSER_VERSION}`",
        "",
        f"- courses with requirement text: {stats['with_text']}",
        f"- parser certain: {stats['parser']}, overridden: {stats['override']}, "
        f"ambiguous+unresolved: {stats['unresolved']}, stale overrides: {sum(1 for _, _, r in rows if r.stale)}",
        f"- compared (certain + overridden): {n}",
        f"- exact CNF equal: {exact}/{n} = {exact / max(n, 1):.1%}",
        f"- same set of codes: {same_codes}/{n} = {same_codes / max(n, 1):.1%}",
        "",
        "## Disagreement categories",
        "",
    ]
    for cat, items in sorted(cats.items(), key=lambda kv: -len(kv[1])):
        lines.append(f"- {cat}: {len(items)}")
    lines.append("")
    for cat, items in sorted(cats.items(), key=lambda kv: -len(kv[1])):
        lines.append(f"### {cat} (first 8)")
        lines.append("")
        for c, res, r in items[:8]:
            lines += _row(c, r)
    rng = random.Random(args.seed)
    sample = rng.sample(disagree, min(args.sample, len(disagree)))
    lines += ["", f"## Random sample of {len(sample)} disagreements (seed {args.seed})", ""]
    for i, (c, res, r) in enumerate(sorted(sample, key=lambda x: x[0]["code"]), 1):
        lines += [f"**{i}.**"] + _row(c, r)
    unresolved = [(c, res) for c, res, r in rows if r.source == "unresolved"]
    lines += ["", f"## Ambiguous, not overridden ({len(unresolved)})", ""]
    for c, res in unresolved:
        lines.append(f"- `{c['code']}` — {res.reason}")
    report = "\n".join(lines) + "\n"
    if args.out:
        args.out.write_text(report)
    summary = "\n".join(lines[:12])
    print(summary)
    print("\n".join(lines[12: 12 + len(cats) + 1]))
    if args.out:
        print(f"full report: {args.out}", file=sys.stderr)


def _row(c, r) -> list[str]:
    return [
        f"- `{c['code']}` ({r.source}): {c['raw_requirements']}",
        f"  - qwen:   `{json.dumps(c['prereq_groups'])}`",
        f"  - parser: `{json.dumps(r.groups)}`"
        + (f" conc_ok={r.concurrent_ok}" if r.concurrent_ok else "")
        + (f" coreqs={r.coreqs}" if r.coreqs else ""),
        "",
    ]


if __name__ == "__main__":
    main()
