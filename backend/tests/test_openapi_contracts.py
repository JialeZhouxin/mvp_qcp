from app.main import app


def test_openapi_exposes_task_stream_schemas_and_extension() -> None:
    openapi_schema = app.openapi()
    components = openapi_schema["components"]["schemas"]

    assert "TaskStatusStreamEvent" in components
    assert "TaskHeartbeatEvent" in components

    stream_operation = openapi_schema["paths"]["/api/tasks/stream"]["get"]
    assert stream_operation["x-sse-events"] == {
        "task_status": "TaskStatusStreamEvent",
        "heartbeat": "TaskHeartbeatEvent",
    }
