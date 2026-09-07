"""Kafka consumer — writes the event stream into the analytics hypertable.

    python -m app.worker

Runs as its own container/process. If Kafka isn't configured it exits cleanly.
"""

from __future__ import annotations

import json
import logging
import signal
import sys

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.analytics import AnalyticsEvent

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s worker: %(message)s")
log = logging.getLogger("scholarai.worker")

_running = True


def _stop(*_a):
    global _running
    _running = False


def run() -> None:
    if not settings.KAFKA_BOOTSTRAP:
        log.info("KAFKA_BOOTSTRAP not set — nothing to consume. Exiting.")
        return

    from kafka import KafkaConsumer

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    consumer = KafkaConsumer(
        settings.KAFKA_TOPIC,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP.split(","),
        group_id="scholarai-analytics",
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode()),
        consumer_timeout_ms=1000,
    )
    log.info("Consuming %s from %s", settings.KAFKA_TOPIC, settings.KAFKA_BOOTSTRAP)

    while _running:
        for msg in consumer:
            if not _running:
                break
            _persist(msg.value)
    consumer.close()
    log.info("Worker stopped.")


def _persist(evt: dict) -> None:
    db = SessionLocal()
    try:
        db.add(
            AnalyticsEvent(
                event_type=evt.get("event_type", "unknown"),
                application_id=evt.get("application_id") or "",
                scholarship=evt.get("scholarship"),
                category=evt.get("category"),
                actor_role=evt.get("actor_role"),
                meta={k: v for k, v in evt.items()
                      if k not in ("event_type", "application_id", "time", "scholarship",
                                   "category", "actor_role")},
            )
        )
        db.commit()
        log.info("stored event: %s", evt.get("event_type"))
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        log.warning("failed to store event (%s)", type(exc).__name__)
    finally:
        db.close()


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        sys.exit(0)
