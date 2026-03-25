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
from app.use_cases.project_use_cases import GetProjectUseCase, ListProjectsUseCase, ProjectDetailView, ProjectItemView, UpsertProjectUseCase

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


def _to_project_item_response(view: ProjectItemView) -> ProjectItemResponse:
    return _to_project_item(view.id, view.name, view.entry_type, view.last_task_id, view.updated_at)


def _to_project_detail_response(view: ProjectDetailView) -> ProjectDetailResponse:
    return ProjectDetailResponse(**_to_project_item_response(view).model_dump(), payload=view.payload)


@router.put("/{name}", response_model=ProjectDetailResponse)
def upsert_project(
    name: str,
    payload: ProjectSaveRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProjectDetailResponse:
    use_case = UpsertProjectUseCase(session)
    try:
        project = use_case.execute(
            current_user.tenant_id,
            int(current_user.id or 0),
            name,
            payload.entry_type,
            payload.payload,
            payload.last_task_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_project_detail_response(project)


@router.get("", response_model=ProjectListResponse)
def list_projects(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProjectListResponse:
    projects = ListProjectsUseCase(session).execute(current_user.tenant_id, int(current_user.id or 0), limit=limit, offset=offset)
    return ProjectListResponse(
        projects=[_to_project_item_response(project) for project in projects]
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProjectDetailResponse:
    use_case = GetProjectUseCase(session)
    project = use_case.execute(current_user.tenant_id, int(current_user.id or 0), project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    return _to_project_detail_response(project)
