from app.queue.celery_queue import CeleryQueueAdapter, get_task_queue_depth
from app.worker.celery_app import celery_app
from app.worker.tasks import RUN_QUANTUM_TASK_NAME


class CeleryAppStub:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def send_task(
        self,
        name: str,
        *,
        args: tuple[int, ...],
        queue: str,
        time_limit: int,
    ) -> None:
        self.calls.append(
            {
                "name": name,
                "args": args,
                "queue": queue,
                "time_limit": time_limit,
            }
        )


class RedisStub:
    def __init__(self, depth: int) -> None:
        self.depth = depth
        self.keys: list[str] = []

    def llen(self, key: str) -> int:
        self.keys.append(key)
        return self.depth


def test_celery_queue_adapter_enqueues_task_with_queue_and_timeout() -> None:
    app = CeleryAppStub()
    queue = CeleryQueueAdapter(queue_name="qcp-default", app_getter=lambda: app)

    queue.enqueue("app.worker.tasks.run_quantum_task", task_id=7, job_timeout=90)

    assert app.calls == [
        {
            "name": "app.worker.tasks.run_quantum_task",
            "args": (7,),
            "queue": "qcp-default",
            "time_limit": 90,
        }
    ]


def test_get_task_queue_depth_reads_redis_list_length() -> None:
    redis = RedisStub(depth=12)

    depth = get_task_queue_depth(redis_getter=lambda: redis, queue_name="qcp-default")

    assert depth == 12
    assert redis.keys == ["qcp-default"]


def test_celery_app_registers_quantum_task_name() -> None:
    assert RUN_QUANTUM_TASK_NAME in celery_app.tasks
