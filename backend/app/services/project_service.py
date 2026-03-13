import json
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.models.project import Project

PROJECT_NAME_MAX_LENGTH = 80


def _validate_project_name(name: str) -> str:
    normalized = name.strip()
    if not normalized:
        raise ValueError("project name is empty")
    if len(normalized) > PROJECT_NAME_MAX_LENGTH:
        raise ValueError("project name is too long")
    return normalized


class ProjectService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert_project(
        self,
        user_id: int,
        name: str,
        entry_type: str,
        payload: dict[str, Any],
        last_task_id: int | None,
        now: datetime | None = None,
    ) -> Project:
        persisted_at = now or datetime.utcnow()
        project_name = _validate_project_name(name)
        existing = self._load_by_name(user_id, project_name)
        if existing is None:
            project = Project(
                user_id=user_id,
                name=project_name,
                entry_type=entry_type,
                payload_json=json.dumps(payload, ensure_ascii=False),
                last_task_id=last_task_id,
                created_at=persisted_at,
                updated_at=persisted_at,
            )
        else:
            project = existing
            project.entry_type = entry_type
            project.payload_json = json.dumps(payload, ensure_ascii=False)
            project.last_task_id = last_task_id
            project.updated_at = persisted_at
        self._persist(project)
        return project

    def list_projects(self, user_id: int, limit: int, offset: int) -> list[Project]:
        statement = (
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self._session.exec(statement).all())

    def get_project(self, user_id: int, project_id: int) -> Project | None:
        statement = select(Project).where(Project.id == project_id, Project.user_id == user_id)
        return self._session.exec(statement).first()

    def decode_payload(self, project: Project) -> dict[str, Any]:
        try:
            payload = json.loads(project.payload_json)
        except json.JSONDecodeError as exc:
            raise ValueError("project payload is corrupted") from exc
        if not isinstance(payload, dict):
            raise ValueError("project payload must be a JSON object")
        return payload

    def _load_by_name(self, user_id: int, name: str) -> Project | None:
        statement = select(Project).where(Project.user_id == user_id, Project.name == name)
        return self._session.exec(statement).first()

    def _persist(self, project: Project) -> None:
        self._session.add(project)
        self._session.commit()
        self._session.refresh(project)
