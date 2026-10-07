"""Export the newest SOE planned-schedule snapshot into the committed dataset.

  data-committed/ucsc/soe/<academic-year>.jsonl   one planned section per line

The Baskin School of Engineering publishes next year's planned offerings
(with instructors) roughly a year ahead and revises them in place, so the
newest snapshot replaces that academic year's file wholesale. Past years'
files are kept as the record of what was planned.

  python -m ucsc.soe_schedule.export
"""

from __future__ import annotations

import hashlib
import json
import sys

from common.snapshot import latest, load_manifest

from .. import ledger


def export() -> None:
    snap = latest("ucsc", "soe_schedule")
    if snap is None:
        sys.exit("no soe_schedule snapshot")
    manifest = load_manifest(snap)
    year = manifest["academic_year"]
    rows = json.loads((snap / "planned.json").read_text())
    lines = sorted(json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows)
    text = "\n".join(lines) + "\n"
    out = ledger.COMMITTED_ROOT / "soe" / f"{year}.jsonl"
    out.parent.mkdir(parents=True, exist_ok=True)
    changed = not out.exists() or out.read_text() != text
    out.write_text(text)
    ledger.update(
        "soe_schedule",
        {
            "academic_year": year,
            "fetched_at": ledger.snapshot_time(snap),
            "rows": len(lines),
            "content_sha256": hashlib.sha256(text.encode()).hexdigest(),
        },
    )
    print(f"soe {year}: {len(lines)} planned sections ({'changed' if changed else 'unchanged'})",
          file=sys.stderr)


if __name__ == "__main__":
    export()
