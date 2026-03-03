import os
from pathlib import Path

from fastapi.testclient import TestClient

# 测试环境使用独立数据库，避免污染开发数据
os.environ["DATABASE_URL"] = "sqlite:///./data/test_qcp.db"

from app.main import app  # noqa: E402


client = TestClient(app)


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
    username = "tester_task"
    password = "pass123456"

    client.post("/api/auth/register", json={"username": username, "password": password})
    login_resp = client.post("/api/auth/login", json={"username": username, "password": password})
    token = login_resp.json()["access_token"]

    sample_code = "def main():\n    return {'counts': {'00': 10, '11': 6}}"
    submit_resp = client.post(
        "/api/tasks/submit",
        json={"code": sample_code},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submit_resp.status_code in (200, 503)

    if submit_resp.status_code == 200:
        task_id = submit_resp.json()["task_id"]

        status_resp = client.get(f"/api/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"})
        assert status_resp.status_code == 200
        assert "status" in status_resp.json()

        result_resp = client.get(f"/api/tasks/{task_id}/result", headers={"Authorization": f"Bearer {token}"})
        assert result_resp.status_code == 200
        assert "status" in result_resp.json()


def teardown_module() -> None:
    # 清理测试数据库文件
    db_path = Path("E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/data/test_qcp.db")
    if db_path.exists():
        db_path.unlink()
