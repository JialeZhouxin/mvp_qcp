from functools import lru_cache

from app.core.config import settings
from app.services.execution.base import ExecutionBackend
from app.services.execution.docker_executor import DockerExecutor
from app.services.execution.local_executor import LocalExecutor

BACKEND_DOCKER = "docker"
BACKEND_LOCAL = "local"


def _build_docker_executor() -> DockerExecutor:
    return DockerExecutor(
        image=settings.execution_image,
        runner_module=settings.execution_runner_module,
        read_only_rootfs=settings.execution_read_only_rootfs,
        network_disabled=settings.execution_network_disabled,
        mem_limit_mb=settings.execution_mem_limit_mb,
        cpu_limit=settings.execution_cpu_limit,
        pids_limit=settings.execution_pids_limit,
        tmpfs_size_mb=settings.execution_tmpfs_size_mb,
    )


@lru_cache(maxsize=1)
def get_execution_backend() -> ExecutionBackend:
    backend_name = settings.execution_backend.strip().lower()
    if backend_name == BACKEND_DOCKER:
        return _build_docker_executor()
    if backend_name == BACKEND_LOCAL:
        return LocalExecutor()
    raise ValueError(f"unsupported execution backend: {settings.execution_backend}")


def reset_execution_backend_cache() -> None:
    get_execution_backend.cache_clear()
