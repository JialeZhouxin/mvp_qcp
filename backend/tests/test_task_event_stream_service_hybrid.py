from datetime import datetime

from sqlmodel import SQLModel, Session, create_engine

from app.models.task import Task, TaskStatus, TaskType
from app.services.task_event_stream_service import TaskEventStreamService


def test_list_changed_tasks_includes_hybrid_iteration_payload() -> None:
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        task = Task(
            tenant_id=1,
            user_id=2,
            task_type=TaskType.HYBRID,
            payload_json='{"algorithm":"vqe"}',
            status=TaskStatus.RUNNING,
            result_json=(
                '{"hybrid":{"current_iteration":3,"latest_objective":0.52,"best_objective":0.4,'
                '"iterations":[{"iteration":1,"objective":0.7,"best_objective":0.7,"current_best_gap":0.0},'
                '{"iteration":2,"objective":0.6,"best_objective":0.6,"current_best_gap":0.0},'
                '{"iteration":3,"objective":0.52,"best_objective":0.4,"current_best_gap":0.12}]}}'
            ),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            attempt_count=1,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        task_id = int(task.id or 0)

    service = TaskEventStreamService(session_factory=lambda: Session(engine))
    statuses, iterations, versions = service.list_changed_tasks(1, 2, {task_id}, {})

    assert len(statuses) == 1
    assert statuses[0].task_id == task_id
    assert len(iterations) == 3
    assert iterations[-1].task_id == task_id
    assert iterations[-1].iteration == 3
    assert iterations[-1].objective == 0.52
    assert iterations[-1].best_objective == 0.4
    assert iterations[-1].current_best_gap == 0.12
    assert task_id in versions
