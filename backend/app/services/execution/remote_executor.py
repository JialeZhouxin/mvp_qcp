from __future__ import annotations

from typing import Any

import requests
from requests import Response
from requests.exceptions import RequestException, Timeout

from app.services.execution.base import ExecutionBackend, ExecutionBackendError, ensure_positive_timeout


class RemoteExecutor(ExecutionBackend):
    def __init__(
        self,
        service_url: str,
        request_timeout_seconds: int,
        session: requests.Session | None = None,
    ) -> None:
        self.service_url = service_url.rstrip("/")
        self.request_timeout_seconds = request_timeout_seconds
        self._session = session or requests.Session()

    @property
    def name(self) -> str:
        return "remote"

    def execute(self, code: str, timeout_seconds: int) -> Any:
        validated_timeout = ensure_positive_timeout(timeout_seconds)
        base_url = self._validated_base_url()
        payload = {"code": code, "timeout_seconds": validated_timeout}
        try:
            response = self._session.post(
                f"{base_url}/execute",
                json=payload,
                timeout=self.request_timeout_seconds,
            )
        except Timeout as exc:
            raise ExecutionBackendError("REMOTE_EXECUTION_TIMEOUT", str(exc)) from exc
        except RequestException as exc:
            raise ExecutionBackendError("REMOTE_EXECUTION_UNAVAILABLE", str(exc)) from exc

        return self._parse_execute_response(response)

    def check_health(self) -> dict[str, object]:
        base_url = self._validated_base_url()
        try:
            response = self._session.get(f"{base_url}/health", timeout=self.request_timeout_seconds)
        except Timeout as exc:
            raise ExecutionBackendError("REMOTE_EXECUTION_TIMEOUT", str(exc)) from exc
        except RequestException as exc:
            raise ExecutionBackendError("REMOTE_EXECUTION_UNAVAILABLE", str(exc)) from exc

        if response.status_code >= 400:
            raise ExecutionBackendError(
                "REMOTE_EXECUTION_UNHEALTHY",
                f"remote execution health returned {response.status_code}",
            )

        return {"ok": True, "backend": self.name}

    def _validated_base_url(self) -> str:
        if not self.service_url:
            raise ExecutionBackendError(
                "REMOTE_EXECUTION_NOT_CONFIGURED",
                "execution_service_url is required for remote execution backend",
            )
        return self.service_url

    def _parse_execute_response(self, response: Response) -> Any:
        try:
            payload = response.json()
        except ValueError as exc:
            raise ExecutionBackendError("INVALID_EXEC_OUTPUT", "remote execution response is not valid JSON") from exc

        if not isinstance(payload, dict):
            raise ExecutionBackendError("INVALID_EXEC_OUTPUT", "remote execution response must be a JSON object")

        if response.status_code >= 400:
            error_payload = payload.get("error")
            if isinstance(error_payload, dict):
                code = str(error_payload.get("code", "REMOTE_EXECUTION_ERROR"))
                message = str(error_payload.get("message", f"remote execution failed with {response.status_code}"))
                raise ExecutionBackendError(code, message)
            raise ExecutionBackendError(
                "REMOTE_EXECUTION_ERROR",
                f"remote execution failed with status {response.status_code}",
            )

        result = payload.get("result")
        if result is None:
            raise ExecutionBackendError("INVALID_EXEC_OUTPUT", "remote execution response missing result")
        return result
