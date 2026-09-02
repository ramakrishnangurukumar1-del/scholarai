"""Minimal email sender. Uses SMTP when configured; otherwise no-op.

The password-reset endpoint returns the link in its response when SMTP is off,
so the flow works without an email server (dev / demo).
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger("scholarai.email")


def is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER)


def send(to: str, subject: str, body: str) -> bool:
    if not is_configured():
        return False
    try:
        msg = EmailMessage()
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as s:
            s.starttls()
            s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001
        log.warning("Email send failed (%s)", type(exc).__name__)
        return False


def send_password_reset(to: str, reset_url: str) -> bool:
    return send(
        to,
        "Reset your ScholarAI password",
        f"We received a request to reset your ScholarAI password.\n\n"
        f"Open this link to set a new one (valid for 30 minutes):\n{reset_url}\n\n"
        f"If you didn't request this, you can ignore this email.",
    )
