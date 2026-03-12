# Design Document

## Overview

This design introduces a reliability and observability layer for the existing FastAPI + Redis/RQ + Docker execution pipeline.  
The core changes are:
- deterministic task lifecycle with immutable terminal states,
- idempotent submit with bounded idempotency storage (TTL),
- explicit retry policy for retryable infrastructure failures,
- queue backpressure rejection on overload,
- structured lifecycle logging,
- MVP liveness/readiness/metrics endpoints.

The implementation keeps current API semantics for existing clients and adds capabilities incrementally with clear module boundaries.

## Steering Document Alignment

### Technical Standards (tech.md)
No `tech.md` is currently present. This design follows existing project constraints from `project-memory.md`:
- maintain monolith structure for MVP velocity,
- keep operational complexity low,
- preserve explicit failure visibility (no silent fallback),
- keep SQLite-compatible persistence path.

### Project Structure (structure.md)
No `structure.md` is currently present. This design follows current layout:
- API contracts in `app/api` and `app/schemas`,
- persistence models in `app/models`,
- business logic in `app/services`,
- queue integration in `app/queue` and `app/worker`,
- global config in `app/core/config.py`.

New logic will be added as focused modules under these existing domains.

## Code Reuse Analysis

### Existing Components to Leverage
- **`app/api/tasks.py`**: Extend submit/status/result flow without breaking existing endpoints.
- **`app/worker/tasks.py`**: Reuse worker entrypoint and add deterministic state transition + retry orchestration.
- **`app/models/task.py`**: Extend existing task persistence model for lifecycle and attempt metadata.
- **`app/queue/rq_queue.py` + `app/queue/redis_conn.py`**: Reuse current queue/redis integration for queue depth checks.
- **`app/services/execution/*`**: Reuse execution abstraction and Docker backend for readiness probes and error classification input.

### Integration Points
- **Task APIs (`/api/tasks/*`)**: Add idempotency and backpressure checks on submit path.
- **Worker execution path**: Add retry classifier and terminal-state enforcement.
- **Database (`SQLite + SQLModel`)**: Extend `Task` and add `IdempotencyRecord`.
- **Redis/RQ**: Use queue length for overload detection and keep enqueue path unchanged.
- **Health API**: Expand from `/api/health` to `/api/health/live` and `/api/health/ready`.
- **Metrics API**: Add `/api/metrics` in text exposition format.

## Architecture

The reliability layer is centered around a new task lifecycle service that is the only module allowed to mutate task state.  
API and worker call into this service instead of writing raw status directly.

Idempotency is implemented in DB with `(user_id, key)` uniqueness and explicit TTL (`expires_at`) to keep storage bounded.  
The key remains valid while the bound task is non-terminal; terminal tasks use TTL expiry and cleanup.

Retry behavior is explicit in worker logic:
- classify errors into retryable vs non-retryable,
- increment attempt counters per execution attempt,
- retry with configured bounded backoff,
- write `RETRY_EXHAUSTED` terminal state when retries are consumed.

Observability is added via:
- structured lifecycle logs with correlation fields,
- readiness checks across DB/Redis/execution backend,
- runtime metrics endpoint based on task table aggregates + queue depth.

### Modular Design Principles
- **Single File Responsibility**: state transition, idempotency, retry policy, and metrics rendering are separated.
- **Component Isolation**: API layer orchestrates only request/response and delegates business decisions.
- **Service Layer Separation**: persistence updates are centralized in service modules.
- **Utility Modularity**: logging and readiness checks are reusable utilities.

```mermaid
graph TD
    A[/api/tasks/submit] --> B[Idempotency Service]
    B --> C{duplicate key?}
    C -->|yes| D[return existing task]
    C -->|no| E[Backpressure Check]
    E --> F[Create Task + Optional Idempotency Record]
    F --> G[Enqueue RQ Job]

    G --> H[Worker run_quantum_task]
    H --> I[Task Lifecycle Service]
    I --> J[Execution Backend]
    J --> I
    I --> K[(SQLite Task + Idempotency)]

    L[/api/health/ready] --> M[Readiness Service]
    M --> N[(DB)]
    M --> O[(Redis)]
    M --> J

    P[/api/metrics] --> Q[Metrics Service]
    Q --> K
    Q --> O
```

## Components and Interfaces

### `TaskLifecycleService` (new)
- **Purpose:** Single writer for task status transitions and invariant enforcement.
- **Interfaces:**
  - `start_attempt(task_id: int, now: datetime) -> Task`
  - `mark_success(task_id: int, result: dict, finished_at: datetime) -> None`
  - `mark_failure(task_id: int, error_code: str, message: str, finished_at: datetime) -> None`
  - `mark_timeout(task_id: int, message: str, finished_at: datetime) -> None`
  - `mark_retry_exhausted(task_id: int, error_code: str, message: str, finished_at: datetime) -> None`
- **Dependencies:** SQLModel session, task repository helpers.
- **Reuses:** existing `Task` model and worker flow.

### `IdempotencyService` (new)
- **Purpose:** Manage idempotent submit lookup/create/expiry.
- **Interfaces:**
  - `resolve_existing(user_id: int, key: str, now: datetime) -> Task | None`
  - `bind_new_task(user_id: int, key: str, task_id: int, now: datetime) -> None`
  - `refresh_terminal_ttl(task_id: int, now: datetime) -> None`
  - `cleanup_expired(now: datetime, limit: int) -> int`
- **Dependencies:** SQLModel session, `Task` status inspection, settings (`IDEMPOTENCY_TTL_HOURS`).
- **Reuses:** `Task` terminal state definitions.

### `RetryPolicy` (new)
- **Purpose:** Centralize retryability classification and backoff.
- **Interfaces:**
  - `is_retryable(exc: Exception) -> bool`
  - `next_backoff_seconds(attempt: int) -> int`
- **Dependencies:** settings (`TASK_MAX_RETRIES`, backoff list/string).
- **Reuses:** execution backend error contract (`ExecutionBackendError` codes).

### `BackpressureService` (new)
- **Purpose:** Reject new tasks when queue depth exceeds threshold.
- **Interfaces:**
  - `ensure_submit_capacity() -> None` (raise typed overload error when exceeded)
  - `current_depth() -> int`
- **Dependencies:** RQ queue adapter, settings (`QUEUE_MAX_DEPTH`).
- **Reuses:** `get_task_queue()`.

### `ReadinessService` (new)
- **Purpose:** Implement readiness checks for DB, Redis, execution backend.
- **Interfaces:**
  - `check_live() -> dict`
  - `check_ready() -> tuple[bool, dict]`
- **Dependencies:** DB session factory, redis connection, execution backend factory.
- **Reuses:** `get_redis_connection`, `get_execution_backend`.

### `MetricsService` (new)
- **Purpose:** Produce parseable text metrics from live aggregates.
- **Interfaces:**
  - `render_metrics_text() -> str`
- **Dependencies:** SQLModel session and RQ queue depth.
- **Reuses:** `Task` table and queue adapter.

### API Layer Extensions
- **`POST /api/tasks/submit`**:
  - accept optional `Idempotency-Key` header,
  - duplicate path returns existing task,
  - overload path returns 503 + `QUEUE_OVERLOADED`.
- **`GET /api/health/live`** and **`GET /api/health/ready`**: new endpoints.
- **`GET /api/metrics`**: new endpoint with plain text response.

## Data Models

### `Task` (extend existing model)
```python
TaskStatus = Enum(
  "PENDING", "RUNNING", "SUCCESS", "FAILURE", "TIMEOUT", "RETRY_EXHAUSTED"
)

Task:
- id: int (pk)
- user_id: int (index)
- code: str
- status: TaskStatus (index)
- result_json: str | None
- error_message: str | None
- attempt_count: int                # increments per execution attempt
- started_at: datetime | None
- finished_at: datetime | None
- duration_ms: int | None
- created_at: datetime
- updated_at: datetime
```

### `IdempotencyRecord` (new model)
```python
IdempotencyRecord:
- id: int (pk)
- user_id: int (index)
- idempotency_key: str
- task_id: int (index)
- expires_at: datetime | None       # null/extended while task non-terminal; terminal uses TTL expiry
- created_at: datetime
- updated_at: datetime

Constraints:
- unique(user_id, idempotency_key)
```

### Config Additions
```python
idempotency_ttl_hours: int = 24
task_max_retries: int = 2
task_retry_backoff_seconds: str = "1,3"
queue_max_depth: int = 200
```

## Error Handling

### Error Scenarios
1. **Queue overload on submit**
   - **Handling:** `BackpressureService` raises typed overload error; API returns `503` with `QUEUE_OVERLOADED`.
   - **User Impact:** Immediate deterministic rejection with actionable error code.

2. **Duplicate submit with same idempotency key**
   - **Handling:** `IdempotencyService` returns existing task binding.
   - **User Impact:** Receives existing task id/status, no duplicate execution.

3. **Retryable infrastructure failure**
   - **Handling:** Worker retries with bounded backoff; increments `attempt_count`; logs each attempt.
   - **User Impact:** Task remains active until success or retries exhausted.

4. **Non-retryable execution error**
   - **Handling:** Worker writes terminal `FAILURE` immediately with normalized `error_code`.
   - **User Impact:** Fast failure, no wasted retries.

5. **Execution timeout**
   - **Handling:** Worker writes terminal `TIMEOUT`, preserving error details.
   - **User Impact:** Clear timeout semantics distinct from generic failure.

6. **Configuration invariant violation**
   - **Handling:** App startup raises explicit config error when timeout invariant is violated.
   - **User Impact:** Service fails fast rather than running in broken mode.

7. **Dependency unready (`/api/health/ready`)**
   - **Handling:** Return `503` with per-dependency readiness details.
   - **User Impact:** Operators can diagnose which dependency is failing.

## Testing Strategy

### Unit Testing
- Add focused tests for:
  - state transition guard (terminal immutability),
  - retry classifier and backoff behavior,
  - idempotency resolve/bind/expiry logic (including TTL edge case),
  - backpressure threshold behavior,
  - readiness and metrics rendering functions.
- Use dependency injection and stubs for Redis/RQ/execution backend.

### Integration Testing
- Extend FastAPI tests for:
  - submit with and without idempotency key,
  - duplicate key returns same task id,
  - overload returns `503` with `QUEUE_OVERLOADED`,
  - new terminal states visible via status/result endpoints,
  - `/api/health/live`, `/api/health/ready`, `/api/metrics` contracts.
- Add worker-path tests for retry exhaustion and timeout state mapping.

### End-to-End Testing
- Docker compose smoke:
  - submit normal task -> `SUCCESS`,
  - inject retryable fault -> retries then terminal outcome,
  - verify metrics endpoint includes required keys,
  - verify readiness flips to non-200 if Redis/backend is unavailable.
