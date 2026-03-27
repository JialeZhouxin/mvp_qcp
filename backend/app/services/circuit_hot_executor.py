from __future__ import annotations

import multiprocessing
from multiprocessing.connection import Connection
from threading import Lock

from app.core.config import settings
from app.services.circuit_execution import execute_circuit_payload


class CircuitHotExecutorError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _worker_main(connection: Connection, backend_name: str) -> None:
    import qibo

    try:
        qibo.set_backend(backend_name)
        execute_circuit_payload({"num_qubits": 1, "operations": []})
        connection.send({"ok": True, "event": "ready"})
    except Exception as exc:
        connection.send({"ok": False, "code": "CIRCUIT_EXECUTOR_INIT_FAILED", "message": str(exc)})
        return

    while True:
        message = connection.recv()
        if message["type"] == "shutdown":
            break
        if message["type"] != "execute":
            connection.send({"ok": False, "code": "CIRCUIT_EXECUTOR_PROTOCOL_ERROR", "message": "unsupported message"})
            continue
        try:
            result = execute_circuit_payload(message["payload"])
            connection.send({"ok": True, "result": result})
        except Exception as exc:
            code = getattr(exc, "code", "CIRCUIT_EXECUTOR_FAILED")
            connection.send({"ok": False, "code": code, "message": str(exc)})


class _CircuitHotWorker:
    def __init__(self, backend_name: str) -> None:
        self._backend_name = backend_name
        self._process: multiprocessing.Process | None = None
        self._parent_connection: Connection | None = None

    def start(self) -> None:
        if self.is_alive():
            return

        parent_connection, child_connection = multiprocessing.Pipe()
        start_method = "fork" if "fork" in multiprocessing.get_all_start_methods() else "spawn"
        process = multiprocessing.get_context(start_method).Process(
            target=_worker_main,
            args=(child_connection, self._backend_name),
            daemon=True,
        )
        process.start()
        self._process = process
        self._parent_connection = parent_connection

        if not parent_connection.poll(settings.circuit_exec_init_timeout_seconds):
            self.close()
            raise CircuitHotExecutorError("CIRCUIT_EXECUTOR_INIT_TIMEOUT", "circuit executor warmup timed out")

        response = parent_connection.recv()
        if not response.get("ok"):
            self.close()
            raise CircuitHotExecutorError(str(response.get("code")), str(response.get("message")))

    def is_alive(self) -> bool:
        return self._process is not None and self._process.is_alive()

    def execute(self, payload: dict, timeout_seconds: int) -> dict:
        self.start()
        assert self._parent_connection is not None
        self._parent_connection.send({"type": "execute", "payload": payload})
        if not self._parent_connection.poll(timeout_seconds):
            self.close()
            raise CircuitHotExecutorError("CIRCUIT_EXEC_TIMEOUT", "circuit execution timed out")
        response = self._parent_connection.recv()
        if not response.get("ok"):
            raise CircuitHotExecutorError(str(response.get("code")), str(response.get("message")))
        result = response.get("result")
        if not isinstance(result, dict):
            raise CircuitHotExecutorError("INVALID_EXEC_RESULT", "circuit execution result must be a dict")
        return result

    def close(self) -> None:
        if self._parent_connection is not None:
            try:
                self._parent_connection.send({"type": "shutdown"})
            except (BrokenPipeError, EOFError, OSError):
                pass
            self._parent_connection.close()
            self._parent_connection = None
        if self._process is not None:
            self._process.join(timeout=1)
            if self._process.is_alive():
                self._process.terminate()
                self._process.join(timeout=1)
            self._process = None


class CircuitHotExecutorPool:
    def __init__(self, backend_name: str, pool_size: int) -> None:
        self._workers = [_CircuitHotWorker(backend_name) for _ in range(pool_size)]
        self._lock = Lock()
        self._index = 0

    def start(self) -> None:
        for worker in self._workers:
            worker.start()

    def execute(self, payload: dict, timeout_seconds: int) -> dict:
        with self._lock:
            worker = self._workers[self._index]
            self._index = (self._index + 1) % len(self._workers)
        return worker.execute(payload, timeout_seconds)

    def close(self) -> None:
        for worker in self._workers:
            worker.close()


_pool: CircuitHotExecutorPool | None = None
_pool_lock = Lock()


def get_circuit_executor_pool() -> CircuitHotExecutorPool:
    global _pool
    with _pool_lock:
        if _pool is None:
            _pool = CircuitHotExecutorPool(
                backend_name=settings.circuit_exec_backend,
                pool_size=max(1, settings.circuit_exec_pool_size),
            )
        return _pool
