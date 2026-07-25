"""Immutable snapshot store for pipeline output.

Layout: data/<university>/<source>/<UTC timestamp>/
Each snapshot dir contains the pipeline's output files plus a manifest.json
recording provenance: what produced it, from what, with which guards.

Snapshots are write-once: a run writes into a temp dir and atomically renames
it into place only after every guard passed, so a crashed or aborted run can
never leave a half-written snapshot that looks valid. Rollback = pointing the
DB loader at an older snapshot dir.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# repo_root/data — pipelines/common/snapshot.py -> pipelines/common -> pipelines -> repo root
DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"


def _git_sha() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, cwd=Path(__file__).parent, check=True,
        ).stdout.strip()
    except Exception:
        return "unknown"


class SnapshotWriter:
    """Stage files for a snapshot; finalize() makes it visible atomically."""

    def __init__(self, university: str, source: str):
        self.university = university
        self.source = source
        self.created_at = datetime.now(timezone.utc)
        stamp = self.created_at.strftime("%Y%m%dT%H%M%SZ")
        self.final_dir = DATA_ROOT / university / source / stamp
        self.staging_dir = self.final_dir.with_name(stamp + ".staging")
        self.staging_dir.mkdir(parents=True, exist_ok=False)
        self._finalized = False

    def path(self, name: str) -> Path:
        return self.staging_dir / name

    def write_json(self, name: str, obj) -> Path:
        p = self.path(name)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=True))
        return p

    def finalize(self, manifest: dict) -> Path:
        """Write manifest and atomically publish the snapshot."""
        manifest = {
            "university": self.university,
            "source": self.source,
            "created_at": self.created_at.isoformat(),
            "git_sha": _git_sha(),
            **manifest,
        }
        (self.staging_dir / "manifest.json").write_text(json.dumps(manifest, indent=1))
        self.staging_dir.rename(self.final_dir)
        self._finalized = True
        return self.final_dir

    def abort(self) -> None:
        """Discard the staging dir (used on pipeline failure)."""
        if not self._finalized and self.staging_dir.exists():
            shutil.rmtree(self.staging_dir)


def latest(university: str, source: str) -> Path | None:
    """Newest finalized snapshot dir for a source, or None."""
    root = DATA_ROOT / university / source
    if not root.exists():
        return None
    dirs = sorted(
        d for d in root.iterdir()
        if d.is_dir() and not d.name.endswith(".staging") and (d / "manifest.json").exists()
    )
    return dirs[-1] if dirs else None


def load_manifest(snapshot_dir: Path) -> dict:
    return json.loads((snapshot_dir / "manifest.json").read_text())
