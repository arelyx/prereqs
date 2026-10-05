"""The refresh ledger: what the committed dataset was built from, and when.

``data-committed/ucsc/ledger.json`` is the single place a refreshing agent
reads to learn "what do we have, as of when". Every hot-path exporter updates
its own block; ``python -m ucsc.refresh status`` compares the ledger against
the cadence table in ``ucsc/refresh.py`` (and, with ``--probe``, against the
live sites) to produce the work order.

Blocks (all timestamps UTC ISO-8601):

  catalog_courses: {edition, fetched_at, snapshot, courses, subjects, content_sha}
  editions: {<edition>: {fetched_at, snapshot, live, programs: {<slug>: sha}}}
  pisa_offerings: {terms: {<code>: {fetched_at, rows, final}}}
  soe_schedule: {academic_year, fetched_at, snapshot, content_sha, courses}
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from common.snapshot import DATA_ROOT

COMMITTED_ROOT = DATA_ROOT.parent / "data-committed" / "ucsc"
LEDGER_PATH = COMMITTED_ROOT / "ledger.json"


def dump(path: Path, obj) -> None:
    """Canonical committed-JSON dump (stable diffs, never mangles Unicode)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=True) + "\n")


def load() -> dict:
    if not LEDGER_PATH.exists():
        return {}
    return json.loads(LEDGER_PATH.read_text())


def update(block: str, value: dict, *, key: str | None = None) -> None:
    """Replace ``ledger[block]`` (or ``ledger[block][key]``) and save."""
    data = load()
    if key is None:
        data[block] = value
    else:
        data.setdefault(block, {})[key] = value
    dump(LEDGER_PATH, data)


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def snapshot_time(snapshot_dir: Path) -> str:
    """A snapshot dir name (20261005T230104Z) as an ISO timestamp."""
    return datetime.strptime(snapshot_dir.name, "%Y%m%dT%H%M%SZ").replace(
        tzinfo=timezone.utc
    ).isoformat()
