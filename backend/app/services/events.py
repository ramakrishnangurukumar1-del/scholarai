"""Event stream (Apache Kafka).

Every meaningful action publishes an event to the `scholarai.events` topic.
A separate worker (`app.worker`) consumes them into a TimescaleDB hypertable
for time-series analytics.

Degrades gracefully: with no KAFKA_BOOTSTRAP configured (or the broker down),
`publish()` just logs — the core flow is never blocked by the event layer.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

from app.core.config import settings

log = logging.getLogger("scholarai.events")


def is_configured() -> bool:
    return bool(settings.KAFKA_BOOTSTRAP)


@lru_cache
def _producer():
    from kafka import KafkaProducer

    return KafkaProducer(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP.split(","),
        value_serializer=lambda v: json.dumps(v, default=str).encode(),
        key_serializer=lambda k: k.encode() if k else None,
        acks=1,
        retries=2,
        request_timeout_ms=5000,
    )


def publish(event_type: str, *, application_id: str | None = None, **fields: Any) -> None:
    payload = {
        "event_type": event_type,
        "time": datetime.now(UTC).isoformat(),
        "application_id": application_id,
        **fields,
    }
    if not is_configured():
        log.info("event %s %s", event_type, {k: v for k, v in fields.items() if k != "time"})
        return
    try:
        _producer().send(settings.KAFKA_TOPIC, key=application_id, value=payload)
    except Exception as exc:  # noqa: BLE001
        log.warning("Kafka publish failed for %s (%s)", event_type, type(exc).__name__)
