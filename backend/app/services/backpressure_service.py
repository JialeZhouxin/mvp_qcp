from app.core.config import settings
from app.queue.celery_queue import get_task_queue_depth


class QueueOverloadedError(RuntimeError):
    def __init__(self, depth: int, threshold: int) -> None:
        super().__init__(f"queue overloaded: depth={depth} threshold={threshold}")
        self.depth = depth
        self.threshold = threshold
        self.code = "QUEUE_OVERLOADED"


class BackpressureService:
    def __init__(self, max_depth: int) -> None:
        if max_depth <= 0:
            raise ValueError("max_depth must be positive")
        self.max_depth = max_depth

    @classmethod
    def from_settings(cls) -> "BackpressureService":
        return cls(max_depth=settings.queue_max_depth)

    def current_depth(self) -> int:
        return get_task_queue_depth()

    def ensure_submit_capacity(self) -> int:
        depth = self.current_depth()
        if depth > self.max_depth:
            raise QueueOverloadedError(depth=depth, threshold=self.max_depth)
        return depth
