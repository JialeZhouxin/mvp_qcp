from typing import Any

from app.services.execution.base import ExecutionBackend, ensure_positive_timeout
from app.services.sandbox import run_with_limits


class LocalExecutor(ExecutionBackend):
    # 仅用于测试/调试时显式启用，不作为默认执行路径。
    @property
    def name(self) -> str:
        return "local"

    def execute(self, code: str, timeout_seconds: int) -> Any:
        validated_timeout = ensure_positive_timeout(timeout_seconds)
        return run_with_limits(code, timeout_seconds=validated_timeout)
