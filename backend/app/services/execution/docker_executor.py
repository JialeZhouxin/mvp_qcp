import base64
import json
import time
from collections.abc import Callable
from typing import Any

import docker
from docker.errors import DockerException, ImageNotFound, NotFound
from requests.exceptions import ReadTimeout

from app.services.execution.base import ExecutionBackend, ExecutionBackendError, ensure_positive_timeout

LOG_PREVIEW_LIMIT = 500


def _decode_logs(raw: bytes | None) -> str:
    if not raw:
        return ""
    return raw.decode("utf-8", errors="replace").strip()


def _truncate_log(text: str) -> str:
    if len(text) <= LOG_PREVIEW_LIMIT:
        return text
    return f"{text[:LOG_PREVIEW_LIMIT]}..."


class DockerExecutor(ExecutionBackend):
    def __init__(
        self,
        image: str,
        runner_module: str,
        read_only_rootfs: bool,
        network_disabled: bool,
        mem_limit_mb: int,
        cpu_limit: float,
        pids_limit: int,
        tmpfs_size_mb: int,
        client_factory: Callable[[], Any] | None = None,
    ) -> None:
        self.image = image
        self.runner_module = runner_module
        self.read_only_rootfs = read_only_rootfs
        self.network_disabled = network_disabled
        self.mem_limit_mb = mem_limit_mb
        self.cpu_limit = cpu_limit
        self.pids_limit = pids_limit
        self.tmpfs_size_mb = tmpfs_size_mb
        self._client_factory = client_factory or docker.from_env

    @property
    def name(self) -> str:
        return "docker"

    def execute(self, code: str, timeout_seconds: int) -> Any:
        timeout_seconds = ensure_positive_timeout(timeout_seconds)
        container = None
        start_time = time.monotonic()
        try:
            container = self._create_container(code, timeout_seconds)
            container.start()
            wait_result = self._wait_container(container, timeout_seconds)
            stdout_text, stderr_text = self._read_container_logs(container)
            return self._parse_execution_result(wait_result, stdout_text, stderr_text, start_time)
        except ImageNotFound as exc:
            raise ExecutionBackendError("EXEC_IMAGE_NOT_FOUND", str(exc)) from exc
        except DockerException as exc:
            raise ExecutionBackendError("DOCKER_UNAVAILABLE", str(exc)) from exc
        finally:
            if container is not None:
                self._cleanup_container(container)

    def _create_container(self, code: str, timeout_seconds: int) -> Any:
        env_vars = {
            "EXEC_CODE_B64": base64.b64encode(code.encode("utf-8")).decode("ascii"),
            "EXEC_TIMEOUT_SECONDS": str(timeout_seconds),
        }
        create_kwargs = self._build_create_kwargs(env_vars)
        client = self._client_factory()
        return client.containers.create(self.image, **create_kwargs)

    def _build_create_kwargs(self, env_vars: dict[str, str]) -> dict[str, Any]:
        return {
            "command": ["python", "-m", self.runner_module],
            "detach": True,
            "environment": env_vars,
            "network_disabled": self.network_disabled,
            "read_only": self.read_only_rootfs,
            "mem_limit": f"{self.mem_limit_mb}m",
            "nano_cpus": int(self.cpu_limit * 1_000_000_000),
            "pids_limit": self.pids_limit,
            "tmpfs": {"/tmp": f"rw,nosuid,noexec,size={self.tmpfs_size_mb}m"},
            "auto_remove": False,
        }

    def _wait_container(self, container: Any, timeout_seconds: int) -> dict[str, Any]:
        try:
            result = container.wait(timeout=timeout_seconds)
            if not isinstance(result, dict):
                raise ExecutionBackendError("CONTAINER_WAIT_ERROR", "invalid container wait result")
            return result
        except ReadTimeout as exc:
            self._stop_container(container)
            raise ExecutionBackendError("EXECUTION_TIMEOUT", f"execution timeout: {timeout_seconds}s") from exc

    def _stop_container(self, container: Any) -> None:
        try:
            container.stop(timeout=1)
        except DockerException:
            pass

    def _read_container_logs(self, container: Any) -> tuple[str, str]:
        stdout_text = _decode_logs(container.logs(stdout=True, stderr=False))
        stderr_text = _decode_logs(container.logs(stdout=False, stderr=True))
        return stdout_text, stderr_text

    def _parse_execution_result(
        self,
        wait_result: dict[str, Any],
        stdout_text: str,
        stderr_text: str,
        start_time: float,
    ) -> Any:
        exit_code = int(wait_result.get("StatusCode", 1))
        payload = self._parse_payload(stdout_text)
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        if payload is not None:
            return self._handle_payload(payload, exit_code, stderr_text, elapsed_ms)
        if exit_code != 0:
            raise ExecutionBackendError(
                "CONTAINER_EXIT_ERROR",
                f"container exited with code {exit_code}",
                metadata={"exit_code": exit_code, "stderr": _truncate_log(stderr_text), "elapsed_ms": elapsed_ms},
            )
        raise ExecutionBackendError("INVALID_EXEC_OUTPUT", "container output is not parseable")

    def _parse_payload(self, stdout_text: str) -> dict[str, Any] | None:
        for line in reversed(stdout_text.splitlines()):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                payload = json.loads(stripped)
            except json.JSONDecodeError:
                continue
            if isinstance(payload, dict) and "ok" in payload:
                return payload
        return None

    def _handle_payload(
        self,
        payload: dict[str, Any],
        exit_code: int,
        stderr_text: str,
        elapsed_ms: int,
    ) -> Any:
        if payload.get("ok") is True:
            return payload.get("result")
        error_payload = payload.get("error")
        error_data = error_payload if isinstance(error_payload, dict) else {}
        code = str(error_data.get("code", "CONTAINER_EXEC_ERROR"))
        message = str(error_data.get("message", "container execution failed"))
        metadata = {"exit_code": exit_code, "stderr": _truncate_log(stderr_text), "elapsed_ms": elapsed_ms}
        raise ExecutionBackendError(code, message, metadata=metadata)

    def _cleanup_container(self, container: Any) -> None:
        try:
            container.remove(force=True)
        except NotFound:
            return
        except DockerException:
            return
