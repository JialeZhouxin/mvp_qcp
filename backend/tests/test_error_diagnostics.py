from app.services.error_diagnostic_service import build_task_diagnostic, normalize_task_diagnostic
from app.services.task_error_payload import build_error_payload


def test_build_task_diagnostic_for_timeout() -> None:
    payload = build_task_diagnostic("EXECUTION_TIMEOUT", "execution timeout: 60s")

    assert payload["code"] == "EXECUTION_TIMEOUT"
    assert payload["phase"] == "EXECUTION"
    assert "超时" in payload["summary"]
    assert len(payload["suggestions"]) >= 1


def test_normalize_task_diagnostic_keeps_custom_fields() -> None:
    payload = normalize_task_diagnostic(
        {
            "code": "QUEUE_PUBLISH_ERROR",
            "message": "redis unavailable",
            "phase": "QUEUE",
            "summary": "自定义摘要",
            "suggestions": ["自定义建议1", "自定义建议2"],
        }
    )

    assert payload["phase"] == "QUEUE"
    assert payload["summary"] == "自定义摘要"
    assert payload["suggestions"] == ["自定义建议1", "自定义建议2"]


def test_build_error_payload_returns_structured_diagnostic() -> None:
    payload = build_error_payload("SANDBOX_VALIDATION_ERROR", "blocked import")

    assert payload["code"] == "SANDBOX_VALIDATION_ERROR"
    assert payload["phase"] == "EXECUTION"
    assert isinstance(payload["suggestions"], list)
