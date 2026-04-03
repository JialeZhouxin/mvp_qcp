import os

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, select

os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://qcp:QcpDev_2026_Strong!@127.0.0.1:5432/qcp_test"
)
from app.db.session import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.task import Task, TaskStatus  # noqa: E402
from app.worker.tasks import RUN_QUANTUM_TASK_NAME  # noqa: E402


SQLModel.metadata.drop_all(engine)
init_db()
client = TestClient(app)


def _auth_headers(username: str, password: str = "pass123456") -> dict[str, str]:
    client.post("/api/auth/register", json={"username": username, "password": password})
    login_resp = client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_check() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"


def test_auth_register_and_login() -> None:
    username = "tester_mvp"
    password = "pass123456"

    register_resp = client.post(
        "/api/auth/register", json={"username": username, "password": password}
    )
    assert register_resp.status_code in (200, 409)

    login_resp = client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "Bearer"


def test_task_submit_and_query_contract() -> None:
    headers = _auth_headers("tester_task")

    sample_code = "def main():\n    return {'counts': {'00': 10, '11': 6}}"
    submit_resp = client.post(
        "/api/tasks/submit", json={"code": sample_code}, headers=headers
    )
    assert submit_resp.status_code in (200, 503)

    if submit_resp.status_code == 200:
        task_id = submit_resp.json()["task_id"]

        status_resp = client.get(f"/api/tasks/{task_id}", headers=headers)
        assert status_resp.status_code == 200
        assert "status" in status_resp.json()

        result_resp = client.get(f"/api/tasks/{task_id}/result", headers=headers)
        assert result_resp.status_code == 200
        assert "status" in result_resp.json()


def test_task_submit_queue_success_sets_pending(monkeypatch) -> None:
    queued: dict[str, int] = {}

    class QueueStub:
        count = 0

        def enqueue(self, task_name: str, task_id: int, job_timeout: int) -> None:
            assert task_name == RUN_QUANTUM_TASK_NAME
            assert job_timeout > 0
            queued["task_id"] = task_id

    monkeypatch.setattr(
        "app.dependencies.task_submit.get_task_queue", lambda: QueueStub()
    )

    headers = _auth_headers("tester_queue_ok")
    code = "def main():\n    return {'counts': {'00': 3, '11': 1}}"
    submit_resp = client.post("/api/tasks/submit", json={"code": code}, headers=headers)

    assert submit_resp.status_code == 200
    payload = submit_resp.json()
    assert payload["status"] == "PENDING"
    assert payload["deduplicated"] is False
    assert queued["task_id"] == payload["task_id"]

    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == payload["task_id"])).first()
        assert task is not None
        assert task.status == TaskStatus.PENDING


def test_task_submit_queue_failure_marks_task_failed(monkeypatch) -> None:
    class QueueStub:
        count = 0

        def enqueue(self, *_args, **_kwargs) -> None:
            raise RuntimeError("redis unavailable")

    monkeypatch.setattr(
        "app.dependencies.task_submit.get_task_queue", lambda: QueueStub()
    )

    headers = _auth_headers("tester_queue_fail")
    code = "def main():\n    return {'counts': {'00': 1, '11': 1}}  # queue-fail-case"
    submit_resp = client.post("/api/tasks/submit", json={"code": code}, headers=headers)

    assert submit_resp.status_code == 503
    detail = submit_resp.json()["detail"]
    assert detail["code"] == "QUEUE_PUBLISH_ERROR"

    with Session(engine) as session:
        tasks = session.exec(select(Task).where(Task.code == code)).all()
        assert len(tasks) >= 1
        task = tasks[-1]
        assert task.status == TaskStatus.FAILURE
        assert task.error_message is not None
        assert "QUEUE_PUBLISH_ERROR" in task.error_message


def test_task_status_isolation_by_owner(monkeypatch) -> None:
    class QueueStub:
        count = 0

        def enqueue(self, *_args, **_kwargs) -> None:
            return None

    monkeypatch.setattr(
        "app.dependencies.task_submit.get_task_queue", lambda: QueueStub()
    )

    owner_headers = _auth_headers("tester_owner")
    other_headers = _auth_headers("tester_other")
    code = "def main():\n    return {'counts': {'00': 8, '11': 8}}"

    submit_resp = client.post(
        "/api/tasks/submit", json={"code": code}, headers=owner_headers
    )
    assert submit_resp.status_code == 200
    task_id = submit_resp.json()["task_id"]

    owner_status = client.get(f"/api/tasks/{task_id}", headers=owner_headers)
    assert owner_status.status_code == 200

    other_status = client.get(f"/api/tasks/{task_id}", headers=other_headers)
    assert other_status.status_code == 404
    assert other_status.json()["detail"] == "task not found"


def teardown_module() -> None:
    client.close()
