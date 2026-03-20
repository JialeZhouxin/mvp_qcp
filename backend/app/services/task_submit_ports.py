from datetime import datetime
from typing import Any, Callable, Protocol

from app.services.backpressure_service import BackpressureService


class TaskQueuePort(Protocol):
    def enqueue(self, func: Callable[..., Any], task_id: int, job_timeout: int) -> Any:
        ...


QueueGetter = Callable[[], TaskQueuePort]
WorkerTask = Callable[[int], dict[str, Any]]
BackpressureFactory = Callable[[], BackpressureService]
NowProvider = Callable[[], datetime]
