from app.core.config import settings
from app.queue.celery_queue import get_task_queue_depth


class QueueOverloadedError(RuntimeError):
    def __init__(self, depth: int, threshold: int) -> None:
        super().__init__(f"queue overloaded: depth={depth} threshold={threshold}")
        self.depth = depth
        self.threshold = threshold
        self.code = "QUEUE_OVERLOADED"


class BackpressureService:
    def __init__(self, max_depth: int, queue_name: str | None = None) -> None:
        if max_depth <= 0:
            raise ValueError("max_depth must be positive")
        self.max_depth = max_depth
        self.queue_name = queue_name

    @classmethod
    def from_settings(cls, queue_name: str | None = None) -> "BackpressureService":
        return cls(max_depth=settings.queue_max_depth, queue_name=queue_name)

    def current_depth(self) -> int:
        return get_task_queue_depth(queue_name=self.queue_name)

    def ensure_submit_capacity(self) -> int:
        depth = self.current_depth()
        if depth > self.max_depth:
            raise QueueOverloadedError(depth=depth, threshold=self.max_depth)
        return depth
