from pydantic_settings import BaseSettings, SettingsConfigDict


def _split_csv(raw_value: str) -> list[str]:
    return [value.strip() for value in raw_value.split(",") if value.strip()]


PRODUCTION_LIKE_ENVS = frozenset({"prod", "production", "staging"})
LOCAL_LIKE_ENVS = frozenset({"dev", "development", "test"})
SUPPORTED_EXECUTION_BACKENDS = frozenset({"docker", "local"})


class Settings(BaseSettings):
    # 统一配置入口，便于后续切换 dev/test/prod
    env: str = "dev"
    app_name: str = "QCP MVP API"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "sqlite:///./data/qcp.db"
    redis_url: str = "redis://127.0.0.1:6379/0"
    cors_allow_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    rq_queue_name: str = "qcp-default"
    rq_job_timeout_seconds: int = 90
    token_expire_hours: int = 24
    qibo_exec_timeout_seconds: int = 60
    execution_backend: str = "docker"
    execution_image: str = "qcp-backend-dev:latest"
    execution_runner_module: str = "app.services.execution.runner"
    execution_read_only_rootfs: bool = True
    execution_network_disabled: bool = True
    execution_mem_limit_mb: int = 256
    execution_cpu_limit: float = 0.5
    execution_pids_limit: int = 64
    execution_tmpfs_size_mb: int = 64
    idempotency_ttl_hours: int = 24
    idempotency_cleanup_batch_size: int = 200
    task_max_retries: int = 2
    task_retry_backoff_seconds: str = "1,3"
    queue_max_depth: int = 200

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def normalized_env(self) -> str:
        return self.env.strip().lower()

    @property
    def is_production_like_env(self) -> bool:
        return self.normalized_env in PRODUCTION_LIKE_ENVS

    @property
    def is_local_env(self) -> bool:
        return self.normalized_env in LOCAL_LIKE_ENVS

    @property
    def cors_origins(self) -> list[str]:
        origins = _split_csv(self.cors_allow_origins)
        if not origins:
            raise ValueError("cors_allow_origins must contain at least one origin")
        return origins

    @property
    def retry_backoff_schedule(self) -> list[int]:
        schedule = [int(value.strip()) for value in self.task_retry_backoff_seconds.split(",") if value.strip()]
        if not schedule:
            raise ValueError("task_retry_backoff_seconds must contain at least one positive integer")
        if any(value <= 0 for value in schedule):
            raise ValueError("task_retry_backoff_seconds values must be positive integers")
        return schedule

    def validate_runtime_constraints(self) -> None:
        env_name = self.normalized_env
        if env_name not in PRODUCTION_LIKE_ENVS and env_name not in LOCAL_LIKE_ENVS:
            raise ValueError(f"unsupported env: {self.env}")

        self._validate_execution_backend_policy()
        if self.is_production_like_env:
            self._validate_production_required_settings()

        _ = self.cors_origins
        _ = self.retry_backoff_schedule

    def _validate_execution_backend_policy(self) -> None:
        backend_name = self.execution_backend.strip().lower()
        if not backend_name:
            raise ValueError("execution_backend is required")
        if backend_name not in SUPPORTED_EXECUTION_BACKENDS:
            raise ValueError(f"unsupported execution backend: {self.execution_backend}")
        if self.is_production_like_env and backend_name == "local":
            raise ValueError("execution_backend=local is not allowed when env is prod/staging")

    def _validate_production_required_settings(self) -> None:
        default_values = {
            "database_url": "sqlite:///./data/qcp.db",
            "redis_url": "redis://127.0.0.1:6379/0",
            "execution_image": "qcp-backend-dev:latest",
            "cors_allow_origins": "http://127.0.0.1:5173,http://localhost:5173",
        }
        missing_fields: list[str] = []
        for field_name, default_value in default_values.items():
            value = getattr(self, field_name)
            if not isinstance(value, str):
                missing_fields.append(field_name)
                continue

            value_text = value.strip()
            if not value_text:
                missing_fields.append(field_name)
                continue

            if field_name == "cors_allow_origins":
                if _split_csv(value_text) == _split_csv(default_value):
                    missing_fields.append(field_name)
                continue

            if value_text == default_value:
                missing_fields.append(field_name)

        if missing_fields:
            joined = ", ".join(sorted(missing_fields))
            raise ValueError(
                f"production-like env requires explicit non-default settings for: {joined}"
            )


settings = Settings()
