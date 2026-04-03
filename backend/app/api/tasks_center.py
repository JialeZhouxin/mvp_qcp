from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.api.auth import get_current_user
from app.api.task_center_presenters import (
    to_task_center_detail_response,
    to_task_center_list_response,
)
from app.api.task_center_streaming import stream_task_events
from app.db.session import get_session
from app.models.user import User
from app.schemas.task_center import TaskCenterDetailResponse, TaskCenterListResponse
from app.services.task_event_stream_service import TaskEventStreamService
from app.services.task_query_service import TaskQueryService
from app.use_cases.task_center_use_cases import (
    TaskCenterListQuery,
    TaskCenterQueryUseCase,
    TaskStatusStreamUseCase,
    parse_watched_task_ids,
)

router = APIRouter(prefix="/api/tasks", tags=["task-center"])

@router.get("", response_model=TaskCenterListResponse)
def get_task_list(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskCenterListResponse:
    use_case = TaskCenterQueryUseCase(TaskQueryService(session))
    try:
        return to_task_center_list_response(
            use_case.list_tasks(
                TaskCenterListQuery(
                    tenant_id=current_user.tenant_id,
                    user_id=current_user.id,
                    status_filter=status_filter,
                    limit=limit,
                    offset=offset,
                )
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{task_id}/detail", response_model=TaskCenterDetailResponse)
def get_task_detail(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskCenterDetailResponse:
    use_case = TaskCenterQueryUseCase(TaskQueryService(session))
    detail = use_case.get_task_detail(current_user.tenant_id, int(current_user.id or 0), task_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found")
    return to_task_center_detail_response(detail)


@router.get(
    "/stream",
    openapi_extra={
        "x-sse-events": {
            "task_status": "TaskStatusStreamEvent",
            "heartbeat": "TaskHeartbeatEvent",
            "hybrid_iteration": "HybridIterationStreamEvent",
        }
    },
)
async def stream_task_status(
    request: Request,
    task_ids: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    try:
        watched_task_ids = parse_watched_task_ids(task_ids)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    stream_use_case = TaskStatusStreamUseCase(TaskEventStreamService())

    return StreamingResponse(
        stream_task_events(
            request,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            watched_task_ids=watched_task_ids,
            use_case=stream_use_case,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
