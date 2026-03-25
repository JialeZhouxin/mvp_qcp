import hashlib

from sqlmodel import SQLModel, Session, create_engine, select

from app.models.tenant import Tenant
from app.models.user import User
from app.services.auth_service import login_user, register_user


def _build_session() -> Session:
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def test_register_user_uses_pbkdf2_hash_format() -> None:
    with _build_session() as session:
        user = register_user(session, "alice", "pass123456")

        assert user.password_salt is not None
        hash_parts = user.password_hash.split("$")
        assert hash_parts[0] == "pbkdf2_sha256"
        assert hash_parts[1].isdigit()
        assert len(hash_parts[2]) > 0
        assert len(hash_parts[3]) > 0


def test_login_migrates_legacy_sha256_password_hash() -> None:
    with _build_session() as session:
        tenant = Tenant(slug="legacy-user", name="legacy-user workspace")
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        legacy_user = User(
            username="legacy_user",
            tenant_id=int(tenant.id or 0),
            password_hash=hashlib.sha256("pass123456".encode("utf-8")).hexdigest(),
            password_salt=None,
        )
        session.add(legacy_user)
        session.commit()
        session.refresh(legacy_user)

        token = login_user(session, "legacy_user", "pass123456")

        assert token
        reloaded_user = session.exec(select(User).where(User.id == legacy_user.id)).one()
        assert reloaded_user.password_salt is not None
        assert reloaded_user.password_hash.startswith("pbkdf2_sha256$")
