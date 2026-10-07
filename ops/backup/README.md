# Backup & rollback

| Class | Lives in | Backup | Restore |
|---|---|---|---|
| User data (accounts, tokens, plans) | Postgres only | `userdata.sql` | `restore.sh <dir> userdata` |
| Served data (courses, offerings, SOE, program editions, harnesses) | git: `data-committed/`, `harnesses/` | git history + `served_rev.txt` | `restore.sh <dir> serving` or `git checkout <rev> -- data-committed` + reload |
| Pipeline cache (raw HTML, snapshots) | `data/` (gitignored) | none needed — regenerable | re-run the fetch |
| Whole DB (fallback) | Postgres | `db_full.sql` | `restore.sh <dir> full` |

```bash
ops/backup/backup.sh                       # before every production load
ops/backup/restore.sh backups/<ts> userdata
ops/backup/restore.sh backups/<ts> serving
```

**A load served bad data** → `git checkout <good-rev> -- data-committed` and
re-run `python -m app.loaders.ucsc`. The loader never touches user tables.

**A pipeline aborted** → nothing to restore: aborted runs discard their
`.staging` dir and never touch committed data or the DB.

`backups/` is gitignored — copy it off-machine. Run `backup.sh` daily via
cron once the app has real users.
