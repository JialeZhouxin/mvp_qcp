import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.api.auth import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.task_center import TaskCenterDetailResponse, TaskCenterListResponse
from app.services.task_event_stream_service import TaskEventStreamService
from app.services.task_query_service import TaskQueryService

router = APIRouter(prefix="/api/tasks", tags=["task-center"])


def _parse_task_ids(task_ids: str | None) -> set[int] | None:
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


def _to_sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.get("", response_model=TaskCenterListResponse)
def get_task_list(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskCenterListResponse:
    service = TaskQueryService(session)
    try:
        return service.list_tasks(current_user.id, status_filter, limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{task_id}/detail", response_model=TaskCenterDetailResponse)
def get_task_detail(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskCenterDetailResponse:
    service = TaskQueryService(session)
    detail = service.get_task_detail(current_user.id, task_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found")
    return detail


@router.get("/stream")
async def stream_task_status(
    request: Request,
    task_ids: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    try:
        watched_task_ids = _parse_task_ids(task_ids)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    stream_service = TaskEventStreamService()

    async def event_generator() -> AsyncIterator[str]:
        versions: dict[int, str] = {}
        idle_seconds = 0.0
        while True:
            if await request.is_disconnected():
                break
            events, versions = stream_service.list_changed_tasks(current_user.id, watched_task_ids, versions)
            if events:
                for event_payload in events:
                    yield _to_sse("task_status", event_payload)
                idle_seconds = 0.0
            else:
                idle_seconds += stream_service.poll_interval_seconds
            if idle_seconds >= stream_service.heartbeat_seconds:
                yield _to_sse("heartbeat", stream_service.build_heartbeat())
                idle_seconds = 0.0
            await asyncio.sleep(stream_service.poll_interval_seconds)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
