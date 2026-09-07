"""Create all tables directly from the models (no Alembic).

Handy for a first run. For real schema changes use Alembic migrations instead:
    alembic revision --autogenerate -m "message"
    alembic upgrade head
"""

from sqlalchemy import text

from app.db.session import engine
from app.models import Base


def run() -> None:
    Base.metadata.create_all(bind=engine)
    print(f"Created {len(Base.metadata.tables)} tables.")
    _enable_timescaledb()


def _enable_timescaledb() -> None:
    """If this is PostgreSQL with TimescaleDB available, turn analytics_events
    into a hypertable partitioned on `time`. No-op on MySQL/SQLite."""
    if not engine.url.get_backend_name().startswith("postgresql"):
        return
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb"))
            conn.execute(
                text(
                    "SELECT create_hypertable('analytics_events', 'time', "
                    "if_not_exists => TRUE, migrate_data => TRUE)"
                )
            )
        print("TimescaleDB: analytics_events is now a hypertable.")
    except Exception as exc:  # noqa: BLE001
        print(f"TimescaleDB not enabled ({type(exc).__name__}) — analytics_events stays a plain table.")


if __name__ == "__main__":
    run()
