from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.api import auth_router, health_router, metrics_router, projects_router, tasks_center_router, tasks_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.schemas.task_stream import TaskHeartbeatEvent, TaskStatusStreamEvent


configure_logging()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(metrics_router)
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(tasks_center_router)
app.include_router(tasks_router)


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version="0.1.0",
        routes=app.routes,
    )
    components = openapi_schema.setdefault("components", {}).setdefault("schemas", {})
    components["TaskStatusStreamEvent"] = TaskStatusStreamEvent.model_json_schema(
        ref_template="#/components/schemas/{model}"
    )
    components["TaskHeartbeatEvent"] = TaskHeartbeatEvent.model_json_schema(
        ref_template="#/components/schemas/{model}"
    )
    app.openapi_schema = openapi_schema
    return openapi_schema


app.openapi = custom_openapi
