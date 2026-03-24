from __future__ import annotations

from fastapi.testclient import TestClient

from app.execution_service_app import execution_service_app


client = TestClient(execution_service_app)


def test_execution_service_health_contract() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "backend": "remote"}


def test_execution_service_execute_success() -> None:
    response = client.post(
        "/execute",
        json={
            "code": "def main():\n    return {'counts': {'00': 2, '11': 2}}",
            "timeout_seconds": 5,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"result": {"counts": {"00": 2, "11": 2}}}


def test_execution_service_maps_validation_error() -> None:
    response = client.post(
        "/execute",
        json={
            "code": "import os\nRESULT = {'counts': {'00': 1}}",
            "timeout_seconds": 5,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "SANDBOX_VALIDATION_ERROR"


def test_execution_service_maps_runtime_error() -> None:
    response = client.post(
        "/execute",
        json={
            "code": "def main():\n    raise RuntimeError('boom')",
            "timeout_seconds": 5,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "SANDBOX_EXECUTION_ERROR"
