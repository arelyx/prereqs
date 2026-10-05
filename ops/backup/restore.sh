#!/usr/bin/env bash
# Restore from a backup made by backup.sh.
#
#   restore.sh backups/<ts> userdata — restore ONLY user tables (accounts,
#                                      tokens, plans); served data untouched
#   restore.sh backups/<ts> serving  — check out the recorded revision of
#                                      data-committed/ + harnesses/ and reload
#                                      (user data untouched)
#   restore.sh backups/<ts> full     — restore the entire database dump
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
    REV=$(head -n 1 "$BACKUP_DIR/served_rev.txt")
    git checkout "$REV" -- data-committed $(git ls-tree --name-only "$REV" harnesses >/dev/null 2>&1 && echo harnesses)
    (cd backend && DATABASE_URL=${DATABASE_URL:-postgresql+psycopg://prereqs:prereqs@localhost:5433/prereqs} \
      .venv/bin/python -m app.loaders.ucsc)
    echo "served data reloaded from data-committed@$REV (commit or revert the checkout)"
    ;;
  full)
    docker exec -i "$DB_CONTAINER" psql -U prereqs prereqs < "$BACKUP_DIR/db_full.sql"
    echo "full database restored from $BACKUP_DIR"
    ;;
  *)
    echo "unknown mode: $MODE" >&2; exit 1
    ;;
esac
