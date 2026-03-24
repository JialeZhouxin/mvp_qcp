from sqlmodel import SQLModel, Session, create_engine

from app.models.task import Task, TaskStatus
from app.services.task_query_service import TaskAccessDeniedError, TaskNotFoundError, TaskQueryService


def test_task_query_service_returns_status_and_result_views() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        task = Task(
            user_id=7,
            code="def main():\n    return {'counts': {'00': 1}}",
            status=TaskStatus.SUCCESS,
            result_json='{"counts": {"00": 1}}',
            error_message='{"code":"EXECUTION_TIMEOUT","message":"late"}',
            attempt_count=1,
        )
        session.add(task)
        session.commit()
        session.refresh(task)

        service = TaskQueryService(session)

        status_view = service.get_status_view(7, int(task.id or 0))
        result_view = service.get_result_view(7, int(task.id or 0))

        assert status_view.task_id == task.id
        assert status_view.status == "SUCCESS"
        assert status_view.error_message == {"code": "EXECUTION_TIMEOUT", "message": "late"}
        assert result_view.result == {"counts": {"00": 1}}
        assert result_view.message is None


def test_task_query_service_enforces_owner_isolation() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        task = Task(
            user_id=11,
            code="def main():\n    return {'counts': {'00': 1}}",
            status=TaskStatus.PENDING,
            attempt_count=1,
        )
        session.add(task)
        session.commit()
        session.refresh(task)

        service = TaskQueryService(session)

        try:
            service.get_status_view(12, int(task.id or 0))
        except TaskAccessDeniedError:
            pass
        else:
            raise AssertionError("expected TaskAccessDeniedError")

        try:
            service.get_result_view(11, 999999)
        except TaskNotFoundError:
            pass
        else:
            raise AssertionError("expected TaskNotFoundError")
