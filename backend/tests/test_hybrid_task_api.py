import json
import os
from pathlib import Path

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, select

TEST_DATABASE_URL = "sqlite:///./data/test_hybrid_task_api.db"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL


def _resolve_sqlite_db_path(database_url: str) -> Path | None:
    sqlite_prefix = "sqlite:///"
    if not database_url.startswith(sqlite_prefix):
        return None

    db_path_text = database_url.replace(sqlite_prefix, "", 1)
    if db_path_text == ":memory:":
        return None

    db_path = Path(db_path_text)
    if db_path.is_absolute():
        return db_path

    backend_root = Path(__file__).resolve().parents[1]
    return (backend_root / db_path).resolve()


initial_db_path = _resolve_sqlite_db_path(TEST_DATABASE_URL)
if initial_db_path and initial_db_path.exists():
    initial_db_path.unlink()


from app.db.session import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.task import Task, TaskStatus, TaskType  # noqa: E402
from app.worker.task_names import RUN_HYBRID_TASK_NAME  # noqa: E402


SQLModel.metadata.drop_all(engine)
init_db()
client = TestClient(app)


def _auth_headers(username: str, password: str = "pass123456") -> dict[str, str]:
    client.post("/api/auth/register", json={"username": username, "password": password})
    login_resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_hybrid_submit_persists_task_and_routes_to_hybrid_queue(monkeypatch) -> None:
    queued: dict[str, int | str] = {}

    class QueueStub:
        def enqueue(self, task_name: str, task_id: int, job_timeout: int) -> None:
            queued["task_name"] = task_name
            queued["task_id"] = task_id
            queued["job_timeout"] = job_timeout

    monkeypatch.setattr("app.dependencies.task_submit.get_hybrid_task_queue", lambda: QueueStub())

    headers = _auth_headers("tester_hybrid_submit_ok")
    response = client.post(
        "/api/tasks/hybrid/submit",
        json={
            "algorithm": "vqe",
            "problem_template": "bell_state_overlap",
            "max_iterations": 8,
            "step_size": 0.2,
            "target_bitstring": "00",
        },
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "PENDING"
    assert payload["task_type"] == "hybrid"
    assert queued["task_name"] == RUN_HYBRID_TASK_NAME
    assert queued["task_id"] == payload["task_id"]

    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == payload["task_id"])).first()
        assert task is not None
        assert task.status == TaskStatus.PENDING
        assert task.task_type == TaskType.HYBRID
        assert task.code is None
        assert task.payload_json is not None
        assert json.loads(task.payload_json) == {
            "algorithm": "vqe",
            "problem_template": "bell_state_overlap",
            "max_iterations": 8,
            "step_size": 0.2,
            "tolerance": 0.001,
            "target_bitstring": "00",
            "num_qubits": 2,
        }


def test_cancel_task_updates_running_task_to_cancelled() -> None:
    headers = _auth_headers("tester_hybrid_cancel")
    submit = client.post(
        "/api/tasks/hybrid/submit",
        json={
            "algorithm": "vqe",
            "problem_template": "bell_state_overlap",
            "max_iterations": 5,
            "step_size": 0.3,
            "target_bitstring": "00",
        },
        headers=headers,
    )
    assert submit.status_code == 200
    task_id = int(submit.json()["task_id"])

    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == task_id)).first()
        assert task is not None
        task.status = TaskStatus.RUNNING
        session.add(task)
        session.commit()

    cancel = client.post(f"/api/tasks/{task_id}/cancel", headers=headers)
    assert cancel.status_code == 200
    assert cancel.json() == {"task_id": task_id, "status": "CANCELLED"}

    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == task_id)).first()
        assert task is not None
        assert task.status == TaskStatus.CANCELLED


def test_hybrid_submit_accepts_max_iterations_10000(monkeypatch) -> None:
    class QueueStub:
        def enqueue(self, _task_name: str, _task_id: int, _job_timeout: int) -> None:
            return

    monkeypatch.setattr("app.dependencies.task_submit.get_hybrid_task_queue", lambda: QueueStub())
    headers = _auth_headers("tester_hybrid_max_iterations")
    response = client.post(
        "/api/tasks/hybrid/submit",
        json={
            "algorithm": "vqe",
            "problem_template": "bell_state_overlap",
            "max_iterations": 10000,
            "step_size": 0.2,
            "target_bitstring": "00",
        },
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "PENDING"


def teardown_module() -> None:
    client.close()
    database_url = os.getenv("DATABASE_URL", TEST_DATABASE_URL)
    db_path = _resolve_sqlite_db_path(database_url)
    try:
        if db_path and db_path.exists():
            db_path.unlink()
    except PermissionError:
        pass
