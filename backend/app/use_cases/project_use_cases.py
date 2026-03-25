from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlmodel import Session

from app.services.project_service import ProjectService


@dataclass(frozen=True)
class ProjectItemView:
    id: int
    name: str
    entry_type: str
    last_task_id: int | None
    updated_at: datetime


@dataclass(frozen=True)
class ProjectDetailView(ProjectItemView):
    payload: dict[str, Any]


class UpsertProjectUseCase:
    def __init__(self, session: Session) -> None:
        self._service = ProjectService(session)

    def execute(
        self,
        tenant_id: int,
        user_id: int,
        name: str,
        entry_type: str,
        payload: dict[str, Any],
        last_task_id: int | None,
    ) -> ProjectDetailView:
        project = self._service.upsert_project(
            tenant_id=tenant_id,
            user_id=user_id,
            name=name,
            entry_type=entry_type,
            payload=payload,
            last_task_id=last_task_id,
        )
        return ProjectDetailView(
            id=project.id or 0,
            name=project.name,
            entry_type=project.entry_type,
            last_task_id=project.last_task_id,
            updated_at=project.updated_at,
            payload=self._service.decode_payload(project),
        )


class ListProjectsUseCase:
    def __init__(self, session: Session) -> None:
        self._service = ProjectService(session)

    def execute(self, tenant_id: int, user_id: int, limit: int, offset: int) -> list[ProjectItemView]:
        return [
            ProjectItemView(
                id=project.id or 0,
                name=project.name,
                entry_type=project.entry_type,
                last_task_id=project.last_task_id,
                updated_at=project.updated_at,
            )
            for project in self._service.list_projects(tenant_id, user_id, limit=limit, offset=offset)
        ]


class GetProjectUseCase:
    def __init__(self, session: Session) -> None:
        self._service = ProjectService(session)

    def execute(self, tenant_id: int, user_id: int, project_id: int) -> ProjectDetailView | None:
        project = self._service.get_project(tenant_id, user_id, project_id)
        if project is None:
            return None
        return ProjectDetailView(
            id=project.id or 0,
            name=project.name,
            entry_type=project.entry_type,
            last_task_id=project.last_task_id,
            updated_at=project.updated_at,
            payload=self._service.decode_payload(project),
        )
