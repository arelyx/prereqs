"""Refresh orchestrator: what is stale, what changed, what to run.

This is the entry point a refreshing agent runs FIRST. It reads the ledger
(``data-committed/ucsc/ledger.json``), applies each source's cadence rule,
optionally probes the live sites (a handful of cheap requests), and prints a
work order split into HOT tasks (deterministic commands — just run them) and
WARM tasks (need a frontier agent: harness authoring, prereq residue).

  python -m ucsc.refresh status            # ledger + cadence only, no network
  python -m ucsc.refresh status --probe    # + live checks (~13 requests)
  python -m ucsc.refresh status --json     # machine-readable work order
  python -m ucsc.refresh hot [--probe]     # run every due HOT task in order

Cadence (why each rule is what it is) — see docs/REFRESH.md for the calendar:

  pisa_offerings  per term. A new term appears in pisa's dropdown ~6 weeks
                  before it starts; it is fetched then, re-fetched on every
                  refresh while non-final (enrollment/instructors move), and
                  frozen once its grading period ends.
  soe_schedule    yearly, revised in place. Baskin publishes next year's plan
                  about a year ahead; re-check monthly (content hash).
  catalog_courses yearly edition (~July), occasional mid-year corrections;
                  re-fetch when the edition label changes or every 90 days.
  programs        yearly edition. A new edition = fetch + export sources;
                  every harness authored against an older source hash becomes
                  a WARM task. The previous edition is re-fetched once from
                  its archive URL so its committed copy is final.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path

from . import editions, ledger
from .pisa_offerings import terms

REPO_ROOT = ledger.COMMITTED_ROOT.parent.parent
HARNESS_ROOT = REPO_ROOT / "harnesses" / "ucsc"

CATALOG_MAX_AGE_DAYS = 90
SOE_MAX_AGE_DAYS = 30
PISA_URL = "https://pisa.ucsc.edu/class_search/index.php"
CATALOG_PROBE_URL = f"{editions.BASE_URL}/en/current/general-catalog/academic-programs/bachelors-degrees"
SOE_PROBE_URL = "https://courses.engineering.ucsc.edu/courses/cse"


@dataclass
class Task:
    path: str  # "hot" | "warm"
    source: str
    why: str
    commands: list[str] = field(default_factory=list)
    items: list[str] = field(default_factory=list)


def _age_days(iso: str | None) -> float | None:
    if not iso:
        return None
    then = datetime.fromisoformat(iso)
    return (datetime.now(timezone.utc) - then).total_seconds() / 86400


# --- live probes (cheap; only with --probe) ----------------------------------

def probe() -> dict:
    from common.http import PoliteSession

    s = PoliteSession(min_interval=1.0)
    out: dict = {}
    html = s.get(PISA_URL).text
    out["pisa_terms"] = sorted(set(re.findall(r"<option value='(2\d{3})'", html)), key=int)
    out["catalog_edition"] = editions.detect(s.get(CATALOG_PROBE_URL).text)
    out["soe_cse_sha256"] = hashlib.sha256(s.get(SOE_PROBE_URL).content).hexdigest()
    return out


# --- harness manifests (warm path bookkeeping) -------------------------------

def harness_manifests() -> dict[tuple[str, str], dict]:
    """(edition, slug) -> manifest for every harness in the repo.

    Contract (every requirement-tracking approach must honor it): each
    program harness lives in ``harnesses/ucsc/<edition>/<slug>/`` and has a
    ``manifest.json`` with at least ``{"program", "edition",
    "source_sha256", "status"}``, where ``source_sha256`` is the hash of the
    committed source text the harness was authored/verified against, and
    optionally ``depends_on: {slug: sha}`` for other programs' pages it uses.
    """
    out = {}
    if not HARNESS_ROOT.exists():
        return out
    for m in HARNESS_ROOT.glob("*/*/manifest.json"):
        d = json.loads(m.read_text())
        out[(d["edition"], d["program"])] = d
    return out


# --- the work order ----------------------------------------------------------

def plan(live: dict | None, today: date | None = None) -> list[Task]:
    today = today or date.today()
    led = ledger.load()
    tasks: list[Task] = []

    # pisa ------------------------------------------------------------------
    pisa = led.get("pisa_offerings", {}).get("terms", {})
    have = set(pisa)
    newest_have = max(have, key=int) if have else None
    non_final = sorted(t for t, v in pisa.items() if not terms.is_final(t, today))
    if live:
        new_terms = [t for t in live["pisa_terms"] if newest_have is None or int(t) > int(newest_have)]
    else:
        # Without a probe, assume every term after the newest we have is
        # published once it is within ~10 weeks of starting (pisa posts a
        # quarter ~6 weeks ahead).
        new_terms = []
        nxt = terms.next_code(newest_have) if newest_have else None
        while nxt and _published_soon(nxt, today):
            new_terms.append(nxt)
            nxt = terms.next_code(nxt)
    fetch = sorted(set(new_terms) | set(non_final), key=int)
    if fetch:
        why = []
        if new_terms:
            why.append(f"new term(s) {', '.join(new_terms)}" + ("" if live else " (expected; confirm with --probe)"))
        if non_final:
            why.append(f"non-final term(s) {', '.join(non_final)} still changing")
        cmds = []
        if len(new_terms) > 3:
            # Long gaps go through the chunked driver (upstream 504s under
            # sustained load); it skips terms already in finalized snapshots.
            cmds.append(f"python -m ucsc.pisa_offerings.backfill --from {new_terms[0]} --to {new_terms[-1]}")
            rest = non_final
        else:
            rest = fetch
        if rest:
            cmds.append(f"python -m ucsc.pisa_offerings.run --terms {','.join(rest)}")
        cmds.append("python -m ucsc.pisa_offerings.export")
        tasks.append(Task("hot", "pisa_offerings", "; ".join(why), cmds))

    # SOE -------------------------------------------------------------------
    soe = led.get("soe_schedule", {})
    age = _age_days(soe.get("fetched_at"))
    if age is None or age > SOE_MAX_AGE_DAYS:
        tasks.append(Task("hot", "soe_schedule",
                          "never fetched" if age is None else f"last fetched {age:.0f} days ago (> {SOE_MAX_AGE_DAYS})",
                          ["python -m ucsc.soe_schedule.run", "python -m ucsc.soe_schedule.export"]))

    # catalog edition + courses ----------------------------------------------
    cat = led.get("catalog_courses", {})
    eds = sorted(led.get("editions", {}))
    live_ed = live.get("catalog_edition") if live else None
    newest_ed = eds[-1] if eds else None
    age = _age_days(cat.get("fetched_at"))
    new_edition = bool(live_ed and newest_ed and live_ed > newest_ed)
    if age is None or age > CATALOG_MAX_AGE_DAYS or new_edition or (live_ed and cat.get("edition") != live_ed):
        why = "new catalog edition " + live_ed if new_edition else (
            "never fetched" if age is None else f"last fetched {age:.0f} days ago")
        tasks.append(Task("hot", "catalog_courses", why, [
            "python -m ucsc.catalog_courses.fetch",
            "python -m ucsc.catalog_courses.structure",
            "python -m ucsc.export_committed --courses",
        ]))

    # programs (sources) ------------------------------------------------------
    if new_edition or not eds:
        tasks.append(Task("hot", "programs",
                          f"new edition {live_ed}" if new_edition else "no edition exported yet",
                          ["python -m ucsc.major_requirements.fetch",
                           "python -m ucsc.major_requirements.export_sources"]))
        if newest_ed and new_edition:
            tasks.append(Task("hot", "programs",
                              f"edition {newest_ed} is now archived; refetch its final copy once",
                              [f"python -m ucsc.major_requirements.fetch --edition {newest_ed}",
                               f"python -m ucsc.major_requirements.export_sources --edition {newest_ed}"]))
    else:
        age = _age_days(led["editions"][newest_ed].get("fetched_at"))
        if age is not None and age > CATALOG_MAX_AGE_DAYS:
            tasks.append(Task("hot", "programs",
                              f"edition {newest_ed} sources last fetched {age:.0f} days ago (mid-year corrections)",
                              ["python -m ucsc.major_requirements.fetch",
                               "python -m ucsc.major_requirements.export_sources"]))

    # WARM: harnesses vs sources ----------------------------------------------
    manifests = harness_manifests()
    for ed in eds:
        progs = led["editions"][ed]["programs"]
        missing, stale_struct, stale_text, stale_dep = [], [], [], []
        for slug, h in sorted(progs.items()):
            m = manifests.get((ed, slug))
            if m is None:
                missing.append(slug)
                continue
            for dep, sha in (m.get("depends_on") or {}).items():
                if progs.get(dep, {}).get("text") != sha:
                    stale_dep.append(f"{slug} (uses {dep})")
            if m.get("source_sha256") != h["text"]:
                if m.get("skeleton_sha256") and m["skeleton_sha256"] == h["skeleton"]:
                    stale_text.append(slug)
                else:
                    stale_struct.append(slug)
        if stale_struct:
            tasks.append(Task("warm", "harness", f"edition {ed}: requirement STRUCTURE changed since authored",
                              items=stale_struct))
        if stale_text:
            tasks.append(Task("warm", "harness", f"edition {ed}: wording changed since authored (review diff; may be cosmetic)",
                              items=stale_text))
        if stale_dep:
            tasks.append(Task("warm", "harness", f"edition {ed}: a page this harness relies on changed",
                              items=stale_dep))
        if missing and manifests:
            tasks.append(Task("warm", "harness", f"edition {ed}: no harness yet", items=missing))

    # WARM: prereq residue ---------------------------------------------------
    resid = cat.get("prereq_unresolved") or []
    if resid:
        tasks.append(Task("warm", "prereqs", "ambiguous prerequisite text without a valid override",
                          items=resid))
    return tasks


def _published_soon(code: str, today: date) -> bool:
    year, season = terms.parse_code(code)
    start = date(year, terms._SEASON_START_MONTH[season], 1)
    return (start - today).days < 70


def print_status(tasks: list[Task], live: dict | None) -> None:
    led = ledger.load()
    print("== ledger")
    pisa = led.get("pisa_offerings", {}).get("terms", {})
    if pisa:
        ts = sorted(pisa, key=int)
        print(f"  pisa_offerings  {len(ts)} terms {ts[0]}..{ts[-1]}; "
              f"non-final: {[t for t in ts if not pisa[t]['final']]}")
    soe = led.get("soe_schedule")
    if soe:
        print(f"  soe_schedule    {soe['academic_year']} fetched {soe['fetched_at']}")
    cat = led.get("catalog_courses")
    if cat:
        print(f"  catalog_courses {cat.get('edition')} fetched {cat.get('fetched_at')} "
              f"({cat.get('courses')} courses)")
    for ed, v in sorted(led.get("editions", {}).items()):
        print(f"  programs {ed}  {len(v['programs'])} sources fetched {v['fetched_at']}"
              f"{' (live)' if v.get('live') else ' (archive)'}")
    if live:
        print(f"== live: newest pisa term {live['pisa_terms'][-1]}, catalog edition {live['catalog_edition']}")
    print("== work order")
    if not tasks:
        print("  nothing due")
    for t in tasks:
        print(f"  [{t.path.upper()}] {t.source}: {t.why}")
        for c in t.commands:
            print(f"      $ {c}")
        if t.items:
            shown = ", ".join(t.items[:12]) + (f", … (+{len(t.items) - 12})" if len(t.items) > 12 else "")
            print(f"      items: {shown}")


def run_hot(tasks: list[Task]) -> int:
    for t in tasks:
        if t.path != "hot":
            continue
        for c in t.commands:
            print(f"$ {c}", flush=True)
            code = subprocess.call([sys.executable, *c.split()[1:]], cwd=Path(__file__).parent.parent)
            if code != 0:
                print(f"HOT TASK FAILED ({t.source}): {c} exited {code} — stopping; "
                      "an abort means upstream drift, read its message", file=sys.stderr)
                return code
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("action", choices=["status", "hot"])
    ap.add_argument("--probe", action="store_true", help="check the live sites too")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    live = probe() if args.probe else None
    tasks = plan(live)
    if args.action == "status":
        if args.json:
            print(json.dumps({"live": live, "tasks": [asdict(t) for t in tasks]}, indent=1))
        else:
            print_status(tasks, live)
    else:
        sys.exit(run_hot(tasks))


if __name__ == "__main__":
    main()
