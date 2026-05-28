"""Minimal outbound email via stdlib SMTP.

Used for the daily feedback digest. If SMTP isn't configured we log instead so
the rest of the app stays useful in dev/local without any extra setup.

Recommended setup: a Gmail account + an "App Password" (Google Account →
Security → 2-Step Verification → App Passwords). Set SMTP_HOST=smtp.gmail.com,
SMTP_PORT=587, SMTP_USER=you@gmail.com, SMTP_PASSWORD=<16-char app password>,
SMTP_FROM="Envia Feedback <you@gmail.com>".
"""
import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Optional
from app.config import settings

log = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


def _send_sync(to: str, subject: str, body_text: str, body_html: Optional[str]) -> None:
    """Build a multipart email and send via STARTTLS — runs in a worker thread."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


async def send_email(to: str, subject: str, body_text: str, body_html: Optional[str] = None) -> bool:
    """Send an email. Returns True on success, False on any failure or no config."""
    if not is_configured() or not to:
        log.info("[email] SMTP not configured — would send to %s: %s", to or "(no recipient)", subject)
        return False
    try:
        await asyncio.to_thread(_send_sync, to, subject, body_text, body_html)
        return True
    except Exception as e:
        log.warning("[email] send failed: %s", e)
        return False
