"""Reading pipeline snapshots from the data/ store (backend side).

Mirrors pipelines/common/snapshot.py conventions without importing it (the
backend must not depend on the pipelines package). DATA_ROOT is configurable
so the dockerized backend can mount the store read-only.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

DATA_ROOT = Path(
    os.environ.get("DATA_ROOT", Path(__file__).resolve().parents[3] / "data")
)
# Git-committed canonical catalog data (courses + program requirements).
# See pipelines/ucsc/export_committed.py for the contract.
COMMITTED_ROOT = Path(
    os.environ.get(
        "COMMITTED_ROOT", Path(__file__).resolve().parents[3] / "data-committed"
    )
)


def latest(university: str, source: str) -> Path | None:
    root = DATA_ROOT / university / source
    if not root.exists():
        return None
    dirs = sorted(
        d
        for d in root.iterdir()
        if d.is_dir() and not d.name.endswith(".staging") and (d / "manifest.json").exists()
    )
    return dirs[-1] if dirs else None


def all_finalized(university: str, source: str) -> list[Path]:
    """Every finalized snapshot dir for a source, oldest first."""
    root = DATA_ROOT / university / source
    if not root.exists():
        return []
    return sorted(
        d
        for d in root.iterdir()
        if d.is_dir() and not d.name.endswith(".staging") and (d / "manifest.json").exists()
    )


def manifest(snapshot_dir: Path) -> dict:
    return json.loads((snapshot_dir / "manifest.json").read_text())


def read_json(snapshot_dir: Path, name: str):
    return json.loads((snapshot_dir / name).read_text())
