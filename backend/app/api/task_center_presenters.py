import json

from pydantic import BaseModel

from app.schemas.task_center import TaskCenterDetailResponse, TaskCenterListResponse
from app.services.task_query_models import TaskDetailView, TaskDiagnosticView, TaskListView


def to_sse(event: str, payload: BaseModel) -> str:
    return f"event: {event}\ndata: {json.dumps(payload.model_dump(mode='json'), ensure_ascii=False)}\n\n"


def to_task_center_list_response(view: TaskListView) -> TaskCenterListResponse:
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


def to_task_center_detail_response(view: TaskDetailView) -> TaskCenterDetailResponse:
    diagnostic = None
    if view.diagnostic is not None:
        diagnostic = to_task_diagnostic(view.diagnostic)
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


def to_task_diagnostic(view: TaskDiagnosticView) -> dict[str, object]:
    return {
        "code": view.code,
        "message": view.message,
        "phase": view.phase,
        "summary": view.summary,
        "suggestions": view.suggestions,
    }
