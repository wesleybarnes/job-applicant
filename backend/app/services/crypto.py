"""Symmetric encryption for site passwords at rest.

A Fernet key is derived from settings.credentials_secret_key (any string). If
that's unset, encryption is disabled and callers must not persist passwords —
only session cookies are cached. cryptography ships with python-jose[cryptography].
"""
import base64
import hashlib
from typing import Optional
from app.config import settings


def is_enabled() -> bool:
    """True when a secret is configured, so passwords can be stored encrypted."""
    return bool(settings.credentials_secret_key)


def _fernet():
    from cryptography.fernet import Fernet
    # Derive a stable 32-byte urlsafe key from whatever secret string is configured
    digest = hashlib.sha256(settings.credentials_secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plaintext: str) -> Optional[str]:
    """Return a Fernet token, or None if disabled/empty (caller skips saving)."""
    if not plaintext or not is_enabled():
        return None
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> Optional[str]:
    """Return the plaintext, or None if disabled/invalid."""
    if not token or not is_enabled():
        return None
    try:
        return _fernet().decrypt(token.encode()).decode()
    except Exception:
        return None
