import asyncio
from collections.abc import AsyncIterator

from fastapi import Request

from app.api.task_center_presenters import (
    to_sse,
    to_task_heartbeat_event,
    to_task_status_stream_event,
)
from app.use_cases.task_center_use_cases import TaskStatusStreamUseCase


async def stream_task_events(
    request: Request,
    *,
    user_id: int,
    watched_task_ids: set[int] | None,
    use_case: TaskStatusStreamUseCase,
) -> AsyncIterator[str]:
    versions: dict[int, str] = {}
    idle_seconds = 0.0

    while True:
        if await request.is_disconnected():
            break

        events, versions = use_case.poll(user_id, watched_task_ids, versions)
        if events:
            for event_payload in events:
                yield to_sse("task_status", to_task_status_stream_event(event_payload))
            idle_seconds = 0.0
        else:
            idle_seconds += use_case.poll_interval_seconds

        if idle_seconds >= use_case.heartbeat_seconds:
            yield to_sse("heartbeat", to_task_heartbeat_event(use_case.build_heartbeat()))
            idle_seconds = 0.0

        await asyncio.sleep(use_case.poll_interval_seconds)
