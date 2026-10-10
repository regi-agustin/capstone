"""
Apply the guarded SQL migrations in api/migrations/ using PyMySQL.

    python training/migrate.py                 # apply every migration, in order
    python training/migrate.py 003_ai_assistant.sql

Useful on machines without a mysql CLI. Statements are executed in file
order; every migration in api/migrations/ is idempotent, so re-running is safe.
"""

from __future__ import annotations

import glob
import os
import re
import sys

TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))
MIGRATIONS_DIR = os.path.join(os.path.dirname(TRAINING_DIR), "api", "migrations")

sys.path.insert(0, TRAINING_DIR)
from dataset import _read_db_config  # noqa: E402


def split_statements(sql: str) -> list[str]:
    lines = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        lines.append(line)
    return [s.strip() for s in "\n".join(lines).split(";") if s.strip()]


def main() -> None:
    files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    if len(sys.argv) > 1:
        wanted = sys.argv[1:]
        files = [f for f in files if os.path.basename(f) in wanted]
        if not files:
            raise SystemExit(f"No matching migration found for: {wanted}")

    try:
        import pymysql
    except ImportError:
        raise SystemExit("Missing PyMySQL. Run: pip install -r training/requirements.txt")

    cfg = _read_db_config()
    conn = pymysql.connect(
        host=cfg.get("DB_HOST", "localhost"),
        database=cfg.get("DB_NAME", "fleetops_db"),
        user=cfg.get("DB_USER", "root"),
        password=cfg.get("DB_PASS", ""),
        autocommit=True,
    )

    applied = 0
    try:
        with conn.cursor() as cur:
            for path in files:
                name = os.path.basename(path)
                with open(path, "r", encoding="utf-8") as fh:
                    statements = split_statements(fh.read())
                try:
                    for stmt in statements:
                        cur.execute(stmt)
                    applied += 1
                    print(f"[migrate] OK  {name} ({len(statements)} statements)")
                except Exception as exc:  # noqa: BLE001 - report and stop on first failure
                    raise SystemExit(f"[migrate] FAILED {name}: {exc}") from exc
    finally:
        conn.close()

    print(f"[migrate] {applied} migration file(s) applied.")


if __name__ == "__main__":
    main()
