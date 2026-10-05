#!/usr/bin/env bash
# Snapshot application state into backups/<UTC timestamp>/.
#
# Served data (courses, offerings, SOE plan, program editions, harnesses) is
# a projection of the committed dataset, so git is its backup. What this
# script captures:
#   userdata.sql   — users, auth_tokens, plans (pg_dump --clean): the only
#                    state that exists nowhere else
#   db_full.sql    — the entire database (fallback; never needed to restore
#                    user data alone)
#   served_rev.txt — the git revision of data-committed/ being served, so
#                    `restore.sh <dir> serving` can rebuild it exactly
set -euo pipefail

cd "$(dirname "$0")/../.."
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DEST="backups/$STAMP"
DB_CONTAINER=${DB_CONTAINER:-prereqs-db-1}
mkdir -p "$DEST"

echo "backing up to $DEST"
docker exec "$DB_CONTAINER" pg_dump -U prereqs --clean --if-exists \
  -t users -t auth_tokens -t plans prereqs > "$DEST/userdata.sql"
docker exec "$DB_CONTAINER" pg_dump -U prereqs --clean --if-exists prereqs \
  > "$DEST/db_full.sql"
{
  git rev-parse HEAD
  git status --porcelain -- data-committed harnesses 2>/dev/null | head -n 1 | sed 's/^/DIRTY: /'
} > "$DEST/served_rev.txt"

du -sh "$DEST"/* | sed 's/^/  /'
echo "done: $DEST"
