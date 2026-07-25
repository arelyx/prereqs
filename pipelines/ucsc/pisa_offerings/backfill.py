"""Chunked historical backfill driver.

The upstream server 504s/times out under long runs of big all-subject queries
(observed repeatedly ~10-12 consecutive terms in). This driver fetches the
range in small chunks — each chunk its own finalized snapshot — with a rest
between chunks, and skips terms already covered by finalized snapshots. The
loader unions all pisa snapshots (newest wins per term), so chunked snapshots
compose into full history.

    python -m ucsc.pisa_offerings.backfill --from 2048 --to 2268
"""

from __future__ import annotations

import argparse
import json
import sys
import time

from common.snapshot import DATA_ROOT

from . import run as run_mod
from . import terms

CHUNK = 6
REST_SECONDS = 180


def covered_terms() -> set[str]:
    root = DATA_ROOT / "ucsc" / "pisa_offerings"
    if not root.exists():
        return set()
    out: set[str] = set()
    for d in root.iterdir():
        if d.name.endswith(".staging") or not (d / "terms.json").exists():
            continue
        for t in json.loads((d / "terms.json").read_text()):
            out.add(t["term_code"])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--from", dest="from_code", required=True)
    ap.add_argument("--to", dest="to_code", required=True)
    ap.add_argument("--chunk", type=int, default=CHUNK)
    ap.add_argument("--rest", type=int, default=REST_SECONDS)
    ap.add_argument("--min-interval", type=float, default=4.0)
    args = ap.parse_args()

    wanted = terms.enumerate_codes(args.from_code, args.to_code)
    done = covered_terms()
    todo = [t for t in wanted if t not in done]
    print(f"{len(wanted)} terms in range; {len(done & set(wanted))} covered; {len(todo)} to fetch",
          file=sys.stderr, flush=True)

    failures = 0
    for i in range(0, len(todo), args.chunk):
        chunk = todo[i:i + args.chunk]
        print(f"chunk {i // args.chunk + 1}: {chunk}", file=sys.stderr, flush=True)
        code = run_mod.main(["--terms", ",".join(chunk), "--min-interval", str(args.min_interval)])
        if code != 0:
            failures += 1
            print(f"chunk failed (exit {code}); resting then continuing",
                  file=sys.stderr, flush=True)
            if failures >= 5:
                print("too many failed chunks; giving up", file=sys.stderr)
                sys.exit(2)
        if i + args.chunk < len(todo):
            time.sleep(args.rest)

    remaining = [t for t in wanted if t not in covered_terms()]
    print(f"backfill finished; uncovered terms: {remaining or 'none'}", file=sys.stderr)
    sys.exit(0 if not remaining else 1)


if __name__ == "__main__":
    main()
