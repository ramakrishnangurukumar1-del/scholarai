#!/bin/sh
set -e

case "$1" in
  api)
    echo "Waiting for the database…"
    python -m scripts.wait_for_db
    echo "Running migrations…"
    alembic upgrade head || python -m scripts.init_db
    echo "Seeding (idempotent)…"
    python -m scripts.seed || true
    echo "Starting API…"
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
    ;;
  worker)
    echo "Waiting for the database…"
    python -m scripts.wait_for_db
    echo "Starting event worker…"
    exec python -m app.worker
    ;;
  *)
    exec "$@"
    ;;
esac
