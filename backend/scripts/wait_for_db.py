"""Block until the database accepts connections (used by the Docker entrypoint)."""

import sys
import time

from sqlalchemy import text

from app.db.session import engine

DEADLINE = 60  # seconds


def run() -> None:
    start = time.time()
    while True:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Database is ready.")
            return
        except Exception as exc:  # noqa: BLE001
            if time.time() - start > DEADLINE:
                print(f"Database not ready after {DEADLINE}s: {exc}", file=sys.stderr)
                sys.exit(1)
            time.sleep(2)


if __name__ == "__main__":
    run()
