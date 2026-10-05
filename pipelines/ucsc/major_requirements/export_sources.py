"""Export program pages as committed per-edition source texts (hot path).

Reads the newest (or a named) ``major_requirements`` fetch snapshot and
writes, for the edition that snapshot was served as:

  data-committed/ucsc/editions/<edition>/programs.json   index: meta + sha
  data-committed/ucsc/editions/<edition>/sources/<slug>.md

then records the per-slug hashes in the ledger. It prints the change set
(added / removed / structure-changed / text-only slugs) — that list is the warm path's work order:
every harness authored against an old hash of a changed slug must be
re-authored. Nothing here interprets requirements.

  python -m ucsc.major_requirements.export_sources [--fetch-snapshot DIR]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common.guards import PipelineAbort, expect
from common.snapshot import latest, load_manifest

from .. import editions, ledger
from . import source_text

META_KEYS = ("slug", "name", "degree", "kind", "division", "department", "url")


def export(fetch_snapshot: Path | None = None, edition: str | None = None) -> dict:
    snap = fetch_snapshot or editions.latest_program_fetch(edition)
    expect(snap is not None, "no major_requirements fetch snapshot")
    manifest = load_manifest(snap)
    programs = json.loads((snap / "programs.json").read_text())

    rendered: dict[str, str] = {}
    edition_seen: set[str] = set()
    for p in programs:
        html = (snap / "raw" / f"{p['slug']}.html").read_text()
        ed = editions.detect(html)
        expect(ed is not None, "edition label missing on program page", slug=p["slug"])
        edition_seen.add(ed)
        rendered[p["slug"]] = source_text.render(html, p)
    expect(len(edition_seen) == 1, "program pages disagree on edition", seen=sorted(edition_seen))
    edition = edition_seen.pop()
    if manifest.get("edition"):
        expect(manifest["edition"] == edition, "manifest/page edition mismatch")

    root = ledger.COMMITTED_ROOT / "editions" / edition
    prior = ledger.load().get("editions", {}).get(edition, {}).get("programs", {})
    # Ledger entries are {"text": sha, "skeleton": sha}.
    index = []
    hashes: dict[str, str] = {}
    for p in sorted(programs, key=lambda x: x["slug"]):
        text = rendered[p["slug"]]
        sha = source_text.sha256(text)
        skel = source_text.sha256(source_text.skeleton(text))
        hashes[p["slug"]] = {"text": sha, "skeleton": skel}
        (root / "sources").mkdir(parents=True, exist_ok=True)
        (root / "sources" / f"{p['slug']}.md").write_text(text)
        index.append(
            {
                **{k: p[k] for k in META_KEYS},
                "edition": edition,
                "archive_url": editions.archive_url(p["url"], edition),
                "source_sha256": sha,
                "skeleton_sha256": skel,
            }
        )
    for stale in (root / "sources").glob("*.md"):
        if stale.stem not in hashes:
            stale.unlink()
    ledger.dump(root / "programs.json", index)

    changes = {
        "added": sorted(set(hashes) - set(prior)),
        "removed": sorted(set(prior) - set(hashes)),
        # structure moved: course lists / rule groups differ
        "changed_structure": sorted(
            s for s in hashes if s in prior and prior[s].get("skeleton") != hashes[s]["skeleton"]
        ),
        # wording only: same skeleton, different text
        "changed_text": sorted(
            s for s in hashes if s in prior
            and prior[s].get("skeleton") == hashes[s]["skeleton"]
            and prior[s].get("text") != hashes[s]["text"]
        ),
    }
    ledger.update(
        "editions",
        {
            "fetched_at": ledger.snapshot_time(snap),
            "snapshot": snap.name,
            "live": manifest.get("live", True),
            "programs": hashes,
        },
        key=edition,
    )
    print(
        f"edition {edition}: {len(hashes)} programs; "
        f"{len(changes['added'])} added, {len(changes['removed'])} removed, "
        f"{len(changes['changed_structure'])} structure-changed, "
        f"{len(changes['changed_text'])} text-only",
        file=sys.stderr,
    )
    for kind, slugs in changes.items():
        for s in slugs:
            print(f"  {kind.upper()}: {s}", file=sys.stderr)
    return {"edition": edition, **changes}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fetch-snapshot", type=Path)
    ap.add_argument("--edition", help="catalog edition, e.g. 2025-26 (default: newest fetched)")
    ap.add_argument("--json", action="store_true", help="print the change set as JSON")
    args = ap.parse_args()
    try:
        result = export(args.fetch_snapshot, args.edition)
    except PipelineAbort as exc:
        print(f"PIPELINE ABORTED: {exc}", file=sys.stderr)
        sys.exit(2)
    if args.json:
        print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
