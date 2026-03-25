from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.tenant import Tenant
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


def _load_tenant(session: Session, tenant_id: int) -> Tenant:
    tenant = session.exec(select(Tenant).where(Tenant.id == tenant_id)).first()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="tenant not found")
    return tenant


@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, session: Session = Depends(get_session)) -> RegisterResponse:
    try:
        user = register_user(session, payload.username, payload.password)
    except UsernameAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message) from exc
    tenant = _load_tenant(session, user.tenant_id)
    return RegisterResponse(
        user_id=int(user.id or 0),
        username=user.username,
        tenant_id=int(tenant.id or 0),
        tenant_slug=tenant.slug,
        tenant_name=tenant.name,
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> LoginResponse:
    try:
        token = login_user(session, payload.username, payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message) from exc
    user = verify_token(session, token)
    tenant = _load_tenant(session, user.tenant_id)
    return LoginResponse(
        access_token=token,
        tenant_id=int(tenant.id or 0),
        tenant_slug=tenant.slug,
        tenant_name=tenant.name,
    )


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
