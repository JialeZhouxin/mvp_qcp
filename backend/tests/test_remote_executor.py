from __future__ import annotations

import pytest
from requests.exceptions import ConnectionError, Timeout

from app.services.execution.base import ExecutionBackendError
from app.services.execution.remote_executor import RemoteExecutor


class ResponseStub:
    def __init__(self, status_code: int, payload) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


class SessionStub:
    def __init__(self) -> None:
        self.post_response: ResponseStub | Exception | None = None
        self.get_response: ResponseStub | Exception | None = None
        self.calls: list[tuple[str, str, object, int]] = []

    def post(self, url: str, json: dict[str, object], timeout: int):
        self.calls.append(("POST", url, json, timeout))
        if isinstance(self.post_response, Exception):
            raise self.post_response
        assert self.post_response is not None
        return self.post_response

    def get(self, url: str, timeout: int):
        self.calls.append(("GET", url, None, timeout))
        if isinstance(self.get_response, Exception):
            raise self.get_response
        assert self.get_response is not None
        return self.get_response


def test_remote_executor_requires_service_url() -> None:
    executor = RemoteExecutor(service_url="", request_timeout_seconds=10, session=SessionStub())

    with pytest.raises(ExecutionBackendError, match="execution_service_url is required"):
        executor.execute("def main():\n    return {'counts': {'00': 1}}", timeout_seconds=5)


def test_remote_executor_posts_execute_request() -> None:
    session = SessionStub()
    session.post_response = ResponseStub(200, {"result": {"counts": {"00": 2}}})
    executor = RemoteExecutor(
        service_url="http://executor.internal/",
        request_timeout_seconds=10,
        session=session,
    )

    result = executor.execute("def main():\n    return {'counts': {'00': 2}}", timeout_seconds=7)

    assert result == {"counts": {"00": 2}}
    assert session.calls == [
        (
            "POST",
            "http://executor.internal/execute",
            {"code": "def main():\n    return {'counts': {'00': 2}}", "timeout_seconds": 7},
            10,
        )
    ]


def test_remote_executor_maps_remote_error_payload() -> None:
    session = SessionStub()
    session.post_response = ResponseStub(
        503,
        {"error": {"code": "REMOTE_BUSY", "message": "executor busy"}},
    )
    executor = RemoteExecutor(service_url="http://executor.internal", request_timeout_seconds=10, session=session)

    with pytest.raises(ExecutionBackendError) as exc_info:
        executor.execute("RESULT = {}", timeout_seconds=5)

    assert exc_info.value.code == "REMOTE_BUSY"
    assert exc_info.value.message == "executor busy"


def test_remote_executor_maps_connection_failures() -> None:
    session = SessionStub()
    session.post_response = ConnectionError("connection refused")
    executor = RemoteExecutor(service_url="http://executor.internal", request_timeout_seconds=10, session=session)

    with pytest.raises(ExecutionBackendError) as exc_info:
        executor.execute("RESULT = {}", timeout_seconds=5)

    assert exc_info.value.code == "REMOTE_EXECUTION_UNAVAILABLE"


def test_remote_executor_maps_timeouts() -> None:
    session = SessionStub()
    session.post_response = Timeout("timed out")
    executor = RemoteExecutor(service_url="http://executor.internal", request_timeout_seconds=10, session=session)

    with pytest.raises(ExecutionBackendError) as exc_info:
        executor.execute("RESULT = {}", timeout_seconds=5)

    assert exc_info.value.code == "REMOTE_EXECUTION_TIMEOUT"


def test_remote_executor_health_check_calls_health_endpoint() -> None:
    session = SessionStub()
    session.get_response = ResponseStub(200, {"status": "ok"})
    executor = RemoteExecutor(service_url="http://executor.internal", request_timeout_seconds=10, session=session)

    payload = executor.check_health()

    assert payload == {"ok": True, "backend": "remote"}
    assert session.calls == [("GET", "http://executor.internal/health", None, 10)]
