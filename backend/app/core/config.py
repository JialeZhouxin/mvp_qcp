from pydantic_settings import BaseSettings, SettingsConfigDict


def _split_csv(raw_value: str) -> list[str]:
    return [value.strip() for value in raw_value.split(",") if value.strip()]


class Settings(BaseSettings):
    # 统一配置入口，便于后续切换 dev/test/prod
    env: str = "dev"
    app_name: str = "QCP MVP API"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "sqlite:///./data/qcp.db"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_recycle_seconds: int = 1800
    redis_url: str = "redis://127.0.0.1:6379/0"
    cors_allow_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    task_queue_name: str = "qcp-default"
    circuit_task_queue_name: str = "qcp-circuit"
    hybrid_task_queue_name: str = "qcp-hybrid"
    task_job_timeout_seconds: int = 90
    token_expire_hours: int = 24
    qibo_exec_timeout_seconds: int = 60
    execution_backend: str = "docker"
    execution_image: str = "qcp-backend-dev:latest"
    execution_runner_module: str = "app.services.execution.runner"
    execution_service_url: str = ""
    execution_service_timeout_seconds: int = 75
    docker_socket_path: str = "/var/run/docker.sock"
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
    circuit_exec_backend: str = "numpy"
    circuit_exec_pool_size: int = 1
    circuit_exec_init_timeout_seconds: int = 180
    circuit_exec_timeout_seconds: int = 60
    circuit_exec_heartbeat_seconds: int = 10
    circuit_exec_heartbeat_ttl_seconds: int = 30
    circuit_exec_heartbeat_key: str = "qcp:circuit:heartbeat"
    worker_role: str = "default"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return _split_csv(self.cors_allow_origins)

    @property
    def retry_backoff_schedule(self) -> list[int]:
        schedule = [int(value.strip()) for value in self.task_retry_backoff_seconds.split(",") if value.strip()]
        if not schedule:
            raise ValueError("task_retry_backoff_seconds must contain at least one positive integer")
        if any(value <= 0 for value in schedule):
            raise ValueError("task_retry_backoff_seconds values must be positive integers")
        return schedule


settings = Settings()
