from dataclasses import dataclass

from app.services.task_event_stream_service import TaskEventStreamService
from app.services.task_query_models import TaskDetailView, TaskListView
from app.services.task_query_service import TaskQueryService


def parse_watched_task_ids(task_ids: str | None) -> set[int] | None:
    if task_ids is None:
        return None
    normalized = task_ids.strip()
    if not normalized:
        return None
    parsed: set[int] = set()
    for segment in normalized.split(","):
        value = segment.strip()
        if not value:
            continue
        if not value.isdigit():
            raise ValueError(f"invalid task id: {value}")
        parsed.add(int(value))
    return parsed or None


@dataclass(frozen=True)
class TaskCenterListQuery:
    user_id: int
    status_filter: str | None
    limit: int
    offset: int


class TaskCenterQueryUseCase:
    def __init__(self, service: TaskQueryService) -> None:
        self._service = service

    def list_tasks(self, query: TaskCenterListQuery) -> TaskListView:
        return self._service.list_tasks(
            query.user_id,
            query.status_filter,
            query.limit,
            query.offset,
        )

    def get_task_detail(self, user_id: int, task_id: int) -> TaskDetailView | None:
        return self._service.get_task_detail(user_id, task_id)


class TaskStatusStreamUseCase:
    def __init__(self, service: TaskEventStreamService) -> None:
        self._service = service

    @property
    def poll_interval_seconds(self) -> float:
        return self._service.poll_interval_seconds

    @property
    def heartbeat_seconds(self) -> float:
        return self._service.heartbeat_seconds

    def poll(
        self,
        user_id: int,
        watched_task_ids: set[int] | None,
        versions: dict[int, str],
    ):
        return self._service.list_changed_tasks(user_id, watched_task_ids, versions)

    def build_heartbeat(self):
        return self._service.build_heartbeat()
