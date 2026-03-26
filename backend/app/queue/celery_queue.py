from __future__ import annotations

from collections.abc import Callable
from typing import Protocol

from app.core.config import settings
from app.queue.redis_conn import get_redis_connection


class CeleryAppPort(Protocol):
    def send_task(
        self,
        name: str,
        *,
        args: tuple[int, ...],
        queue: str,
        time_limit: int,
    ) -> object:
        ...


class RedisDepthPort(Protocol):
    def llen(self, key: str) -> int:
        ...


def get_celery_app() -> CeleryAppPort:
    from app.worker.celery_app import celery_app

    return celery_app


class CeleryQueueAdapter:
    def __init__(
        self,
        queue_name: str,
        app_getter: Callable[[], CeleryAppPort] = get_celery_app,
    ) -> None:
        self._queue_name = queue_name
        self._app_getter = app_getter

    def enqueue(self, task_name: str, task_id: int, job_timeout: int) -> object:
        app = self._app_getter()
        return app.send_task(
            task_name,
            args=(task_id,),
            queue=self._queue_name,
            time_limit=job_timeout,
        )


def get_task_queue() -> CeleryQueueAdapter:
    return CeleryQueueAdapter(queue_name=settings.task_queue_name)


def get_circuit_task_queue() -> CeleryQueueAdapter:
    return CeleryQueueAdapter(queue_name=settings.circuit_task_queue_name)


def get_task_queue_depth(
    redis_getter: Callable[[], RedisDepthPort] = get_redis_connection,
    queue_name: str | None = None,
) -> int:
    redis = redis_getter()
    depth = redis.llen(queue_name or settings.task_queue_name)
    return int(depth)
