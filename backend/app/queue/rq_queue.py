from rq import Queue

from app.core.config import settings
from app.queue.redis_conn import get_redis_connection


def get_task_queue() -> Queue:
    return Queue(name=settings.rq_queue_name, connection=get_redis_connection())
