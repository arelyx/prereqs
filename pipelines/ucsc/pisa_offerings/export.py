"""Export pisa offerings snapshots into the committed dataset (hot path).

  data-committed/ucsc/offerings/<term>.jsonl   one section per line, sorted

Every finalized pisa snapshot is unioned (newest snapshot wins per term), so
chunked backfills and incremental runs compose. A term file is rewritten only
when its content changed; the ledger records per-term fetch time, row count,
and whether the term is final (frozen) — non-final terms are re-fetched on
each refresh because enrollment and instructor assignments still move.

Terms older than the product window (default 5 academic years before the
newest term) are dropped from the committed set.

  python -m ucsc.pisa_offerings.export [--window-years 5]
"""

from __future__ import annotations

import argparse
import json
import sys

from common.snapshot import DATA_ROOT

from .. import ledger
from . import terms

KEEP = (
    "course_code", "section", "class_number", "title", "instructors",
    "days_times", "location", "modality", "enrolled", "capacity", "status",
)
OUT_DIR = ledger.COMMITTED_ROOT / "offerings"


def union_snapshots() -> dict[str, tuple[str, list[dict]]]:
    """term -> (snapshot name, rows), newest finalized snapshot per term."""
    root = DATA_ROOT / "ucsc" / "pisa_offerings"
    best: dict[str, tuple[str, list[dict]]] = {}
    for snap in sorted(d for d in root.iterdir() if (d / "manifest.json").exists()):
        rows = json.loads((snap / "offerings.json").read_text())
        by_term: dict[str, list[dict]] = {}
        for r in rows:
            by_term.setdefault(r["term_code"], []).append(r)
        for t in json.loads((snap / "terms.json").read_text()):
            best[t["term_code"]] = (snap.name, by_term.get(t["term_code"], []))
    return best


def _line(r: dict) -> str:
    row = {k: r.get(k) for k in KEEP}
    row["instructors"] = [i["name"] for i in r.get("instructors") or []]
    return json.dumps(row, ensure_ascii=False, sort_keys=True)


def export(window_years: int = 5) -> dict:
    best = union_snapshots()
    if not best:
        sys.exit("no pisa_offerings snapshots")
    newest = max(best, key=int)
    oldest_kept = str(int(newest) - window_years * 10)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    state = ledger.load().get("pisa_offerings", {}).get("terms", {})
    changed = []
    for term, (snap, rows) in sorted(best.items()):
        if int(term) < int(oldest_kept):
            continue
        lines = sorted(_line(r) for r in rows)
        text = "\n".join(lines) + ("\n" if lines else "")
        path = OUT_DIR / f"{term}.jsonl"
        if not path.exists() or path.read_text() != text:
            path.write_text(text)
            changed.append(term)
        state[term] = {
            "fetched_at": ledger.snapshot_time(DATA_ROOT / "ucsc" / "pisa_offerings" / snap),
            "rows": len(lines),
            "final": terms.is_final(term),
        }
    for path in OUT_DIR.glob("*.jsonl"):
        if int(path.stem) < int(oldest_kept):
            path.unlink()
            state.pop(path.stem, None)
    state = {t: v for t, v in state.items() if int(t) >= int(oldest_kept)}
    ledger.update("pisa_offerings", {"window_years": window_years, "terms": state})
    print(f"offerings: {len(state)} terms committed ({oldest_kept}..{newest}); "
          f"{len(changed)} changed: {changed}", file=sys.stderr)
    return {"changed": changed, "newest": newest}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--window-years", type=int, default=5)
    export(ap.parse_args().window_years)


if __name__ == "__main__":
    main()
