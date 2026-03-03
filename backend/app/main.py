from fastapi import FastAPI

from app.api import auth_router, health_router, tasks_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.session import init_db


configure_logging()
app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def on_startup() -> None:
    # 启动时初始化数据库表结构，为后续鉴权和任务流转做准备
    init_db()


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(tasks_router)
