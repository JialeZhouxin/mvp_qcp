from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from threading import Event, Thread
from typing import Protocol

from app.core.config import settings
from app.queue.redis_conn import get_redis_connection


class RedisHeartbeatPort(Protocol):
    def set(self, name: str, value: str, ex: int) -> object:
        ...

    def exists(self, name: str) -> int:
        ...


def publish_circuit_executor_heartbeat(
    redis_getter: Callable[[], RedisHeartbeatPort] = get_redis_connection,
    now_provider: Callable[[], datetime] = datetime.utcnow,
) -> None:
    redis = redis_getter()
    redis.set(
        settings.circuit_exec_heartbeat_key,
        now_provider().isoformat(),
        ex=settings.circuit_exec_heartbeat_ttl_seconds,
    )


def is_circuit_executor_available(
    redis_getter: Callable[[], RedisHeartbeatPort] = get_redis_connection,
) -> bool:
    try:
        redis = redis_getter()
        return bool(redis.exists(settings.circuit_exec_heartbeat_key))
    except Exception:
        return False


class CircuitExecutorHeartbeat:
    def __init__(
        self,
        redis_getter: Callable[[], RedisHeartbeatPort] = get_redis_connection,
        now_provider: Callable[[], datetime] = datetime.utcnow,
    ) -> None:
        self._redis_getter = redis_getter
        self._now_provider = now_provider
        self._stop_event = Event()
        self._thread: Thread | None = None

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop_event.clear()

        def _run() -> None:
            while not self._stop_event.is_set():
                publish_circuit_executor_heartbeat(self._redis_getter, self._now_provider)
                self._stop_event.wait(settings.circuit_exec_heartbeat_seconds)

        self._thread = Thread(target=_run, name="circuit-executor-heartbeat", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=1)
            self._thread = None
