import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.config import settings
from app.models.user import User


def _hash_password(password: str, salt: str) -> str:
    raw = f"{salt}:{password}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _verify_password(user: User, password: str) -> bool:
    # Backward compatibility for users created before salt was introduced.
    if user.password_salt:
        return user.password_hash == _hash_password(password, user.password_salt)
    legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return user.password_hash == legacy_hash


def register_user(session: Session, username: str, password: str) -> User:
    existing_user = session.exec(select(User).where(User.username == username)).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username already exists")

    salt = secrets.token_hex(16)
    user = User(
        username=username,
        password_salt=salt,
        password_hash=_hash_password(password, salt),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def login_user(session: Session, username: str, password: str) -> str:
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not _verify_password(user, password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid username or password")

    # Single-session policy: each login overrides the previous token.
    token = secrets.token_urlsafe(32)
    user.token = token
    user.token_expires_at = datetime.utcnow() + timedelta(hours=settings.token_expire_hours)
    session.add(user)
    session.commit()
    return token


def verify_token(session: Session, token: str) -> User:
    user = session.exec(select(User).where(User.token == token)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    if not user.token_expires_at or user.token_expires_at <= datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token expired")
    return user
