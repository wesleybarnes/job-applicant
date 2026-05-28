"""Admin endpoints — closed-beta allowlist + feedback inbox.

Protected by the X-Admin-Secret header (value = ANTHROPIC_API_KEY) to keep
curl-from-terminal admin operations trivial. The /allowlist/check endpoint is
public-ish (auth via Clerk only) so the onboarding flow can pre-check whether
the signed-in email is allowed before the user fills out the whole form.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin_secret(x_admin_secret: Optional[str] = Header(default=None)):
    """Guard for curl-friendly admin endpoints. Matches /me/grant-admin's pattern."""
    if not x_admin_secret or not settings.anthropic_api_key or x_admin_secret != settings.anthropic_api_key:
        raise HTTPException(status_code=403, detail="Invalid X-Admin-Secret")
    return True


# ─── Allowlist ────────────────────────────────────────────────────────────

class AllowlistAdd(BaseModel):
    email: EmailStr
    notes: Optional[str] = None
    added_by: Optional[str] = None


@router.post("/allowlist")
def add_allowlist_email(body: AllowlistAdd, _: bool = Depends(_require_admin_secret), db: Session = Depends(get_db)):
    """Add an email to the closed-beta allowlist (idempotent)."""
    email = body.email.lower().strip()
    existing = db.query(models.AllowlistEmail).filter(models.AllowlistEmail.email == email).first()
    if existing:
        return {"email": email, "already_present": True, "id": existing.id}
    row = models.AllowlistEmail(email=email, notes=body.notes, added_by=body.added_by or "admin")
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"email": email, "already_present": False, "id": row.id}


@router.get("/allowlist")
def list_allowlist_emails(_: bool = Depends(_require_admin_secret), db: Session = Depends(get_db)):
    rows = db.query(models.AllowlistEmail).order_by(models.AllowlistEmail.created_at.desc()).all()
    return [{"id": r.id, "email": r.email, "notes": r.notes, "added_by": r.added_by,
             "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]


@router.delete("/allowlist/{email}")
def remove_allowlist_email(email: str, _: bool = Depends(_require_admin_secret), db: Session = Depends(get_db)):
    row = db.query(models.AllowlistEmail).filter(models.AllowlistEmail.email == email.lower().strip()).first()
    if not row:
        raise HTTPException(status_code=404, detail="Email not on allowlist")
    db.delete(row)
    db.commit()
    return {"email": email, "removed": True}


@router.get("/allowlist/check")
def check_allowlist(
    email: str,
    _user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lightweight pre-check used by the onboarding flow so users don't fill out
    the whole form just to be rejected. Requires Clerk auth (not the admin secret)."""
    if not settings.invite_only:
        return {"allowed": True, "invite_only": False}
    email_n = (email or "").lower().strip()
    if settings.admin_email and email_n == settings.admin_email.lower():
        return {"allowed": True, "invite_only": True, "reason": "admin"}
    row = db.query(models.AllowlistEmail).filter(models.AllowlistEmail.email == email_n).first()
    return {"allowed": bool(row), "invite_only": True}


# ─── Feedback inbox ───────────────────────────────────────────────────────

@router.get("/feedback")
def list_feedback(
    limit: int = 100,
    _: bool = Depends(_require_admin_secret),
    db: Session = Depends(get_db),
):
    rows = db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).limit(limit).all()
    return [{"id": r.id, "user_id": r.user_id, "email": r.email, "category": r.category,
             "page": r.page, "message": r.message, "delivered": r.delivered,
             "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]


@router.post("/feedback/digest")
async def trigger_digest_now(_: bool = Depends(_require_admin_secret), db: Session = Depends(get_db)):
    """Manually trigger the daily feedback digest (useful while testing email setup)."""
    from app.services.feedback_digest import send_feedback_digest
    sent_count = await send_feedback_digest(db)
    return {"sent": sent_count}
