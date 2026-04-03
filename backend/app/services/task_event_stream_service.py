import json
from datetime import datetime

from sqlmodel import select

from app.db.session import SessionFactory, create_session
from app.models.task import Task
from app.services.task_stream_models import (
    HybridIterationStreamPayload,
    TaskHeartbeatPayload,
    TaskStatusStreamPayload,
)

MAX_STREAM_TASKS = 200


class TaskEventStreamService:
    def __init__(
        self,
        poll_interval_seconds: float = 1.0,
        heartbeat_seconds: float = 10.0,
        session_factory: SessionFactory = create_session,
    ) -> None:
        self.poll_interval_seconds = poll_interval_seconds
        self.heartbeat_seconds = heartbeat_seconds
        self._session_factory = session_factory

    def list_changed_tasks(
        self,
        tenant_id: int,
        user_id: int,
        watched_task_ids: set[int] | None,
        versions: dict[int, str],
    ) -> tuple[list[TaskStatusStreamPayload], list[HybridIterationStreamPayload], dict[int, str]]:
        tasks = self._load_tasks(tenant_id, user_id, watched_task_ids)
        next_versions = dict(versions)
        changed: list[TaskStatusStreamPayload] = []
        hybrid_iterations: list[HybridIterationStreamPayload] = []
        for task in tasks:
            if task.id is None:
                continue
            version = self._to_version(task)
            if versions.get(task.id) != version:
                changed.append(self._to_event_payload(task))
                hybrid_iterations.extend(
                    self._to_hybrid_iteration_payloads(task, versions.get(task.id))
                )
            next_versions[task.id] = version
        return changed, hybrid_iterations, next_versions

    def build_heartbeat(self) -> TaskHeartbeatPayload:
        return TaskHeartbeatPayload(timestamp=datetime.utcnow())

    def _load_tasks(self, tenant_id: int, user_id: int, watched_task_ids: set[int] | None) -> list[Task]:
        statement = select(Task).where(Task.tenant_id == tenant_id, Task.user_id == user_id)
        if watched_task_ids:
            statement = statement.where(Task.id.in_(watched_task_ids))
        statement = statement.order_by(Task.updated_at.desc()).limit(MAX_STREAM_TASKS)
        with self._session_factory() as session:
            return list(session.exec(statement).all())

    def _to_version(self, task: Task) -> str:
        current_iteration = self._extract_hybrid_iteration(task.result_json)
        return "|".join(
            [
                task.status.value,
                task.updated_at.isoformat(),
                str(task.attempt_count),
                str(task.duration_ms),
                str(current_iteration if current_iteration is not None else -1),
            ]
        )

    def _to_event_payload(self, task: Task) -> TaskStatusStreamPayload:
        return TaskStatusStreamPayload(
            task_id=task.id or 0,
            status=task.status.value,
            updated_at=task.updated_at,
            duration_ms=task.duration_ms,
            attempt_count=task.attempt_count,
        )

    def _extract_hybrid_iteration(self, raw_result: str | None) -> int | None:
        if not raw_result:
            return None
        try:
            parsed = json.loads(raw_result)
        except json.JSONDecodeError:
            return None
        if not isinstance(parsed, dict):
            return None
        hybrid = parsed.get("hybrid")
        if not isinstance(hybrid, dict):
            return None
        iterations_raw = hybrid.get("iterations")
        if isinstance(iterations_raw, list):
            max_iteration: int | None = None
            for item in iterations_raw:
                if not isinstance(item, dict):
                    continue
                value = item.get("iteration")
                if isinstance(value, int):
                    max_iteration = value if max_iteration is None else max(max_iteration, value)
            if max_iteration is not None:
                return max_iteration
        iteration = hybrid.get("current_iteration")
        return iteration if isinstance(iteration, int) else None

    def _to_hybrid_iteration_payloads(
        self,
        task: Task,
        previous_version: str | None,
    ) -> list[HybridIterationStreamPayload]:
        if not task.result_json:
            return []
        try:
            parsed = json.loads(task.result_json)
        except json.JSONDecodeError:
            return []
        if not isinstance(parsed, dict):
            return []
        hybrid = parsed.get("hybrid")
        if not isinstance(hybrid, dict):
            return []

        previous_iteration = self._parse_previous_iteration(previous_version)
        iterations_raw = hybrid.get("iterations")
        payloads: list[HybridIterationStreamPayload] = []
        if isinstance(iterations_raw, list):
            for item in iterations_raw:
                if not isinstance(item, dict):
                    continue
                iteration_value = item.get("iteration")
                if not isinstance(iteration_value, int) or iteration_value <= previous_iteration:
                    continue
                objective = item.get("objective")
                best_objective = item.get("best_objective")
                if objective is None or best_objective is None:
                    continue
                current_best_gap = item.get("current_best_gap")
                if current_best_gap is None:
                    current_best_gap = max(0.0, float(objective) - float(best_objective))
                payloads.append(
                    HybridIterationStreamPayload(
                        task_id=task.id or 0,
                        iteration=iteration_value,
                        objective=float(objective),
                        best_objective=float(best_objective),
                        current_best_gap=float(current_best_gap),
                        updated_at=task.updated_at,
                    )
                )
            payloads.sort(key=lambda item: item.iteration)
            if payloads:
                return payloads

        current_iteration = hybrid.get("current_iteration")
        if not isinstance(current_iteration, int) or current_iteration <= previous_iteration:
            return []
        latest_objective = hybrid.get("latest_objective")
        best_objective = hybrid.get("best_objective")
        if latest_objective is None or best_objective is None:
            return []
        current_best_gap = hybrid.get("current_best_gap")
        if current_best_gap is None:
            current_best_gap = max(0.0, float(latest_objective) - float(best_objective))
        return [
            HybridIterationStreamPayload(
                task_id=task.id or 0,
                iteration=current_iteration,
                objective=float(latest_objective),
                best_objective=float(best_objective),
                current_best_gap=float(current_best_gap),
                updated_at=task.updated_at,
            )
        ]

    def _parse_previous_iteration(self, previous_version: str | None) -> int:
        if not previous_version:
            return -1
        parts = previous_version.split("|")
        if not parts:
            return -1
        try:
            return int(parts[-1])
        except ValueError:
            return -1
