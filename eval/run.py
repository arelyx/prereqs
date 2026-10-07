"""Score requirement-tracking approaches against golden cases.

  python eval/run.py --adapter "<command>" [--golden eval/golden] [--out results.json]

An adapter is any command that reads ONE JSON object per line on stdin —
``{"case": <case>, "program": <program-meta>}`` — and writes one verdict
per line on stdout (contract: eval/README.md). Adapters can be written in any
language (the harness adapter runs TypeScript under node), which
keeps the scoring identical across approaches.

Program meta = the committed index entry
(``data-committed/ucsc/editions/<ed>/programs.json``) plus ``source_path``.

Scoring per case: correct (verdict == expected), wrong, or abstain (null).
Run from the repo root.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def load_cases(golden: Path) -> list[tuple[dict, dict]]:
    out = []
    index_cache: dict[str, dict] = {}
    for f in sorted(golden.glob("*.json")):
        doc = json.loads(f.read_text())
        ed = doc["edition"]
        if ed not in index_cache:
            idx = json.loads((REPO / "data-committed/ucsc/editions" / ed / "programs.json").read_text())
            index_cache[ed] = {p["slug"]: p for p in idx}
        meta = dict(index_cache[ed][doc["program"]])
        meta["source_path"] = str(REPO / "data-committed/ucsc/editions" / ed / "sources" / f"{doc['program']}.md")
        for case in doc["cases"]:
            out.append((case, meta))
    return out


def run(adapter: str, golden: Path) -> dict:
    cases = load_cases(golden)
    payload = "".join(json.dumps({"case": c, "program": m}) + "\n" for c, m in cases)
    proc = subprocess.run(adapter, shell=True, input=payload, capture_output=True, text=True, cwd=REPO)
    if proc.returncode != 0:
        sys.exit(f"adapter failed ({proc.returncode}):\n{proc.stderr[-4000:]}")
    verdicts = [json.loads(line) for line in proc.stdout.splitlines() if line.strip()]
    if len(verdicts) != len(cases):
        sys.exit(f"adapter returned {len(verdicts)} verdicts for {len(cases)} cases\n{proc.stderr[-2000:]}")
    results = []
    per_prog: dict[str, Counter] = {}
    for (case, meta), v in zip(cases, verdicts):
        want = case["expect"]["complete"]
        got = v.get("complete")
        outcome = "abstain" if got is None else ("correct" if got == want else "wrong")
        per_prog.setdefault(meta["slug"], Counter())[outcome] += 1
        results.append({
            "program": meta["slug"], "case": case["id"], "kind": case["kind"],
            "expected": want, "got": got, "outcome": outcome,
            "unmet": v.get("unmet", []), "note": v.get("note"),
            "failing_requirement": case["expect"].get("failing_requirement"),
        })
    total = Counter(r["outcome"] for r in results)
    return {"total": dict(total), "n": len(results),
            "by_program": {k: dict(c) for k, c in sorted(per_prog.items())},
            "results": results}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--adapter", required=True)
    ap.add_argument("--golden", type=Path, default=REPO / "eval" / "golden")
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()
    res = run(args.adapter, args.golden)
    if args.out:
        args.out.write_text(json.dumps(res, indent=1, ensure_ascii=False) + "\n")
    t = res["total"]
    print(f"{res['n']} cases: {t.get('correct', 0)} correct, {t.get('wrong', 0)} wrong, "
          f"{t.get('abstain', 0)} abstain")
    for prog, c in res["by_program"].items():
        print(f"  {prog:45s} correct {c.get('correct', 0):2d}  wrong {c.get('wrong', 0):2d}  abstain {c.get('abstain', 0):2d}")


if __name__ == "__main__":
    main()
