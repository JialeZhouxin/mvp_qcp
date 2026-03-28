from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.services.circuit_hot_executor import _CircuitHotWorker, CircuitHotExecutorError


class _ParentConnectionStub:
    def __init__(self) -> None:
        self.poll_calls: list[int] = []
        self.closed = False

    def poll(self, timeout: int) -> bool:
        self.poll_calls.append(timeout)
        return False

    def send(self, _message: object) -> None:
        return None

    def close(self) -> None:
        self.closed = True


class _ChildConnectionStub:
    pass


class _ProcessStub:
    def __init__(self) -> None:
        self.started = False
        self.terminated = False
        self.join_calls: list[int] = []

    def start(self) -> None:
        self.started = True

    def join(self, timeout: int | None = None) -> None:
        self.join_calls.append(timeout if timeout is not None else -1)

    def is_alive(self) -> bool:
        return True

    def terminate(self) -> None:
        self.terminated = True


def test_circuit_hot_worker_uses_dedicated_init_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    original_exec_timeout = settings.circuit_exec_timeout_seconds
    original_init_timeout = settings.circuit_exec_init_timeout_seconds
    parent = _ParentConnectionStub()
    child = _ChildConnectionStub()
    process = _ProcessStub()

    monkeypatch.setattr(settings, "circuit_exec_timeout_seconds", 60)
    monkeypatch.setattr(settings, "circuit_exec_init_timeout_seconds", 180)
    monkeypatch.setattr("app.services.circuit_hot_executor.multiprocessing.Pipe", lambda: (parent, child))
    monkeypatch.setattr(
        "app.services.circuit_hot_executor.multiprocessing.get_all_start_methods",
        lambda: ["spawn"],
    )
    monkeypatch.setattr(
        "app.services.circuit_hot_executor.multiprocessing.get_context",
        lambda _method: SimpleNamespace(Process=lambda **_kwargs: process),
    )

    worker = _CircuitHotWorker("numpy")

    with pytest.raises(CircuitHotExecutorError) as exc_info:
        worker.start()

    assert exc_info.value.code == "CIRCUIT_EXECUTOR_INIT_TIMEOUT"
    assert parent.poll_calls == [180]
    assert process.started is True

    monkeypatch.setattr(settings, "circuit_exec_timeout_seconds", original_exec_timeout)
    monkeypatch.setattr(settings, "circuit_exec_init_timeout_seconds", original_init_timeout)


def test_circuit_hot_worker_falls_back_to_direct_execution_when_pipe_creation_is_denied(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {
        "num_qubits": 2,
        "operations": [{"gate": "rzz", "targets": [0, 1], "params": [0.7]}],
    }

    monkeypatch.setattr(
        "app.services.circuit_hot_executor.multiprocessing.Pipe",
        lambda: (_ for _ in ()).throw(PermissionError("[WinError 5] 拒绝访问。")),
    )

    worker = _CircuitHotWorker("numpy")

    result = worker.execute(payload, timeout_seconds=5)

    assert "probabilities" in result
    assert result["probabilities"]["00"] == pytest.approx(1.0)
