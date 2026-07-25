"""Token auth: argon2id passwords, opaque bearer tokens hashed at rest.

Deliberately minimal (no recovery, no refresh) and isolated so Clerk can
replace it later without touching the rest of the app: everything outside
this package only uses `get_current_user`.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import AuthToken, User

_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        AuthToken(
            user_id=user.id,
            token_hash=_hash_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.token_ttl_days),
        )
    )
    return token


def revoke_token(db: Session, token: str) -> None:
    row = db.scalar(select(AuthToken).where(AuthToken.token_hash == _hash_token(token)))
    if row is not None:
        db.delete(row)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    row = db.scalar(
        select(AuthToken).where(AuthToken.token_hash == _hash_token(creds.credentials))
    )
    expires = row.expires_at if row is not None else None
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)  # SQLite drops tzinfo
    if row is None or expires < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid or expired token")
    row.last_used_at = datetime.now(timezone.utc)
    user = db.get(User, row.user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user gone")
    return user
