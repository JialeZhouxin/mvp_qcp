from app.schemas.task import TaskResultResponse, TaskStatusResponse, TaskSubmitResponse
from app.services.task_submit_shared import TaskSubmitOutcome
from app.services.user_task_query_service import UserTaskResultView, UserTaskStatusView


def to_task_submit_response(outcome: TaskSubmitOutcome) -> TaskSubmitResponse:
    return TaskSubmitResponse(task_id=outcome.task_id, status=outcome.status, deduplicated=outcome.deduplicated)


def to_task_status_response(view: UserTaskStatusView) -> TaskStatusResponse:
    return TaskStatusResponse(
        task_id=view.task_id,
        status=view.status,
        error_message=view.error_message,
    )


def to_task_result_response(view: UserTaskResultView) -> TaskResultResponse:
    return TaskResultResponse(
        task_id=view.task_id,
        status=view.status,
        result=view.result,
        message=view.message,
    )
