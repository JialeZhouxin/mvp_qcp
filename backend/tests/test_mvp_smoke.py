import os
from pathlib import Path

from fastapi.testclient import TestClient
from sqlmodel import Session, select

# 测试环境使用独立数据库，避免污染开发数据
os.environ["DATABASE_URL"] = "sqlite:///./data/test_qcp.db"

from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.task import Task, TaskStatus  # noqa: E402


client = TestClient(app)


def _auth_headers(username: str, password: str = "pass123456") -> dict[str, str]:
    client.post("/api/auth/register", json={"username": username, "password": password})
    login_resp = client.post("/api/auth/login", json={"username": username, "password": password})
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

    register_resp = client.post("/api/auth/register", json={"username": username, "password": password})
    assert register_resp.status_code in (200, 409)

    login_resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "Bearer"


def test_task_submit_and_query_contract() -> None:
    headers = _auth_headers("tester_task")

    sample_code = "def main():\n    return {'counts': {'00': 10, '11': 6}}"
    submit_resp = client.post(
        "/api/tasks/submit",
        json={"code": sample_code},
        headers=headers,
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

    def fake_delay(task_id: int) -> None:
        queued["task_id"] = task_id

    monkeypatch.setattr("app.api.tasks.run_quantum_task.delay", fake_delay)

    headers = _auth_headers("tester_queue_ok")
    code = "def main():\n    return {'counts': {'00': 3, '11': 1}}"
    submit_resp = client.post("/api/tasks/submit", json={"code": code}, headers=headers)

    assert submit_resp.status_code == 200
    payload = submit_resp.json()
    assert payload["status"] == "PENDING"
    assert queued["task_id"] == payload["task_id"]

    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == payload["task_id"])).first()
        assert task is not None
        assert task.status == TaskStatus.PENDING


def test_task_submit_queue_failure_marks_task_failed(monkeypatch) -> None:
    def fake_delay_fail(_: int) -> None:
        raise RuntimeError("redis unavailable")

    monkeypatch.setattr("app.api.tasks.run_quantum_task.delay", fake_delay_fail)

    headers = _auth_headers("tester_queue_fail")
    code = "def main():\n    return {'counts': {'00': 1, '11': 1}}  # queue-fail-case"
    submit_resp = client.post("/api/tasks/submit", json={"code": code}, headers=headers)

    assert submit_resp.status_code == 503
    assert submit_resp.json()["detail"] == "任务入队失败"

    with Session(engine) as session:
        tasks = session.exec(select(Task).where(Task.code == code)).all()
        assert len(tasks) >= 1
        task = tasks[-1]
        assert task.status == TaskStatus.FAILURE
        assert task.error_message is not None
        assert "QUEUE_PUBLISH_ERROR" in task.error_message


def test_task_status_isolation_by_owner(monkeypatch) -> None:
    def fake_delay(_: int) -> None:
        return None

    monkeypatch.setattr("app.api.tasks.run_quantum_task.delay", fake_delay)

    owner_headers = _auth_headers("tester_owner")
    other_headers = _auth_headers("tester_other")
    code = "def main():\n    return {'counts': {'00': 8, '11': 8}}"

    submit_resp = client.post("/api/tasks/submit", json={"code": code}, headers=owner_headers)
    assert submit_resp.status_code == 200
    task_id = submit_resp.json()["task_id"]

    owner_status = client.get(f"/api/tasks/{task_id}", headers=owner_headers)
    assert owner_status.status_code == 200

    other_status = client.get(f"/api/tasks/{task_id}", headers=other_headers)
    assert other_status.status_code == 404
    assert other_status.json()["detail"] == "任务不存在"


def teardown_module() -> None:
    # 清理测试数据库文件
    db_path = Path("E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/data/test_qcp.db")
    if db_path.exists():
        db_path.unlink()
