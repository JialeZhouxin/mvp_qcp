from datetime import datetime
from typing import Any, Callable, Protocol

from app.services.backpressure_service import BackpressureService


class TaskQueuePort(Protocol):
    def enqueue(self, task_name: str, task_id: int, job_timeout: int) -> Any:
        ...


QueueGetter = Callable[[], TaskQueuePort]
WorkerTaskName = str
BackpressureFactory = Callable[[], BackpressureService]
NowProvider = Callable[[], datetime]
