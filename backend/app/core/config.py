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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return _split_csv(self.cors_allow_origins)


settings = Settings()
