import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.config import settings
from app.models.user import User

PBKDF2_ALGORITHM = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 260000
PASSWORD_SALT_BYTES = 16
PBKDF2_SEPARATOR = "$"


def _hash_legacy_password(password: str, salt: str) -> str:
    raw = f"{salt}:{password}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _encode_pbkdf2_password(password: str, salt: str, iterations: int = PBKDF2_ITERATIONS) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return f"{PBKDF2_ALGORITHM}{PBKDF2_SEPARATOR}{iterations}{PBKDF2_SEPARATOR}{salt}{PBKDF2_SEPARATOR}{digest}"


def _is_pbkdf2_password(encoded: str) -> bool:
    return encoded.startswith(f"{PBKDF2_ALGORITHM}{PBKDF2_SEPARATOR}")


def _verify_pbkdf2_password(password: str, encoded: str) -> bool:
    parts = encoded.split(PBKDF2_SEPARATOR, 3)
    if len(parts) != 4 or parts[0] != PBKDF2_ALGORITHM or not parts[1].isdigit():
        return False
    iterations = int(parts[1])
    salt = parts[2]
    expected_digest = parts[3]
    actual_digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return hmac.compare_digest(expected_digest, actual_digest)


def _verify_password(user: User, password: str) -> bool:
    if _is_pbkdf2_password(user.password_hash):
        return _verify_pbkdf2_password(password, user.password_hash)

    if user.password_salt:
        expected_hash = _hash_legacy_password(password, user.password_salt)
        return hmac.compare_digest(user.password_hash, expected_hash)

    legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(user.password_hash, legacy_hash)


def register_user(session: Session, username: str, password: str) -> User:
    existing_user = session.exec(select(User).where(User.username == username)).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username already exists")

    salt = secrets.token_hex(PASSWORD_SALT_BYTES)
    user = User(
        username=username,
        password_salt=salt,
        password_hash=_encode_pbkdf2_password(password, salt),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def login_user(session: Session, username: str, password: str) -> str:
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not _verify_password(user, password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid username or password")

    if not _is_pbkdf2_password(user.password_hash):
        upgraded_salt = user.password_salt or secrets.token_hex(PASSWORD_SALT_BYTES)
        user.password_salt = upgraded_salt
        user.password_hash = _encode_pbkdf2_password(password, upgraded_salt)

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
