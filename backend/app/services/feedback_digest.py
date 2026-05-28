"""Daily digest of new feedback → admin's inbox.

A single asyncio background task started on app startup loops forever, firing
once a day at settings.feedback_digest_hour_utc. It emails everything that
isn't yet `delivered=True`, then marks those rows delivered. If SMTP isn't
configured the rows still get marked so we don't double-include them once
SMTP comes online.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.config import settings
from app import models
from app.services.email import send_email, is_configured as smtp_configured

log = logging.getLogger(__name__)


def _digest_recipient() -> str:
    return (settings.feedback_digest_to or settings.admin_email or "").strip()


async def send_feedback_digest(db: Session) -> int:
    """Send a digest of undelivered feedback to the admin. Returns count sent."""
    rows = db.query(models.Feedback).filter(
        models.Feedback.delivered == False
    ).order_by(models.Feedback.created_at.asc()).all()
    if not rows:
        return 0

    to = _digest_recipient()
    if not to:
        log.info("[digest] no recipient configured (set FEEDBACK_DIGEST_TO or ADMIN_EMAIL)")
        return 0

    # Group by category for a tidy email
    by_cat: dict[str, list[models.Feedback]] = {}
    for r in rows:
        by_cat.setdefault(r.category or "general", []).append(r)

    lines_txt = [f"Envia feedback digest — {len(rows)} new since last run", ""]
    lines_html = [f"<h2>Envia feedback digest — {len(rows)} new</h2>"]
    for cat, items in by_cat.items():
        lines_txt.append(f"## {cat.upper()} ({len(items)})")
        lines_html.append(f"<h3>{cat.title()} ({len(items)})</h3><ul>")
        for r in items:
            when = r.created_at.strftime("%Y-%m-%d %H:%M UTC") if r.created_at else ""
            who = r.email or f"user_id={r.user_id}"
            where = f" @ {r.page}" if r.page else ""
            lines_txt.append(f"- [{when}] {who}{where}: {r.message}")
            lines_html.append(f"<li><small>{when} · {who}{where}</small><br>{(r.message or '').replace(chr(10), '<br>')}</li>")
        lines_txt.append("")
        lines_html.append("</ul>")

    subject = f"[Envia] {len(rows)} new feedback item{'s' if len(rows) != 1 else ''}"
    sent = await send_email(to, subject, "\n".join(lines_txt), "\n".join(lines_html))

    # Mark delivered whether or not SMTP worked, to avoid re-emailing yesterday's
    # backlog every day when SMTP later comes online. send_email already logs
    # un-sent messages so nothing is lost.
    for r in rows:
        r.delivered = True
    db.commit()
    log.info("[digest] marked %d row(s) delivered (smtp=%s)", len(rows), smtp_configured())
    return len(rows) if sent else 0


async def daily_digest_loop(session_factory):
    """Run forever, sleep until the configured hour each day, send digest."""
    log.info("[digest] scheduler started (target hour UTC: %d)", settings.feedback_digest_hour_utc)
    while True:
        try:
            now = datetime.now(timezone.utc)
            target = now.replace(hour=settings.feedback_digest_hour_utc, minute=0, second=0, microsecond=0)
            if target <= now:
                target = target + timedelta(days=1)
            seconds = (target - now).total_seconds()
            log.info("[digest] sleeping %d minutes until next run", int(seconds / 60))
            await asyncio.sleep(seconds)
        except asyncio.CancelledError:
            return
        # Run the digest
        try:
            from app.database import SessionLocal
            db = SessionLocal()
            try:
                await send_feedback_digest(db)
            finally:
                db.close()
        except Exception as e:
            log.warning("[digest] run failed: %s", e)
