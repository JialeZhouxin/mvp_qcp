from __future__ import annotations

from app.worker.celery_app import celery_app
from app.worker.tasks import RUN_QUANTUM_TASK_NAME, run_quantum_task


@celery_app.task(name=RUN_QUANTUM_TASK_NAME)
def run_quantum_task_job(task_id: int) -> dict:
    return run_quantum_task(task_id)
