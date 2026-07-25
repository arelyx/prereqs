# Backup & rollback runbook

Three independently-restorable data classes (docs/ARCHITECTURE.md):

| Class | Where it lives | Backup form | Restore |
|---|---|---|---|
| User data (accounts, tokens, plans) | Postgres | `userdata.sql` (pg_dump, --clean) | `restore.sh <dir> userdata` |
| Raw + structured pipeline data | immutable `data/<univ>/<source>/<ts>/` dirs | referenced by `snapshots.json`; optionally tarred with `--with-data` | `restore.sh <dir> serving` (loader re-run) |
| Whole DB (fallback) | Postgres | `db_full.sql` | `restore.sh <dir> full` |

```bash
ops/backup/backup.sh                # userdata + full dump + snapshot refs
ops/backup/backup.sh --with-data    # …plus tarball of the loaded snapshot dirs
ops/backup/restore.sh backups/<ts> userdata
```

## Rollback scenarios

**A pipeline load produced bad serving data** → no backup needed at all:
re-run the loader against the previous good snapshot dir, e.g.

```bash
cd backend && DATABASE_URL=... .venv/bin/python -m app.loaders.ucsc \
  --courses ../data/ucsc/catalog_courses_structured/<older-ts>
```

Loads are transactional per source; user data is never touched by the loader.
`pipeline_runs.loaded_at` records exactly which snapshot dir is being served.

**A scraper aborted mid-run** → nothing to do. Aborted runs discard their
`.staging` dir and never touch the DB or previous snapshots (fail-fast
contract). Read the abort message, fix the pipeline, re-run.

**User data incident** → `restore.sh backups/<ts> userdata`. Serving data is
untouched.

**Machine loss** → restore the repo, `backups/<ts>` (made with `--with-data`),
run `restore.sh <dir> full`, untar `data.tar.gz`.

## Cadence

Run `backup.sh` before every loader run against production data and daily via
cron when the app has real users. `backups/` is gitignored — copy it
off-machine.
