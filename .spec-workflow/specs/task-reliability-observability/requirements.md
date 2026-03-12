# Requirements Document

## Introduction

This spec upgrades the MVP task pipeline from "can run" to "reliably operable."  
It defines strict task lifecycle semantics, controlled retry behavior, queue protection, and minimum observability (structured logs, metrics, and layered health checks) so failures can be diagnosed quickly and user-facing behavior remains predictable.

## Alignment with Product Vision

The project memory emphasizes a minimal but complete loop for internal demo and PoC handoff, with traceable task status, error, and execution duration.  
This feature directly supports that goal by making async task behavior deterministic and observable without introducing enterprise-scale infrastructure outside MVP scope.

## Requirements

### Requirement 1: Deterministic Task State Machine

**User Story:** As an API consumer, I want stable and explicit task states, so that I can build predictable polling and result handling logic.

#### Acceptance Criteria

1. WHEN a task is created THEN the system SHALL initialize state as `PENDING`.
2. WHEN a worker starts processing a `PENDING` task THEN the system SHALL transition the task to `RUNNING`.
3. WHEN execution completes successfully THEN the system SHALL transition the task to terminal state `SUCCESS`.
4. WHEN execution fails due to business/runtime error THEN the system SHALL transition the task to terminal state `FAILURE` with a structured error payload.
5. WHEN execution exceeds configured execution timeout THEN the system SHALL transition the task to terminal state `TIMEOUT`.
6. WHEN retry attempts are exhausted for retryable errors THEN the system SHALL transition the task to terminal state `RETRY_EXHAUSTED`.
7. IF a task is in any terminal state (`SUCCESS`, `FAILURE`, `TIMEOUT`, `RETRY_EXHAUSTED`) THEN the system SHALL reject any further state transition for that task.

### Requirement 2: Idempotent Task Submission

**User Story:** As a client submitting tasks, I want idempotent submission support, so that network retries do not create duplicate executions.

#### Acceptance Criteria

1. WHEN a submit request includes an idempotency key that has not been used by the same user THEN the system SHALL create a new task and bind the key to the created task ID.
2. WHEN a submit request repeats a previously used idempotency key for the same user THEN the system SHALL return the existing task ID and current status instead of creating a new task.
3. IF a submit request does not provide an idempotency key THEN the system SHALL keep current behavior and create a new task.
4. IF different users submit the same idempotency key value THEN the system SHALL treat them as isolated keys and SHALL NOT cross-link tasks across users.
5. WHEN an idempotency record is created THEN the system SHALL assign an explicit expiration time via configurable TTL (`IDEMPOTENCY_TTL_HOURS`).
6. IF an idempotency record has expired THEN the system SHALL treat a new request with the same key as a new submission.
7. IF a task bound to an idempotency key is not in a terminal state THEN the system SHALL keep the key effective even when normal TTL would otherwise expire.

### Requirement 3: Controlled Retry and Timeout Invariants

**User Story:** As an operator, I want retries and timeout behavior to be explicit and bounded, so that failures are recoverable but execution remains controlled.

#### Acceptance Criteria

1. WHEN a task fails with retryable infrastructure errors (for example transient Docker/RQ transport errors) THEN the system SHALL retry according to configured `max_retries` and backoff policy.
2. WHEN a task fails with non-retryable business errors (for example code validation or deterministic execution errors) THEN the system SHALL NOT retry.
3. IF configuration violates timeout invariant (`RQ_JOB_TIMEOUT_SECONDS` `<=` `QIBO_EXEC_TIMEOUT_SECONDS`) THEN the system SHALL fail fast on startup with an explicit configuration error.
4. WHEN a retry attempt occurs THEN the system SHALL record the attempt count on the task for API visibility.

### Requirement 4: Queue Backpressure Protection

**User Story:** As an operator, I want queue overload protection, so that system degradation is explicit and bounded rather than silent.

#### Acceptance Criteria

1. WHEN queue depth exceeds configured threshold THEN the system SHALL reject new submissions with HTTP 503 and a structured error code `QUEUE_OVERLOADED`.
2. IF queue depth is below threshold THEN the system SHALL accept submissions using existing enqueue path.
3. WHEN overload rejection happens THEN the system SHALL emit a warning log with queue depth and threshold.

### Requirement 5: Structured Logging and Correlation

**User Story:** As a developer, I want correlated structured logs, so that I can locate root cause quickly using a single task ID.

#### Acceptance Criteria

1. WHEN task submission, enqueue, execution start, execution finish, retry, or terminal failure occurs THEN the system SHALL emit structured logs containing at least `task_id`, `user_id` (if available), `status`, `error_code` (if any), `attempt`, and `duration_ms` (when available).
2. IF a terminal error occurs THEN the system SHALL log both normalized error code and original message.
3. WHEN given a task ID THEN operators SHALL be able to trace the full lifecycle through logs without joining multiple ad-hoc formats.

### Requirement 6: MVP Observability Endpoints

**User Story:** As an operator, I want health and metrics endpoints, so that runtime readiness and reliability trends are visible.

#### Acceptance Criteria

1. WHEN `GET /api/health/live` is called THEN the system SHALL return process liveness status without external dependency checks.
2. WHEN `GET /api/health/ready` is called THEN the system SHALL validate database, Redis, and execution backend readiness and SHALL return non-200 if any required dependency is unavailable.
3. WHEN `GET /api/metrics` is called THEN the system SHALL expose at least task success count, failure count, timeout count, retry count, queue depth gauge, and task duration histogram/summary in a parseable text format.
4. IF metrics data is unavailable at startup THEN the system SHALL initialize with zero values rather than omitting required metric keys.

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Separate task state transition logic, idempotency service, retry policy, and observability instrumentation into focused modules.
- **Modular Design**: Keep API layer thin; centralize state transition and error normalization in service layer.
- **Dependency Management**: Use dependency injection for queue/redis/metrics adapters so unit tests do not require real services.
- **Clear Interfaces**: Define explicit typed contracts for retry classification, metrics recording, and health checks.

### Performance
- Queue depth check and idempotency lookup SHALL add no more than one additional DB query and one Redis call on submit path.
- Observability instrumentation SHALL avoid blocking calls in the hot path.

### Security
- Observability outputs SHALL NOT include task source code, secrets, or raw credentials.
- Error payloads exposed via API SHALL use normalized codes and sanitized messages.

### Reliability
- State transitions SHALL be atomic at persistence layer.
- Terminal task states SHALL be immutable.
- Retry behavior SHALL be deterministic from configuration.
- Idempotency storage SHALL have bounded growth by TTL expiration and cleanup strategy (native expiry for Redis and explicit cleanup for database-backed records).

### Usability
- API responses for failures SHALL include stable machine-readable error codes.
- Health and metrics endpoints SHALL be documented and executable in local Docker environment.
