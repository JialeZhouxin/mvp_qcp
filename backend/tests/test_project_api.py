import os

from fastapi.testclient import TestClient
from sqlmodel import SQLModel

os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://qcp:QcpDev_2026_Strong!@127.0.0.1:5432/qcp_test"
)
from app.db.session import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402


SQLModel.metadata.drop_all(engine)
init_db()
client = TestClient(app)


def _auth_headers(username: str, password: str = "pass123456") -> dict[str, str]:
    client.post("/api/auth/register", json={"username": username, "password": password})
    response = client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_project_upsert_and_list() -> None:
    headers = _auth_headers("project_owner")
    create = client.put(
        "/api/projects/bell-demo",
        json={
            "entry_type": "code",
            "payload": {"code": "def main():\n    return {'counts': {'00': 1}}"},
            "last_task_id": 1,
        },
        headers=headers,
    )
    assert create.status_code == 200
    assert create.json()["name"] == "bell-demo"

    overwrite = client.put(
        "/api/projects/bell-demo",
        json={
            "entry_type": "code",
            "payload": {"code": "def main():\n    return {'counts': {'11': 1}}"},
            "last_task_id": 2,
        },
        headers=headers,
    )
    assert overwrite.status_code == 200
    assert overwrite.json()["last_task_id"] == 2

    listing = client.get("/api/projects?limit=20&offset=0", headers=headers)
    assert listing.status_code == 200
    projects = listing.json()["projects"]
    assert len(projects) == 1
    assert projects[0]["name"] == "bell-demo"


def test_project_isolation_by_user() -> None:
    owner_headers = _auth_headers("project_owner_iso")
    other_headers = _auth_headers("project_other_iso")

    created = client.put(
        "/api/projects/owner-only",
        json={
            "entry_type": "code",
            "payload": {"code": "def main():\n    return {'counts': {'00': 1}}"},
        },
        headers=owner_headers,
    )
    project_id = created.json()["id"]

    other_get = client.get(f"/api/projects/{project_id}", headers=other_headers)
    assert other_get.status_code == 404
    assert other_get.json()["detail"] == "project not found"


def teardown_module() -> None:
    client.close()
