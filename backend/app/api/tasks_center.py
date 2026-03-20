import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session

from app.api.auth import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.task_center import TaskCenterDetailResponse, TaskCenterListResponse
from app.services.task_event_stream_service import TaskEventStreamService
from app.services.task_query_service import TaskQueryService
from app.services.task_query_models import TaskDetailView, TaskDiagnosticView, TaskListView

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


def _to_sse(event: str, payload: BaseModel) -> str:
    return f"event: {event}\ndata: {json.dumps(payload.model_dump(mode='json'), ensure_ascii=False)}\n\n"


def _to_task_center_list_response(view: TaskListView) -> TaskCenterListResponse:
    return TaskCenterListResponse(
        items=[
            {
                "task_id": item.task_id,
                "status": item.status,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
                "duration_ms": item.duration_ms,
                "attempt_count": item.attempt_count,
                "has_result": item.has_result,
            }
            for item in view.items
        ],
        total=view.total,
        limit=view.limit,
        offset=view.offset,
    )


def _to_task_center_detail_response(view: TaskDetailView) -> TaskCenterDetailResponse:
    diagnostic = None
    if view.diagnostic is not None:
        diagnostic = _to_task_diagnostic(view.diagnostic)
    return TaskCenterDetailResponse(
        task_id=view.task_id,
        status=view.status,
        created_at=view.created_at,
        updated_at=view.updated_at,
        started_at=view.started_at,
        finished_at=view.finished_at,
        duration_ms=view.duration_ms,
        attempt_count=view.attempt_count,
        result=view.result,
        diagnostic=diagnostic,
    )


def _to_task_diagnostic(view: TaskDiagnosticView) -> dict[str, object]:
    return {
        "code": view.code,
        "message": view.message,
        "phase": view.phase,
        "summary": view.summary,
        "suggestions": view.suggestions,
    }


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
        return _to_task_center_list_response(service.list_tasks(current_user.id, status_filter, limit, offset))
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
    return _to_task_center_detail_response(detail)


@router.get(
    "/stream",
    openapi_extra={
        "x-sse-events": {
            "task_status": "TaskStatusStreamEvent",
            "heartbeat": "TaskHeartbeatEvent",
        }
    },
)
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
