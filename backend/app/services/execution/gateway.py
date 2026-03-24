from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from app.services.execution.base import ExecutionBackend
from app.services.execution.factory import get_execution_backend, reset_execution_backend_cache


class ExecutionGateway(Protocol):
    @property
    def name(self) -> str:
        ...

    def execute(self, code: str, timeout_seconds: int) -> Any:
        ...

    def check_health(self) -> dict[str, object]:
        ...


@dataclass(frozen=True)
class BackendExecutionGateway:
    backend: ExecutionBackend

    @property
    def name(self) -> str:
        return self.backend.name

    def execute(self, code: str, timeout_seconds: int) -> Any:
        return self.backend.execute(code, timeout_seconds=timeout_seconds)

    def check_health(self) -> dict[str, object]:
        client = getattr(self.backend, "_client", None)
        ping = getattr(client, "ping", None)
        if callable(ping):
            ping()
        return {"ok": True, "backend": self.name}


def get_execution_gateway() -> ExecutionGateway:
    return BackendExecutionGateway(backend=get_execution_backend())


def reset_execution_gateway_cache() -> None:
    reset_execution_backend_cache()
