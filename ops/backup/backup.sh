#!/usr/bin/env bash
# Snapshot the full application state into backups/<UTC timestamp>/.
#
# Three data classes (docs/ARCHITECTURE.md):
#   userdata.sql    — users, auth_tokens, plans (pg_dump, data+schema)
#   db_full.sql     — entire database (belt and suspenders; restoring user
#                     data alone never needs this)
#   snapshots.json  — the exact pipeline snapshot dir each source was last
#                     loaded from (from pipeline_runs), so served data can be
#                     rebuilt bit-identically with the loader
#   data.tar.gz     — optional (--with-data): tarball of the referenced
#                     snapshot dirs themselves for off-machine copies
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

docker exec "$DB_CONTAINER" psql -U prereqs -At -c \
  "SELECT COALESCE(json_agg(row_to_json(t)), '[]') FROM (
     SELECT DISTINCT ON (university_id, source)
            university_id, source, snapshot_path, loaded_at
     FROM pipeline_runs WHERE loaded_at IS NOT NULL
     ORDER BY university_id, source, loaded_at DESC
   ) t" > "$DEST/snapshots.json"

if [[ "${1:-}" == "--with-data" ]]; then
  # Tar only the snapshot dirs that are actually loaded (referenced above).
  python3 - "$DEST" <<'EOF'
import json, subprocess, sys, pathlib
dest = pathlib.Path(sys.argv[1])
refs = json.loads((dest / "snapshots.json").read_text())
paths = [r["snapshot_path"] for r in refs if r.get("snapshot_path")]
rel = [str(pathlib.Path(p).relative_to(pathlib.Path.cwd())) for p in paths
       if pathlib.Path(p).exists()]
if rel:
    subprocess.run(["tar", "czf", str(dest / "data.tar.gz"), *rel], check=True)
    print(f"  data.tar.gz: {len(rel)} snapshot dirs")
EOF
fi

du -sh "$DEST"/* | sed 's/^/  /'
echo "done: $DEST"
