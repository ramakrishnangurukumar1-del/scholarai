"""Reset to a clean demo state.

    python -m scripts.reset            # wipe applications/docs/notifications, keep users+scholarships
    python -m scripts.reset --all      # also wipe users, then re-seed everything

Use before a presentation so the demo always starts clean.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from scripts.seed import run as seed

_APPLICATION_TABLES = [
    "document_verifications",
    "documents",
    "ai_analysis",
    "eligibility_results",
    "application_history",
    "applications",
    "notifications",
]


def run(full: bool = False) -> None:
    with engine.begin() as conn:
        for t in _APPLICATION_TABLES:
            conn.execute(text(f"DELETE FROM {t}"))
        if full:
            conn.execute(text("DELETE FROM eligibility_criteria"))
            conn.execute(text("DELETE FROM scholarships"))
            conn.execute(text("DELETE FROM scholarship_categories"))
            conn.execute(text("DELETE FROM students"))
            conn.execute(text("DELETE FROM authorities"))
            conn.execute(text("DELETE FROM audit_logs"))
            conn.execute(text("DELETE FROM users"))

    storage = Path(settings.STORAGE_DIR)
    if storage.exists():
        shutil.rmtree(storage)
    storage.mkdir(exist_ok=True)

    print("Cleared application data" + (" + users/scholarships" if full else ""))
    seed()  # idempotent — re-creates anything missing


if __name__ == "__main__":
    run(full="--all" in sys.argv)
