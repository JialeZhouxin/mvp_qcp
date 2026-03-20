from sqlmodel import select

from app.core.config import settings
from app.db.session import SessionFactory, create_session
from app.queue.redis_conn import get_redis_connection
from app.services.execution.factory import get_execution_backend


class ReadinessService:
    def __init__(self, session_factory: SessionFactory = create_session) -> None:
        self._session_factory = session_factory

    def check_live(self) -> dict[str, str]:
        return {"status": "ok", "app": settings.app_name, "env": settings.env}

    def check_ready(self) -> tuple[bool, dict[str, object]]:
        raw_checks = {
            "database": self._check_database(),
            "redis": self._check_redis(),
            "execution_backend": self._check_execution_backend(),
        }
        checks = {name: self._sanitize_check(check) for name, check in raw_checks.items()}
        is_ready = all(bool(check["ok"]) for check in checks.values())
        payload: dict[str, object] = {
            "status": "ok" if is_ready else "degraded",
            "app": settings.app_name,
            "env": settings.env,
            "checks": checks,
        }
        return is_ready, payload

    def _sanitize_check(self, check: dict[str, object]) -> dict[str, object]:
        sanitized = dict(check)
        if not bool(sanitized.get("ok")) and "error" in sanitized:
            sanitized["error"] = "dependency unavailable"
        return sanitized

    def _check_database(self) -> dict[str, object]:
        try:
            with self._session_factory() as session:
                session.exec(select(1)).one()
            return {"ok": True}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    def _check_redis(self) -> dict[str, object]:
        try:
            redis = get_redis_connection()
            redis.ping()
            return {"ok": True}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    def _check_execution_backend(self) -> dict[str, object]:
        try:
            backend = get_execution_backend()
            client = getattr(backend, "_client", None)
            ping = getattr(client, "ping", None)
            if callable(ping):
                ping()
            return {"ok": True, "backend": backend.name}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
