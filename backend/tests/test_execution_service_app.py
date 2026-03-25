from __future__ import annotations

from dataclasses import dataclass, field

from fastapi.testclient import TestClient

from app.execution_service_app import execution_service_app
from app.services.execution.base import ExecutionBackendError


@dataclass
class GatewayStub:
    name: str = "docker"
    health_payload: dict[str, object] = field(default_factory=lambda: {"ok": True, "backend": "docker"})
    execute_result: object = field(default_factory=lambda: {"counts": {"00": 2, "11": 2}})
    execute_error: Exception | None = None
    execute_calls: list[tuple[str, int]] = field(default_factory=list)

    def execute(self, code: str, timeout_seconds: int):
        self.execute_calls.append((code, timeout_seconds))
        if self.execute_error is not None:
            raise self.execute_error
        return self.execute_result

    def check_health(self) -> dict[str, object]:
        return self.health_payload


client = TestClient(execution_service_app)


def test_execution_service_health_reports_gateway_backend(monkeypatch) -> None:
    gateway = GatewayStub(health_payload={"ok": True, "backend": "docker"})
    monkeypatch.setattr("app.execution_service_app.get_execution_gateway", lambda: gateway)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "backend": "docker"}


def test_execution_service_execute_delegates_to_gateway(monkeypatch) -> None:
    gateway = GatewayStub(execute_result={"counts": {"00": 2, "11": 2}})
    monkeypatch.setattr("app.execution_service_app.get_execution_gateway", lambda: gateway)

    response = client.post(
        "/execute",
        json={
            "code": "def main():\n    return {'counts': {'00': 2, '11': 2}}",
            "timeout_seconds": 7,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"result": {"counts": {"00": 2, "11": 2}}}
    assert gateway.execute_calls == [("def main():\n    return {'counts': {'00': 2, '11': 2}}", 7)]


def test_execution_service_health_rejects_remote_backend_misconfiguration(monkeypatch) -> None:
    gateway = GatewayStub(name="remote", health_payload={"ok": True, "backend": "remote"})
    monkeypatch.setattr("app.execution_service_app.get_execution_gateway", lambda: gateway)

    response = client.get("/health")

    assert response.status_code == 500
    assert response.json()["detail"]["error"]["code"] == "EXECUTION_SERVICE_MISCONFIGURED"


def test_execution_service_execute_rejects_remote_backend_misconfiguration(monkeypatch) -> None:
    gateway = GatewayStub(name="remote")
    monkeypatch.setattr("app.execution_service_app.get_execution_gateway", lambda: gateway)

    response = client.post(
        "/execute",
        json={
            "code": "def main():\n    return {'counts': {'00': 1}}",
            "timeout_seconds": 5,
        },
    )

    assert response.status_code == 500
    assert response.json()["detail"]["error"]["code"] == "EXECUTION_SERVICE_MISCONFIGURED"


def test_execution_service_maps_validation_error(monkeypatch) -> None:
    gateway = GatewayStub(
        execute_error=ExecutionBackendError("SANDBOX_VALIDATION_ERROR", "import not allowed: os"),
    )
    monkeypatch.setattr("app.execution_service_app.get_execution_gateway", lambda: gateway)

    response = client.post(
        "/execute",
        json={
            "code": "import os\nRESULT = {'counts': {'00': 1}}",
            "timeout_seconds": 5,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "SANDBOX_VALIDATION_ERROR"


def test_execution_service_maps_execution_timeout(monkeypatch) -> None:
    gateway = GatewayStub(
        execute_error=ExecutionBackendError("EXECUTION_TIMEOUT", "execution timeout: 5s"),
    )
    monkeypatch.setattr("app.execution_service_app.get_execution_gateway", lambda: gateway)

    response = client.post(
        "/execute",
        json={
            "code": "def main():\n    return {'counts': {'00': 1}}",
            "timeout_seconds": 5,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "EXECUTION_TIMEOUT"


def test_execution_service_maps_infrastructure_error(monkeypatch) -> None:
    gateway = GatewayStub(
        execute_error=ExecutionBackendError("DOCKER_UNAVAILABLE", "docker daemon unavailable"),
    )
    monkeypatch.setattr("app.execution_service_app.get_execution_gateway", lambda: gateway)

    response = client.post(
        "/execute",
        json={
            "code": "def main():\n    return {'counts': {'00': 1}}",
            "timeout_seconds": 5,
        },
    )

    assert response.status_code == 500
    assert response.json()["detail"]["error"]["code"] == "DOCKER_UNAVAILABLE"
