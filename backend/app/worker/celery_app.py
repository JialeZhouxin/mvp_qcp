from __future__ import annotations

from celery import Celery

from app.core.config import settings


celery_app = Celery(
    "qcp",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_default_queue=settings.task_queue_name,
    task_create_missing_queues=True,
    broker_connection_retry_on_startup=True,
)

celery_app.conf.imports = ("app.worker.celery_tasks", "app.worker.circuit_tasks")

# Import task registrations eagerly so worker startup and tests share the same task registry.
import app.worker.celery_tasks  # noqa: F401,E402
import app.worker.circuit_tasks  # noqa: F401,E402
