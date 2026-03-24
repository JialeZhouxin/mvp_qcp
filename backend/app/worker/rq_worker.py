from rq import Connection, SimpleWorker
from rq.timeouts import TimerDeathPenalty

from app.core.config import settings
from app.queue.redis_conn import get_redis_connection


class WindowsSimpleWorker(SimpleWorker):
    death_penalty_class = TimerDeathPenalty


def _validate_timeout_invariant() -> None:
    if settings.rq_job_timeout_seconds <= settings.qibo_exec_timeout_seconds:
        raise ValueError("RQ_JOB_TIMEOUT_SECONDS must be greater than QIBO_EXEC_TIMEOUT_SECONDS")


def _validate_runtime_constraints() -> None:
    settings.validate_runtime_constraints()


def main() -> None:
    _validate_runtime_constraints()
    _validate_timeout_invariant()
    redis_connection = get_redis_connection()
    with Connection(redis_connection):
        worker = WindowsSimpleWorker([settings.rq_queue_name])
        worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
