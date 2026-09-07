"""Vercel serverless entrypoint for the ScholarAI API.

Vercel runs the `app` ASGI callable directly. The FastAPI application lives in
`backend/app`, so put that directory on the import path first.
"""

import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app  # noqa: E402

log = logging.getLogger("scholarai.bootstrap")


def _provision() -> None:
    """First cold start on a fresh database: create the schema and seed the
    demo data. Idempotent — safe to run on every cold start. Enabled by the
    AUTO_INIT_DB=1 environment variable (set on the deployment)."""
    if os.environ.get("AUTO_INIT_DB") != "1":
        return
    try:
        from sqlalchemy import inspect

        from app.db.session import engine

        if not inspect(engine).has_table("scholarships"):
            from app.models import Base

            Base.metadata.create_all(bind=engine)
            log.info("schema created")

        from scripts.seed import run as seed

        seed()
    except Exception as exc:  # noqa: BLE001
        log.warning("auto-init skipped: %s", exc)


_provision()

__all__ = ["app"]
