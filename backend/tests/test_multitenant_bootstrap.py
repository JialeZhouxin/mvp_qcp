import os

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

os.environ["DATABASE_URL"] = "sqlite:///./data/test_multitenant_bootstrap.db"

from app.db.session import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.task import Task, TaskStatus  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.task_query_service import TaskAccessDeniedError, TaskQueryService  # noqa: E402

SQLModel.metadata.drop_all(engine)
init_db()


def test_register_and_login_return_tenant_metadata() -> None:
    with TestClient(app) as client:
        register_response = client.post(
            "/api/auth/register",
            json={"username": "tenant_owner", "password": "pass123456"},
        )
        assert register_response.status_code == 200

        register_payload = register_response.json()
        assert register_payload["tenant_id"] > 0
        assert register_payload["tenant_slug"] == "tenant-owner"
        assert register_payload["tenant_name"] == "tenant_owner workspace"

        login_response = client.post(
            "/api/auth/login",
            json={"username": "tenant_owner", "password": "pass123456"},
        )
        assert login_response.status_code == 200

        login_payload = login_response.json()
        assert login_payload["tenant_id"] == register_payload["tenant_id"]
        assert login_payload["tenant_slug"] == register_payload["tenant_slug"]
        assert login_payload["tenant_name"] == register_payload["tenant_name"]


def test_task_query_service_rejects_wrong_tenant_even_with_correct_user_id() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(
            username="tenant_query_owner",
            password_hash="hash",
            tenant_id=1,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        task = Task(
            tenant_id=1,
            user_id=int(user.id or 0),
            code="def main():\n    return {'counts': {'00': 1}}",
            status=TaskStatus.PENDING,
        )
        session.add(task)
        session.commit()
        session.refresh(task)

        service = TaskQueryService(session)

        try:
            service.get_status_view(2, int(user.id or 0), int(task.id or 0))
        except TaskAccessDeniedError:
            pass
        else:
            raise AssertionError("expected TaskAccessDeniedError")
