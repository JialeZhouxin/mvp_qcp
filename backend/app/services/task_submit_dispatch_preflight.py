import logging

from app.services.backpressure_service import QueueOverloadedError
from app.services.task_submit_ports import BackpressureFactory
from app.services.task_submit_shared import TaskSubmitOverloadedError

logger = logging.getLogger(__name__)


class TaskDispatchPreflight:
    def __init__(self, backpressure_factory: BackpressureFactory) -> None:
        self._backpressure_factory = backpressure_factory

    def ensure_submit_capacity(self, user_id: int) -> int:
        backpressure = self._backpressure_factory()
        try:
            return backpressure.ensure_submit_capacity()
        except QueueOverloadedError as exc:
            logger.warning(
                "event=task_submit_overloaded user_id=%s queue_depth=%s queue_threshold=%s",
                user_id,
                exc.depth,
                exc.threshold,
            )
            raise TaskSubmitOverloadedError(code=exc.code, depth=exc.depth, threshold=exc.threshold) from exc
