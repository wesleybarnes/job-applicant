"""
Clerk JWT verification for FastAPI.

Every protected endpoint uses `get_current_user` as a dependency.
Admin users (matching ADMIN_EMAIL) bypass all credit checks.
"""
import httpx
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models

# Decode the Clerk domain from the publishable key
# pk_test_BASE64$ → base64 decode → "your-app.clerk.accounts.dev$"
import base64
_raw = settings.clerk_publishable_key.split("_", 2)[-1]  # strip pk_test_ / pk_live_
_padded = _raw + "=" * (-len(_raw) % 4)
CLERK_DOMAIN = base64.b64decode(_padded).decode().rstrip("$")
JWKS_URL = f"https://{CLERK_DOMAIN}/.well-known/jwks.json"

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _fetch_jwks() -> dict:
    resp = httpx.get(JWKS_URL, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _get_jwks():
    """Return cached JWKS, refreshing on failure."""
    try:
        return _fetch_jwks()
    except Exception:
        _fetch_jwks.cache_clear()
        return _fetch_jwks()


def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk session JWT and return the payload."""
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        jwks = _get_jwks()
        key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
        if not key:
            # Key not found — JWKS may be stale, refresh once
            _fetch_jwks.cache_clear()
            jwks = _get_jwks()
            key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Unknown signing key")
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk doesn't set aud by default
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def get_clerk_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Extract and verify the Clerk user ID from the Bearer token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_clerk_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id


def get_current_user(
    clerk_user_id: str = Depends(get_clerk_user_id),
    db: Session = Depends(get_db),
) -> models.UserProfile:
    """Get the UserProfile for the authenticated user. Raises 404 if not onboarded."""
    user = db.query(models.UserProfile).filter(
        models.UserProfile.clerk_user_id == clerk_user_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Profile not found. Please complete onboarding.",
        )
    return user


def get_current_user_or_none(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.UserProfile | None:
    """Like get_current_user but returns None instead of raising."""
    if not credentials:
        return None
    try:
        payload = verify_clerk_token(credentials.credentials)
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            return None
        return db.query(models.UserProfile).filter(
            models.UserProfile.clerk_user_id == clerk_user_id
        ).first()
    except Exception:
        return None


def require_credits(cost: int = 1):
    """Dependency factory — ensures the user has enough credits. Admins skip."""
    def _check(user: models.UserProfile = Depends(get_current_user)):
        if user.is_admin:
            return user
        if user.credits < cost:
            raise HTTPException(
                status_code=402,
                detail=f"Not enough credits. This action costs {cost} credit(s). You have {user.credits}.",
            )
        return user
    return _check


def deduct_credits(user: models.UserProfile, cost: int, db: Session):
    """Deduct credits from a user. No-op for admins."""
    if user.is_admin:
        return
    user.credits = max(0, user.credits - cost)
    db.commit()
