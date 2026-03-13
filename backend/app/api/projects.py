from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.auth import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.project import (
    ProjectDetailResponse,
    ProjectEntryType,
    ProjectItemResponse,
    ProjectListResponse,
    ProjectSaveRequest,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _to_entry_type(entry_type: str) -> ProjectEntryType:
    if entry_type not in {"code", "circuit"}:
        raise ValueError(f"unsupported entry type: {entry_type}")
    return entry_type


def _to_project_item(project_id: int, name: str, entry_type: str, last_task_id: int | None, updated_at):
    return ProjectItemResponse(
        id=project_id,
        name=name,
        entry_type=_to_entry_type(entry_type),
        last_task_id=last_task_id,
        updated_at=updated_at,
    )


@router.put("/{name}", response_model=ProjectDetailResponse)
def upsert_project(
    name: str,
    payload: ProjectSaveRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProjectDetailResponse:
    service = ProjectService(session)
    try:
        project = service.upsert_project(
            user_id=current_user.id,
            name=name,
            entry_type=payload.entry_type,
            payload=payload.payload,
            last_task_id=payload.last_task_id,
        )
        project_payload = service.decode_payload(project)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ProjectDetailResponse(
        **_to_project_item(
            project_id=project.id or 0,
            name=project.name,
            entry_type=project.entry_type,
            last_task_id=project.last_task_id,
            updated_at=project.updated_at,
        ).model_dump(),
        payload=project_payload,
    )


@router.get("", response_model=ProjectListResponse)
def list_projects(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProjectListResponse:
    service = ProjectService(session)
    projects = service.list_projects(current_user.id, limit=limit, offset=offset)
    return ProjectListResponse(
        projects=[
            _to_project_item(
                project_id=project.id or 0,
                name=project.name,
                entry_type=project.entry_type,
                last_task_id=project.last_task_id,
                updated_at=project.updated_at,
            )
            for project in projects
        ]
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProjectDetailResponse:
    service = ProjectService(session)
    project = service.get_project(current_user.id, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    try:
        payload = service.decode_payload(project)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    return ProjectDetailResponse(
        **_to_project_item(
            project_id=project.id or 0,
            name=project.name,
            entry_type=project.entry_type,
            last_task_id=project.last_task_id,
            updated_at=project.updated_at,
        ).model_dump(),
        payload=payload,
    )
