"""Eval adapter for approach A: the legacy generic-JSON harness.

Runs the backend's generic rule evaluator (app.planner.evaluate_requirements)
over data-committed/ucsc/programs/<slug>.json exactly as the site does, with
two generosities so the baseline is not penalized for UI-level filtering:
qualification/screening sections are skipped (the UI hides them) and, when
the case declares a concentration, other concentrations' sections are
skipped. Verdict: any rule unsatisfied -> false; else any rule undecidable
(manual / unevaluated) -> null (abstain); else true.

``--manual-as-met`` scores the optimistic reading instead: undecidable rules
count as satisfied (what a student who trusts the gray "verify manually"
rows would conclude).

Needs DATABASE_URL (course metadata for range filters).
Run: backend/.venv/bin/python eval/adapters/legacy_json.py [--manual-as-met]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))

from app.db import SessionLocal  # noqa: E402
from app.planner import build_context, evaluate_requirements  # noqa: E402

ALIASES = {"physics-bs": "copy-of-physics-bs"}
INFO_OPS = {"info", "list", "section_choice"}


def verdict(case: dict, meta: dict, ctx, manual_as_met: bool = False) -> dict:
    f = REPO / "data-committed/ucsc/programs" / f"{ALIASES.get(meta['slug'], meta['slug'])}.json"
    if not f.exists():
        return {"complete": None, "unmet": [], "note": "no legacy harness"}
    req = json.loads(f.read_text())["requirements"]
    student = case["student"]
    taken = {c.replace(" ", "").upper() for t in student.get("terms", []) for c in t["courses"]}
    conc = (student.get("choices") or {}).get("concentration")
    sections = []
    for s in req.get("sections", []):
        if s.get("kind") in ("qualification", "screening"):
            continue
        if conc and s.get("concentration") and conc.lower() not in s["concentration"].lower():
            continue
        sections.append(s)
    out = evaluate_requirements({"sections": sections}, taken, ctx)
    unmet, unknown = [], []
    for s in out:
        for r in s["rules"]:
            if r["op"] in INFO_OPS and r.get("satisfied") is None:
                continue
            if r.get("alternative"):
                continue  # judged through its section_choice parent
            label = f"{s['title']}: {r['source'].get('heading') or r['op']}"
            if r.get("satisfied") is False:
                unmet.append(label)
            elif r.get("satisfied") is None or r.get("manual"):
                unknown.append(label)
    # section_choice parents: satisfied if any alternative satisfied
    for s in out:
        for r in s["rules"]:
            if r["op"] == "section_choice" and r.get("satisfied") is False:
                unmet.append(f"{s['title']}: {r['source'].get('heading') or 'choose one path'}")
    if unmet:
        return {"complete": False, "unmet": unmet}
    if unknown and not manual_as_met:
        return {"complete": None, "unmet": [], "note": f"{len(unknown)} rules need manual check"}
    return {"complete": True, "unmet": []}


def main() -> None:
    manual_as_met = "--manual-as-met" in sys.argv
    with SessionLocal() as db:
        ctx = build_context(db, "ucsc")
        for line in sys.stdin:
            if line.strip():
                msg = json.loads(line)
                print(json.dumps(verdict(msg["case"], msg["program"], ctx, manual_as_met)), flush=True)


if __name__ == "__main__":
    main()
