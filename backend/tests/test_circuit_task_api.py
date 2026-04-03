import json
import os

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, select

os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://qcp:QcpDev_2026_Strong!@127.0.0.1:5432/qcp_test"
)


from app.db.session import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.task import Task, TaskStatus, TaskType  # noqa: E402
from app.worker.task_names import RUN_CIRCUIT_TASK_NAME  # noqa: E402


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


def test_circuit_submit_requires_live_circuit_executor(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.use_cases.task_use_cases.is_circuit_executor_available",
        lambda *_args, **_kwargs: False,
    )

    headers = _auth_headers("tester_circuit_unavailable")
    response = client.post(
        "/api/tasks/circuit/submit",
        json={
            "num_qubits": 2,
            "operations": [{"gate": "h", "targets": [0]}],
        },
        headers=headers,
    )

    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == "CIRCUIT_EXECUTOR_UNAVAILABLE"


def test_circuit_submit_persists_circuit_task_and_routes_to_circuit_queue(
    monkeypatch,
) -> None:
    queued: dict[str, int | str] = {}

    class QueueStub:
        def enqueue(self, task_name: str, task_id: int, job_timeout: int) -> None:
            queued["task_name"] = task_name
            queued["task_id"] = task_id
            queued["job_timeout"] = job_timeout

    monkeypatch.setattr(
        "app.use_cases.task_use_cases.is_circuit_executor_available",
        lambda *_args, **_kwargs: True,
    )
    monkeypatch.setattr(
        "app.dependencies.task_submit.get_circuit_task_queue", lambda: QueueStub()
    )

    headers = _auth_headers("tester_circuit_submit_ok")
    response = client.post(
        "/api/tasks/circuit/submit",
        json={
            "num_qubits": 3,
            "operations": [
                {"gate": "h", "targets": [0]},
                {"gate": "cx", "controls": [0], "targets": [1]},
            ],
        },
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "PENDING"
    assert payload["task_type"] == "circuit"
    assert queued["task_name"] == RUN_CIRCUIT_TASK_NAME
    assert queued["task_id"] == payload["task_id"]

    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == payload["task_id"])).first()
        assert task is not None
        assert task.status == TaskStatus.PENDING
        assert task.task_type == TaskType.CIRCUIT
        assert task.code is None
        assert task.payload_json is not None
        assert json.loads(task.payload_json) == {
            "num_qubits": 3,
            "operations": [
                {"gate": "h", "targets": [0]},
                {"gate": "cx", "targets": [1], "controls": [0]},
            ],
        }


def teardown_module() -> None:
    client.close()
