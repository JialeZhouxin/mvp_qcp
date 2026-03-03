import json
from datetime import datetime

from celery.utils.log import get_task_logger
from sqlmodel import Session, select

from app.db.session import engine
from app.models.task import Task, TaskStatus
from app.services.qibo_executor import execute_qibo_script
from app.worker.celery_app import celery_app

logger = get_task_logger(__name__)


def _build_error_payload(code: str, message: str) -> dict[str, str]:
    return {"code": code, "message": message}


def _update_task(
    session: Session,
    task: Task,
    status: TaskStatus,
    error_payload: dict[str, str] | None = None,
    result: dict | None = None,
) -> None:
    task.status = status
    task.updated_at = datetime.utcnow()
    task.error_message = json.dumps(error_payload, ensure_ascii=False) if error_payload else None
    if status == TaskStatus.FAILURE:
        task.result_json = None
    elif result is not None:
        task.result_json = json.dumps(result, ensure_ascii=False)
    session.add(task)
    session.commit()


@celery_app.task(name="app.worker.tasks.run_quantum_task")
def run_quantum_task(task_id: int) -> dict:
    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == task_id)).first()
        if not task:
            logger.error("task not found: %s", task_id)
            raise ValueError(f"task not found: {task_id}")

        _update_task(session, task, TaskStatus.RUNNING)

        try:
            # 真实执行用户脚本：由 sandbox + qibo executor 返回标准化结果
            result = execute_qibo_script(task.code)
            result["task_id"] = task_id
            _update_task(session, task, TaskStatus.SUCCESS, result=result)
            return result
        except Exception as exc:  # pragma: no cover
            error_payload = _build_error_payload(code="WORKER_EXEC_ERROR", message=str(exc))
            _update_task(session, task, TaskStatus.FAILURE, error_payload=error_payload)
            raise
