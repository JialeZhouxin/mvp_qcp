from sqlmodel import Session

from app.models.task import Task, TaskStatus


class TaskSubmitPersistence:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create_pending_task(self, user_id: int, code: str) -> Task:
        task = Task(user_id=user_id, code=code, status=TaskStatus.PENDING)
        self._session.add(task)
        self._session.commit()
        self._session.refresh(task)
        return task
