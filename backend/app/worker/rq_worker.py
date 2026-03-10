from rq import Connection, SimpleWorker
from rq.timeouts import TimerDeathPenalty

from app.core.config import settings
from app.queue.redis_conn import get_redis_connection


class WindowsSimpleWorker(SimpleWorker):
    death_penalty_class = TimerDeathPenalty


def main() -> None:
    redis_connection = get_redis_connection()
    with Connection(redis_connection):
        # Windows 不支持 os.fork，且无 SIGALRM，使用 TimerDeathPenalty
        worker = WindowsSimpleWorker([settings.rq_queue_name])
        worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
