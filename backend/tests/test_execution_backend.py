from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace

import pytest
from requests.exceptions import ReadTimeout

from app.core.config import settings
from app.services.execution.base import ExecutionBackendError
from app.services.execution.docker_executor import DockerExecutor
from app.services.execution.factory import get_execution_backend, reset_execution_backend_cache
from app.services.execution.gateway import (
    BackendExecutionGateway,
    get_execution_gateway,
    reset_execution_gateway_cache,
)
from app.services.execution.local_executor import LocalExecutor


@dataclass
class FakeContainer:
    wait_result: dict | None = None
    wait_exception: Exception | None = None
    stdout_text: str = ""
    stderr_text: str = ""
    started: bool = False
    stopped: bool = False
    removed: bool = False

    def start(self) -> None:
        self.started = True

    def wait(self, timeout: int) -> dict:
        if self.wait_exception is not None:
            raise self.wait_exception
        assert self.wait_result is not None
        return self.wait_result

    def logs(self, stdout: bool, stderr: bool) -> bytes:
        if stdout and not stderr:
            return self.stdout_text.encode("utf-8")
        if stderr and not stdout:
            return self.stderr_text.encode("utf-8")
        return b""

    def stop(self, timeout: int) -> None:
        self.stopped = True

    def remove(self, force: bool) -> None:
        self.removed = force


class FakeContainerManager:
    def __init__(self, container: FakeContainer) -> None:
        self._container = container
        self.created_image = ""
        self.created_kwargs: dict = {}

    def create(self, image: str, **kwargs):
        self.created_image = image
        self.created_kwargs = kwargs
        return self._container


def _build_executor(container: FakeContainer) -> tuple[DockerExecutor, FakeContainerManager]:
    manager = FakeContainerManager(container)
    fake_client = SimpleNamespace(containers=manager)
    executor = DockerExecutor(
        image="qcp-backend-dev:latest",
        runner_module="app.services.execution.runner",
        read_only_rootfs=True,
        network_disabled=True,
        mem_limit_mb=256,
        cpu_limit=0.5,
        pids_limit=64,
        tmpfs_size_mb=64,
        client_factory=lambda: fake_client,
    )
    return executor, manager


@pytest.fixture(autouse=True)
def _reset_backend_selector() -> None:
    original_backend = settings.execution_backend
    reset_execution_backend_cache()
    reset_execution_gateway_cache()
    yield
    settings.execution_backend = original_backend
    reset_execution_backend_cache()
    reset_execution_gateway_cache()


def test_docker_executor_success_and_cleanup() -> None:
    container = FakeContainer(wait_result={"StatusCode": 0}, stdout_text='{"ok": true, "result": {"counts": {"00": 2}}}')
    executor, manager = _build_executor(container)

    result = executor.execute("def main():\n    return {'counts': {'00': 2}}", timeout_seconds=10)

    assert container.started is True
    assert container.removed is True
    assert result == {"counts": {"00": 2}}
    assert manager.created_image == "qcp-backend-dev:latest"
    assert manager.created_kwargs["network_disabled"] is True
    assert manager.created_kwargs["read_only"] is True


def test_docker_executor_timeout_stops_container() -> None:
    container = FakeContainer(wait_exception=ReadTimeout("wait timed out"))
    executor, _ = _build_executor(container)

    with pytest.raises(ExecutionBackendError) as exc_info:
        executor.execute("RESULT = {}", timeout_seconds=1)

    assert exc_info.value.code == "EXECUTION_TIMEOUT"
    assert container.stopped is True
    assert container.removed is True


def test_docker_executor_maps_runner_error_payload() -> None:
    payload = '{"ok": false, "error": {"code": "SANDBOX_VALIDATION_ERROR", "message": "import not allowed"}}'
    container = FakeContainer(wait_result={"StatusCode": 2}, stdout_text=payload)
    executor, _ = _build_executor(container)

    with pytest.raises(ExecutionBackendError) as exc_info:
        executor.execute("import os", timeout_seconds=10)

    assert exc_info.value.code == "SANDBOX_VALIDATION_ERROR"
    assert "import not allowed" in exc_info.value.message


def test_docker_executor_invalid_output_is_error() -> None:
    container = FakeContainer(wait_result={"StatusCode": 0}, stdout_text="not-json")
    executor, _ = _build_executor(container)

    with pytest.raises(ExecutionBackendError) as exc_info:
        executor.execute("RESULT = {'counts': {'00': 1}}", timeout_seconds=10)

    assert exc_info.value.code == "INVALID_EXEC_OUTPUT"


def test_factory_selects_local_backend() -> None:
    settings.execution_backend = "local"
    reset_execution_backend_cache()

    backend = get_execution_backend()

    assert isinstance(backend, LocalExecutor)


def test_factory_rejects_unknown_backend() -> None:
    settings.execution_backend = "unknown"
    reset_execution_backend_cache()

    with pytest.raises(ValueError, match="unsupported execution backend"):
        get_execution_backend()


def test_gateway_delegates_to_selected_backend() -> None:
    settings.execution_backend = "local"
    reset_execution_backend_cache()
    reset_execution_gateway_cache()

    gateway = get_execution_gateway()

    assert isinstance(gateway, BackendExecutionGateway)
    assert gateway.name == "local"


def test_backend_execution_gateway_reports_backend_health() -> None:
    class ClientStub:
        def __init__(self) -> None:
            self.called = False

        def ping(self) -> None:
            self.called = True

    class BackendStub:
        name = "docker"

        def __init__(self) -> None:
            self._client = ClientStub()

        def execute(self, code: str, timeout_seconds: int) -> dict[str, object]:
            return {"code": code, "timeout": timeout_seconds}

    gateway = BackendExecutionGateway(backend=BackendStub())

    payload = gateway.check_health()

    assert payload == {"ok": True, "backend": "docker"}
    assert gateway.backend._client.called is True
