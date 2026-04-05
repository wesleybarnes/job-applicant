from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_clerk_user_id, get_current_user
from app.config import settings, FREE_CREDITS_ON_SIGNUP

router = APIRouter(prefix="/users", tags=["users"])


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
    for field, value in update.model_dump(exclude_unset=True).items():
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
