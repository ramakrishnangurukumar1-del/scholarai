"""Tiny in-memory fixed-window rate limiter.

Good enough for a single-process deployment. For multi-instance, swap the dict
for Redis. Used to throttle repeated failed logins from one IP.
"""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.config import settings

_hits: dict[str, list[float]] = defaultdict(list)


def login_rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = settings.LOGIN_WINDOW_SECONDS
    recent = [t for t in _hits[ip] if now - t < window]
    _hits[ip] = recent
    if len(recent) >= settings.LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again in a few minutes.",
        )
    _hits[ip].append(now)


def reset() -> None:
    """For tests."""
    _hits.clear()
