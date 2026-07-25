"""Auth endpoints: register, login, logout, delete account."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth.service import (
    get_current_user,
    hash_password,
    issue_token,
    revoke_token,
    verify_password,
)
from ..db import get_db
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenOut(BaseModel):
    token: str
    email: str


@router.post("/register", response_model=TokenOut, status_code=201)
def register(creds: Credentials, db: Session = Depends(get_db)) -> TokenOut:
    if db.scalar(select(User).where(User.email == creds.email.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")
    user = User(email=creds.email.lower(), password_hash=hash_password(creds.password))
    db.add(user)
    db.flush()
    token = issue_token(db, user)
    db.commit()
    return TokenOut(token=token, email=user.email)


@router.post("/login", response_model=TokenOut)
def login(creds: Credentials, db: Session = Depends(get_db)) -> TokenOut:
    user = db.scalar(select(User).where(User.email == creds.email.lower()))
    if user is None or not verify_password(creds.password, user.password_hash):
        # One message for both cases: don't leak which emails exist.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid email or password")
    token = issue_token(db, user)
    db.commit()
    return TokenOut(token=token, email=user.email)


@router.post("/logout", status_code=204)
def logout(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> None:
    if creds is not None:
        revoke_token(db, creds.credentials)
        db.commit()


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> dict:
    return {"email": user.email, "created_at": user.created_at.isoformat()}


@router.delete("/account", status_code=204)
def delete_account(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    db.delete(user)  # cascades tokens and plans
    db.commit()
