from app.services.readiness_service import ReadinessService


def test_check_ready_sanitizes_dependency_errors(monkeypatch) -> None:
    service = ReadinessService()

    monkeypatch.setattr(service, "_check_database", lambda: {"ok": True})
    monkeypatch.setattr(service, "_check_redis", lambda: {"ok": False, "error": "redis://secret-host:6379"})
    monkeypatch.setattr(service, "_check_execution_backend", lambda: {"ok": True, "backend": "docker"})

    ready, payload = service.check_ready()

    assert ready is False
    redis_check = payload["checks"]["redis"]
    assert redis_check["ok"] is False
    assert redis_check["error"] == "dependency unavailable"
    assert "secret-host" not in str(payload)
