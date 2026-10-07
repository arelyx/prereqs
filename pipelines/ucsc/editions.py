"""Catalog editions (catalog years) — the temporal key for program data.

UCSC publishes one General Catalog edition per academic year (rolls ~July for
the fall). A student is bound to the requirements of the edition they entered
under, so program data is versioned by edition and old editions are kept.

- The live edition is served at ``/en/current/...``; it is identified by the
  "YYYY-YYYY UCSC General Catalog" label every page carries.
- Past editions are archived at ``/en/YYYY-YYYY/...`` with identical markup.
- Edition ids in this repo are the short form ``"2026-27"``.
"""

from __future__ import annotations

import re

BASE_URL = "https://catalog.ucsc.edu"

_LABEL_RE = re.compile(r"\b(20\d\d)-(20\d\d) UCSC General Catalog\b")
_SHORT_RE = re.compile(r"^(20\d\d)-(\d\d)$")


def short_id(start_year: int) -> str:
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def long_id(edition: str) -> str:
    """'2026-27' -> '2026-2027' (the archive URL segment)."""
    m = _SHORT_RE.match(edition)
    if not m:
        raise ValueError(f"bad edition id {edition!r} (want e.g. '2026-27')")
    start = int(m.group(1))
    return f"{start}-{start + 1}"


def url_segment(edition: str | None) -> str:
    """URL segment for an edition: None/'current' -> 'current'."""
    if edition in (None, "current"):
        return "current"
    return long_id(edition)


def detect(html: str) -> str | None:
    """Edition id from a catalog page's 'YYYY-YYYY UCSC General Catalog' label."""
    m = _LABEL_RE.search(html)
    if not m or int(m.group(2)) != int(m.group(1)) + 1:
        return None
    return short_id(int(m.group(1)))


def archive_url(url: str, edition: str) -> str:
    """Rewrite a /en/current/ URL to the edition's permanent archive URL."""
    return url.replace("/en/current/", f"/en/{long_id(edition)}/", 1)


def fetched_editions() -> list[str]:
    """Editions with at least one program-page fetch snapshot, oldest first."""
    from common.snapshot import DATA_ROOT

    root = DATA_ROOT / "ucsc" / "major_requirements"
    if not root.exists():
        return []
    return sorted(d.name for d in root.iterdir() if d.is_dir() and _SHORT_RE.match(d.name))


def latest_program_fetch(edition: str | None = None):
    """Newest program-page fetch snapshot for an edition (default: newest edition)."""
    from common.snapshot import latest

    if edition is None:
        eds = fetched_editions()
        if not eds:
            return None
        edition = eds[-1]
    return latest("ucsc", f"major_requirements/{edition}")
