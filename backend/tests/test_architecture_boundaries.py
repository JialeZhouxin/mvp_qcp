from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _read(*parts: str) -> str:
    return (ROOT / Path(*parts)).read_text(encoding="utf-8")


def test_tasks_api_does_not_bind_queue_worker_or_direct_sql_queries() -> None:
    source = _read("app", "api", "tasks.py")

    assert "from app.queue.rq_queue import get_task_queue" not in source
    assert "from app.worker.tasks import run_quantum_task" not in source
    assert "select(" not in source
    assert "TaskSubmitService(" not in source


def test_task_use_cases_do_not_depend_on_fastapi_or_infrastructure_modules() -> None:
    source = _read("app", "use_cases", "task_use_cases.py")

    assert "from fastapi" not in source
    assert "HTTPException" not in source
    assert "from app.queue" not in source
    assert "from app.worker" not in source
    assert "select(" not in source
    assert "from app.models.task import Task" not in source
    assert "from sqlmodel import Session" not in source


def test_services_do_not_depend_on_http_schema_models() -> None:
    for relative_path in (
        ("app", "services", "task_query_service.py"),
        ("app", "services", "task_event_stream_service.py"),
        ("app", "services", "auth_service.py"),
    ):
        source = _read(*relative_path)
        assert "from app.schemas" not in source
        assert "TaskCenterListResponse" not in source
        assert "TaskCenterDetailResponse" not in source
        assert "TaskStatusStreamEvent" not in source
        assert "TaskHeartbeatEvent" not in source


def test_auth_service_does_not_depend_on_fastapi_http_layer() -> None:
    source = _read("app", "services", "auth_service.py")

    assert "from fastapi" not in source
    assert "HTTPException" not in source
    assert "status.HTTP_" not in source


def test_runtime_services_do_not_create_sessions_from_global_engine() -> None:
    for relative_path in (
        ("app", "services", "task_event_stream_service.py"),
        ("app", "services", "metrics_service.py"),
        ("app", "services", "readiness_service.py"),
    ):
        source = _read(*relative_path)
        assert "from app.db.session import engine" not in source
        assert "Session(engine)" not in source


def test_task_event_stream_service_uses_explicit_stream_models() -> None:
    source = _read("app", "services", "task_event_stream_service.py")

    assert "tuple[list[dict[str, Any]], dict[int, str]]" not in source
    assert "def build_heartbeat(self) -> dict[str, str]" not in source
    assert '"task_id": task.id or 0' not in source


def test_task_submit_provider_is_not_kept_under_use_cases() -> None:
    assert not (ROOT / "app" / "use_cases" / "task_submit_provider.py").exists()

    tasks_api_source = _read("app", "api", "tasks.py")
    assert "from app.dependencies.task_submit import build_submit_task_use_case" in tasks_api_source


def test_legacy_task_query_compatibility_service_is_removed() -> None:
    assert not (ROOT / "app" / "services" / "user_task_query_service.py").exists()
