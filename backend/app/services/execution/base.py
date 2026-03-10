from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class ExecutionBackendError(RuntimeError):
    def __init__(self, code: str, message: str, metadata: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.metadata = metadata or {}

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.metadata:
            payload["metadata"] = self.metadata
        return payload


class ExecutionBackend(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def execute(self, code: str, timeout_seconds: int) -> Any:
        raise NotImplementedError


def ensure_positive_timeout(timeout_seconds: int) -> int:
    if timeout_seconds <= 0:
        raise ValueError("timeout_seconds must be positive")
    return timeout_seconds
