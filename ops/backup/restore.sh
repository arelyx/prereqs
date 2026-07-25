#!/usr/bin/env bash
# Restore from a backup made by backup.sh.
#
#   restore.sh backups/<ts> userdata   — restore ONLY user tables (accounts,
#                                        tokens, plans). Served catalog data
#                                        is untouched.
#   restore.sh backups/<ts> serving    — reload served data from the snapshot
#                                        dirs recorded in the backup (loader
#                                        re-run; user data untouched).
#   restore.sh backups/<ts> full       — restore the entire database dump.
#
# The two-sided design means a bad pipeline load never requires touching user
# data, and a user-data incident never requires re-scraping.
set -euo pipefail

cd "$(dirname "$0")/../.."
BACKUP_DIR=${1:?usage: restore.sh backups/<ts> userdata|serving|full}
MODE=${2:?usage: restore.sh backups/<ts> userdata|serving|full}
DB_CONTAINER=${DB_CONTAINER:-prereqs-db-1}

case "$MODE" in
  userdata)
    docker exec -i "$DB_CONTAINER" psql -U prereqs prereqs < "$BACKUP_DIR/userdata.sql"
    echo "user tables restored from $BACKUP_DIR"
    ;;
  serving)
    python3 - "$BACKUP_DIR" <<'EOF'
import json, subprocess, sys, pathlib
backup = pathlib.Path(sys.argv[1])
refs = json.loads((backup / "snapshots.json").read_text())
by_source = {r["source"]: r["snapshot_path"] for r in refs}
args = []
mapping = {
    "catalog_courses_structured": "--courses",
    "pisa_offerings": "--offerings",
    "soe_schedule": "--soe",
    "major_requirements_structured": "--programs",
}
for source, flag in mapping.items():
    path = by_source.get(source)
    if path and pathlib.Path(path).exists():
        args += [flag, path]
    elif path:
        print(f"WARNING: recorded snapshot missing on disk: {path}", file=sys.stderr)
import os
subprocess.run(
    [".venv/bin/python", "-m", "app.loaders.ucsc", *args],
    cwd="backend",
    env=os.environ | {
        "DATABASE_URL": os.environ.get(
            "DATABASE_URL", "postgresql+psycopg://prereqs:prereqs@localhost:5433/prereqs"
        )
    },
    check=True,
)
EOF
    echo "serving data reloaded from snapshots recorded in $BACKUP_DIR"
    ;;
  full)
    docker exec -i "$DB_CONTAINER" psql -U prereqs prereqs < "$BACKUP_DIR/db_full.sql"
    echo "full database restored from $BACKUP_DIR"
    ;;
  *)
    echo "unknown mode: $MODE" >&2; exit 1
    ;;
esac
