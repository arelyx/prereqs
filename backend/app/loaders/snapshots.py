"""Where the committed dataset lives (backend side).

COMMITTED_ROOT is configurable so the dockerized backend can mount
``data-committed/`` read-only. The backend never reads pipeline snapshots
(``data/``): those are a pipeline-side cache.
"""

from __future__ import annotations

import os
from pathlib import Path

COMMITTED_ROOT = Path(
    os.environ.get(
        "COMMITTED_ROOT", Path(__file__).resolve().parents[3] / "data-committed"
    )
)
