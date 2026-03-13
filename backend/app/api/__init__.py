from app.api.auth import get_current_user, router as auth_router
from app.api.health import router as health_router
from app.api.metrics import router as metrics_router
from app.api.projects import router as projects_router
from app.api.tasks_center import router as tasks_center_router
from app.api.tasks import router as tasks_router

__all__ = [
    "health_router",
    "metrics_router",
    "auth_router",
    "projects_router",
    "tasks_center_router",
    "tasks_router",
    "get_current_user",
]
