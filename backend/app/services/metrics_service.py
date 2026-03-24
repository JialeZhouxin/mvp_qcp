import math

from sqlmodel import select

from app.db.session import SessionFactory, create_session
from app.models.task import Task, TaskStatus
from app.queue.celery_queue import get_task_queue_depth


def _percentile(values: list[int], ratio: float) -> int:
    if not values:
        return 0
    sorted_values = sorted(values)
    index = max(0, math.ceil(ratio * len(sorted_values)) - 1)
    return sorted_values[index]


class MetricsService:
    def __init__(self, session_factory: SessionFactory = create_session) -> None:
        self._session_factory = session_factory

    def render_metrics_text(self) -> str:
        with self._session_factory() as session:
            tasks = session.exec(select(Task)).all()

        success_count = sum(1 for task in tasks if task.status == TaskStatus.SUCCESS)
        failure_count = sum(1 for task in tasks if task.status == TaskStatus.FAILURE)
        timeout_count = sum(1 for task in tasks if task.status == TaskStatus.TIMEOUT)
        retry_exhausted_count = sum(1 for task in tasks if task.status == TaskStatus.RETRY_EXHAUSTED)
        retry_total = sum(max(task.attempt_count - 1, 0) for task in tasks)
        duration_values = [task.duration_ms for task in tasks if task.duration_ms is not None]

        duration_count = len(duration_values)
        duration_sum = sum(duration_values)
        duration_avg = int(duration_sum / duration_count) if duration_count > 0 else 0
        duration_p95 = _percentile(duration_values, 0.95)

        lines = [
            "# TYPE qcp_task_success_total counter",
            f"qcp_task_success_total {success_count}",
            "# TYPE qcp_task_failure_total counter",
            f"qcp_task_failure_total {failure_count}",
            "# TYPE qcp_task_timeout_total counter",
            f"qcp_task_timeout_total {timeout_count}",
            "# TYPE qcp_task_retry_exhausted_total counter",
            f"qcp_task_retry_exhausted_total {retry_exhausted_count}",
            "# TYPE qcp_task_retry_total counter",
            f"qcp_task_retry_total {retry_total}",
            "# TYPE qcp_task_queue_depth gauge",
            f"qcp_task_queue_depth {get_task_queue_depth()}",
            "# TYPE qcp_task_duration_ms_count gauge",
            f"qcp_task_duration_ms_count {duration_count}",
            "# TYPE qcp_task_duration_ms_sum gauge",
            f"qcp_task_duration_ms_sum {duration_sum}",
            "# TYPE qcp_task_duration_ms_avg gauge",
            f"qcp_task_duration_ms_avg {duration_avg}",
            "# TYPE qcp_task_duration_ms_p95 gauge",
            f"qcp_task_duration_ms_p95 {duration_p95}",
            "",
        ]
        return "\n".join(lines)
