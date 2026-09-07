from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnalyticsEvent(Base):
    """Append-only event log for time-series analytics.

    On PostgreSQL with the TimescaleDB extension this table is turned into a
    hypertable partitioned on `time` (see scripts/init_db.py). On other engines
    it's a plain table — the analytics queries work either way.
    """

    __tablename__ = "analytics_events"

    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, server_default=func.now()
    )
    event_type: Mapped[str] = mapped_column(String(60), primary_key=True)
    application_id: Mapped[str | None] = mapped_column(String(36), primary_key=True, default="")
    scholarship: Mapped[str | None] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(80))
    actor_role: Mapped[str | None] = mapped_column(String(20))
    meta: Mapped[dict | None] = mapped_column(JSON)
