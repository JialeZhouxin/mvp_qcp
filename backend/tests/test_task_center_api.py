import os
from pathlib import Path

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session

os.environ["DATABASE_URL"] = "sqlite:///./data/test_task_center_api.db"

from app.db.session import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.task import Task, TaskStatus  # noqa: E402
from app.services.task_event_stream_service import TaskEventStreamService  # noqa: E402
from app.services.task_stream_models import TaskHeartbeatPayload, TaskStatusStreamPayload  # noqa: E402

SQLModel.metadata.drop_all(engine)
init_db()
client = TestClient(app)


def _auth(username: str, password: str = "pass123456") -> tuple[int, dict[str, str]]:
    register = client.post("/api/auth/register", json={"username": username, "password": password})
    user_id = register.json().get("user_id")
    login = client.post("/api/auth/login", json={"username": username, "password": password})
    token = login.json()["access_token"]
    return int(user_id), {"Authorization": f"Bearer {token}"}


def _create_task(user_id: int, status: TaskStatus, error_payload: str | None = None) -> int:
    with Session(engine) as session:
        task = Task(
            user_id=user_id,
            code="def main():\n    return {'counts': {'00': 1}}",
            status=status,
            error_message=error_payload,
            attempt_count=1,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        return int(task.id or 0)


def test_task_center_list_and_detail() -> None:
    user_id, headers = _auth("task_center_owner")
    task_id = _create_task(
        user_id,
        TaskStatus.FAILURE,
        error_payload='{"code":"EXECUTION_TIMEOUT","message":"execution timeout: 60s"}',
    )

    listing = client.get("/api/tasks?status=FAILURE&limit=20&offset=0", headers=headers)
    assert listing.status_code == 200
    payload = listing.json()
    assert payload["total"] >= 1
    assert any(item["task_id"] == task_id for item in payload["items"])

    detail = client.get(f"/api/tasks/{task_id}/detail", headers=headers)
    assert detail.status_code == 200
    diagnostic = detail.json()["diagnostic"]
    assert diagnostic["code"] == "EXECUTION_TIMEOUT"
    assert len(diagnostic["suggestions"]) >= 1


def test_task_center_detail_isolation() -> None:
    owner_id, owner_headers = _auth("task_center_iso_owner")
    _other_id, other_headers = _auth("task_center_iso_other")
    task_id = _create_task(owner_id, TaskStatus.SUCCESS)

    other_detail = client.get(f"/api/tasks/{task_id}/detail", headers=other_headers)
    assert other_detail.status_code == 404
    assert other_detail.json()["detail"] == "task not found"


def test_task_stream_rejects_invalid_task_ids() -> None:
    _user_id, headers = _auth("task_stream_bad_query")
    response = client.get("/api/tasks/stream?task_ids=abc", headers=headers)
    assert response.status_code == 400
    assert "invalid task id" in response.json()["detail"]


def test_task_event_stream_service_emits_change_payload() -> None:
    user_id, _headers = _auth("task_stream_owner")
    task_id = _create_task(user_id, TaskStatus.PENDING)

    service = TaskEventStreamService()
    changed, versions = service.list_changed_tasks(user_id, {task_id}, {})

    assert len(changed) == 1
    assert isinstance(changed[0], TaskStatusStreamPayload)
    assert changed[0].task_id == task_id
    assert changed[0].status == "PENDING"
    assert task_id in versions


def test_task_event_stream_service_builds_typed_heartbeat() -> None:
    service = TaskEventStreamService()

    heartbeat = service.build_heartbeat()

    assert isinstance(heartbeat, TaskHeartbeatPayload)
    assert heartbeat.timestamp.isoformat()


def teardown_module() -> None:
    client.close()
    db_path = Path(__file__).resolve().parents[1] / "data" / "test_task_center_api.db"
    try:
        if db_path.exists():
            db_path.unlink()
    except PermissionError:
        pass
