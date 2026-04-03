import os

from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://qcp:QcpDev_2026_Strong!@127.0.0.1:5432/qcp_test"
)

from app.main import app  # noqa: E402

client = TestClient(app)


def test_health_live_endpoint_contract() -> None:
    response = client.get("/api/health/live")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "app" in payload
    assert "env" in payload


def test_health_ready_returns_503_when_unready(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.health.readiness_service.check_ready",
        lambda: (
            False,
            {
                "status": "degraded",
                "checks": {
                    "database": {"ok": True},
                    "redis": {"ok": False, "error": "redis down"},
                    "execution_backend": {"ok": True},
                },
            },
        ),
    )

    response = client.get("/api/health/ready")

    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["status"] == "degraded"
    assert detail["checks"]["redis"]["ok"] is False


def test_metrics_endpoint_returns_parseable_text(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.metrics.metrics_service.render_metrics_text",
        lambda: "# TYPE qcp_task_success_total counter\nqcp_task_success_total 5\n",
    )

    response = client.get("/api/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "qcp_task_success_total 5" in response.text


def teardown_module() -> None:
    client.close()
