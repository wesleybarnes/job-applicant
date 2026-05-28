"""Public, unauthenticated endpoints — currently just beta-access requests
from the landing page. Requests are stored as Feedback rows (category=
"beta_request") so they show up in the daily digest, AND we send an immediate
admin email so the admin can grant access quickly.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app import models
from app.services.email import send_email

router = APIRouter(prefix="/public", tags=["public"])


class BetaAccessRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    why: Optional[str] = None   # "Why do you want access?" — optional context


@router.post("/beta-request")
async def request_beta_access(body: BetaAccessRequest, db: Session = Depends(get_db)):
    """Record a request for closed-beta access. Stored as a Feedback row so it
    rolls up in the daily digest; also fires an immediate email to the admin
    so they can grant access by curl or future admin UI."""
    email_n = body.email.lower().strip()

    # Don't accept duplicates from the same email within the unsent batch
    existing = db.query(models.Feedback).filter(
        models.Feedback.category == "beta_request",
        models.Feedback.email == email_n,
        models.Feedback.delivered == False,
    ).first()
    if existing:
        return {"ok": True, "id": existing.id, "already_queued": True}

    # If they're already on the allowlist, tell them — no need to request again
    allow = db.query(models.AllowlistEmail).filter(models.AllowlistEmail.email == email_n).first()
    if allow:
        return {"ok": True, "already_allowed": True}

    msg = body.why or ""
    if body.name:
        msg = f"From: {body.name}\n{msg}" if msg else f"From: {body.name}"
    if not msg:
        msg = "(no message)"

    row = models.Feedback(
        user_id=None,
        email=email_n,
        category="beta_request",
        page="/",
        message=msg[:5000],
        delivered=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    # Immediate notification — don't wait for the daily digest
    to = (settings.feedback_digest_to or settings.admin_email or "").strip()
    if to:
        body_text = (
            f"New beta access request\n\n"
            f"Email:   {email_n}\n"
            f"Name:    {body.name or '(not given)'}\n"
            f"Why:     {body.why or '(not given)'}\n\n"
            f"To grant access, add the email to the allowlist:\n"
            f"  curl -X POST $API/admin/allowlist \\\n"
            f"       -H \"X-Admin-Secret: $S\" \\\n"
            f"       -H \"Content-Type: application/json\" \\\n"
            f"       -d '{{\"email\":\"{email_n}\",\"notes\":\"beta request\"}}'\n"
        )
        body_html = (
            "<h3>New beta access request</h3>"
            f"<p><strong>Email:</strong> {email_n}<br>"
            f"<strong>Name:</strong> {body.name or '(not given)'}<br>"
            f"<strong>Why:</strong> {(body.why or '(not given)').replace(chr(10), '<br>')}</p>"
            "<p>Grant access via curl:</p>"
            "<pre style='background:#f4f4f4;padding:10px;border-radius:6px'>"
            f"curl -X POST $API/admin/allowlist \\\n"
            f"     -H \"X-Admin-Secret: $S\" \\\n"
            f"     -H \"Content-Type: application/json\" \\\n"
            f"     -d '{{\"email\":\"{email_n}\",\"notes\":\"beta request\"}}'"
            "</pre>"
        )
        try:
            await send_email(to, f"[Envia] Beta access request — {email_n}", body_text, body_html)
        except Exception:
            pass  # never block the request on a flaky SMTP

    return {"ok": True, "id": row.id}
