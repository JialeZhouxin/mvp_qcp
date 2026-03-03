from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # 统一配置入口，便于后续切换 dev/test/prod
    env: str = "dev"
    app_name: str = "QCP MVP API"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "sqlite:///./data/qcp.db"
    redis_url: str = "redis://127.0.0.1:6379/0"
    token_expire_hours: int = 24
    qibo_exec_timeout_seconds: int = 10

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
