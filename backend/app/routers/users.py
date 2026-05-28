from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_clerk_user_id, get_current_user
from app.config import settings, FREE_CREDITS_ON_SIGNUP

router = APIRouter(prefix="/users", tags=["users"])


class GoalsRequest(BaseModel):
    goals: Optional[str] = None      # free-form goals / survey answers, joined
    survey: Optional[dict] = None    # optional structured survey {question: answer}
    regenerate: bool = True          # regenerate the AI summary from goals


async def _generate_goal_summary(
    user: models.UserProfile,
    survey: Optional[dict],
    db: Session,
) -> str:
    """Use the configured model to distill goals + profile + resume into a tight summary.

    Pulling the active resume into the prompt is what makes "regenerate after a new
    resume" actually pick up the new content.
    """
    survey_text = ""
    if survey:
        survey_text = "\n".join(f"- {q}: {a}" for q, a in survey.items() if a)

    resume = db.query(models.Resume).filter(
        models.Resume.user_id == user.id,
        models.Resume.is_active == True,
    ).order_by(models.Resume.created_at.desc()).first()
    resume_excerpt = ""
    if resume and resume.parsed_text:
        # Cap to keep token cost bounded; the goal summary doesn't need the full resume,
        # just enough to recognize the role and seniority signals.
        resume_excerpt = f"\n\nActive resume excerpt:\n{resume.parsed_text[:3500]}"

    prompt = f"""Write a concise job-search goal summary (2-4 sentences, first person) for this candidate.
It will steer which job sites to search and how jobs are scored, so be specific about role, level, location/relocation, and any deal-breakers.

Roles: {', '.join(user.target_roles or []) or 'open'}
Target locations: {', '.join(user.target_locations or []) or 'flexible'}
Willing to relocate: {user.willing_to_relocate}
Remote preference: {user.remote_preference or 'any'}
Skills: {', '.join(user.skills or [])}
Existing summary: {user.summary or 'N/A'}
Stated goals: {user.goals or 'N/A'}
Survey answers:
{survey_text or 'N/A'}{resume_excerpt}

Return only the summary text, no preamble."""
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        resp = await client.messages.create(
            model=settings.agent_model,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()
        return text or (user.goals or "")
    except Exception:
        # Never block goal-setting on the LLM — fall back to the raw goals text
        return user.goals or ""


@router.post("/me/goals", response_model=schemas.UserProfileResponse)
async def set_goals(
    body: GoalsRequest,
    user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save free-form goals and (re)generate the editable AI goal summary."""
    from datetime import datetime, timezone
    if body.goals is not None:
        user.goals = body.goals
    if body.regenerate:
        user.goal_summary = await _generate_goal_summary(user, body.survey, db)
        user.goal_summary_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=schemas.UserProfileResponse)
def get_or_create_me(
    clerk_user_id: str = Depends(get_clerk_user_id),
    db: Session = Depends(get_db),
):
    """
    Called on every app load after Clerk auth.
    - If user exists → return it
    - If not → create a minimal profile (onboarding_complete=False)
    The frontend will redirect to /onboarding if onboarding_complete is False.
    """
    user = db.query(models.UserProfile).filter(
        models.UserProfile.clerk_user_id == clerk_user_id
    ).first()
    if user:
        # Auto-upgrade to admin if email matches ADMIN_EMAIL (catches existing users)
        if settings.admin_email and user.email.lower() == settings.admin_email.lower():
            if not user.is_admin:
                user.is_admin = True
                user.credits = 999999
                db.commit()
                db.refresh(user)
        return user

    # First-ever login — we only have the Clerk user ID right now.
    # The frontend passes email + name from Clerk's useUser() hook via the onboarding flow.
    # For now create a stub so the ID exists.
    stub = models.UserProfile(
        clerk_user_id=clerk_user_id,
        email=f"{clerk_user_id}@pending.envia",   # replaced during onboarding
        full_name=None,
        is_admin=False,
        credits=FREE_CREDITS_ON_SIGNUP,
        onboarding_complete=False,
    )
    db.add(stub)
    db.commit()
    db.refresh(stub)
    return stub


@router.post("/me/onboard", response_model=schemas.UserProfileResponse)
def complete_onboarding(
    data: schemas.UserProfileCreate,
    clerk_user_id: str = Depends(get_clerk_user_id),
    db: Session = Depends(get_db),
):
    """Complete onboarding — sets all profile fields and marks onboarding done."""
    user = db.query(models.UserProfile).filter(
        models.UserProfile.clerk_user_id == clerk_user_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_admin = data.email.lower() == settings.admin_email.lower()

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    user.is_admin = is_admin
    user.onboarding_complete = True
    if is_admin:
        user.credits = 999999  # effectively unlimited
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=schemas.UserProfileResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/me", response_model=schemas.UserProfileResponse)
def update_me(
    update: schemas.UserProfileUpdate,
    user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fields = update.model_dump(exclude_unset=True)
    # Manual edits to the goal summary also bump its updated_at so we can flag
    # staleness against a newer resume (and undo it when the user edits in time).
    if "goal_summary" in fields:
        from datetime import datetime, timezone
        user.goal_summary_updated_at = datetime.now(timezone.utc)
    for field, value in fields.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/grant-admin", response_model=schemas.UserProfileResponse)
def grant_admin(
    x_admin_secret: Optional[str] = Header(default=None),
    clerk_user_id: str = Depends(get_clerk_user_id),
    db: Session = Depends(get_db),
):
    """
    Self-service endpoint: grant the requesting user admin + unlimited credits.
    Protected by X-Admin-Secret header = ANTHROPIC_API_KEY value.
    Call this once if your admin email/flag isn't being picked up automatically.
    """
    if not x_admin_secret or x_admin_secret != settings.anthropic_api_key:
        raise HTTPException(status_code=403, detail="Invalid admin secret.")
    user = db.query(models.UserProfile).filter(
        models.UserProfile.clerk_user_id == clerk_user_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    user.credits = 999999
    db.commit()
    db.refresh(user)
    return user
