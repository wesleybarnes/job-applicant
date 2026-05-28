"""User-submitted feedback. The admin reads this via /admin/feedback or the
daily digest email; users submit via the floating Feedback button in the UI.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackCreate(BaseModel):
    message: str
    category: Optional[str] = "general"   # general | bug | feature | other
    page: Optional[str] = None             # frontend path where it was submitted


@router.post("/")
def submit_feedback(
    body: FeedbackCreate,
    user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    text = (body.message or "").strip()
    if not text:
        return {"ok": False, "reason": "empty message"}
    row = models.Feedback(
        user_id=user.id,
        email=user.email,
        category=(body.category or "general").lower()[:50],
        page=(body.page or "")[:200],
        message=text[:5000],
        delivered=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id}
