from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.db.session import get_session
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, RegisterResponse
from app.services.auth_service import (
    InvalidCredentialsError,
    InvalidTokenError,
    TokenExpiredError,
    UsernameAlreadyExistsError,
    login_user,
    register_user,
    verify_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, session: Session = Depends(get_session)) -> RegisterResponse:
    try:
        user = register_user(session, payload.username, payload.password)
    except UsernameAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message) from exc
    return RegisterResponse(user_id=user.id, username=user.username)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> LoginResponse:
    try:
        token = login_user(session, payload.username, payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message) from exc
    return LoginResponse(access_token=token)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
        )
    try:
        return verify_token(session, credentials.credentials)
    except (InvalidTokenError, TokenExpiredError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message) from exc
