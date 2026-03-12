# Tasks Document

- [x] 1. Extend task lifecycle model and runtime configuration
  - File: `backend/app/models/task.py`, `backend/app/core/config.py`
  - Add new terminal states (`TIMEOUT`, `RETRY_EXHAUSTED`) and runtime metadata fields (`attempt_count`, `started_at`, `finished_at`, `duration_ms`) to `Task`.
  - Add reliability/observability settings for idempotency TTL, retry policy, and queue depth threshold.
  - _Leverage: existing `TaskStatus` enum, existing `Settings` patterns in `config.py`_
  - _Requirements: 1, 3, 4, 6_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Core Engineer | Task: Extend task model states/metadata and add configuration entries for retry/idempotency/backpressure while keeping compatibility with existing environment loading | Restrictions: Do not change existing endpoint paths or remove current config keys, do not add fallback behavior, keep defaults explicit | _Leverage: current `Task` model and settings model | _Requirements: Requirement 1, 3, 4, 6 | Success: Model supports required states/fields and settings expose typed reliability knobs; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 2. Add idempotency persistence model with uniqueness contract
  - File: `backend/app/models/idempotency_record.py`, `backend/app/models/__init__.py`
  - Create a dedicated SQLModel table for `(user_id, idempotency_key) -> task_id` bindings with `expires_at` and timestamps.
  - Register model exports so DB metadata discovery is deterministic.
  - _Leverage: existing SQLModel model style under `backend/app/models`_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Data Model Engineer | Task: Add an idempotency record model with unique per-user key binding and expiry metadata, and wire model exports for table creation consistency | Restrictions: Do not introduce migrations framework, do not couple model to API logic, keep schema minimal and explicit | _Leverage: `Task` model conventions and SQLModel metadata behavior | _Requirements: Requirement 2 | Success: Idempotency table schema and uniqueness contract are represented in code and discoverable by init_db; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 3. Implement task lifecycle service with terminal-state guards
  - File: `backend/app/services/task_lifecycle.py`, `backend/app/services/task_error_payload.py`
  - Centralize status transitions and enforce terminal immutability.
  - Normalize failure payload shape and timestamp/duration updates.
  - _Leverage: current state update logic in `backend/app/worker/tasks.py`_
  - _Requirements: 1, 3, 5_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Domain Engineer | Task: Extract lifecycle transition logic into dedicated services with immutable terminal-state enforcement and normalized error payloads | Restrictions: Do not keep duplicate transition code in API/worker after integration, do not silently downgrade invalid transitions | _Leverage: existing `_update_task` semantics in worker | _Requirements: Requirement 1, 3, 5 | Success: All task transitions can be performed through a dedicated service with invariant checks and consistent error serialization; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 4. Implement idempotency service with TTL and cleanup semantics
  - File: `backend/app/services/idempotency_service.py`, `backend/app/services/idempotency_cleanup.py`
  - Resolve duplicate submissions, bind new keys, and enforce "non-terminal tasks remain effective" rule.
  - Add bounded cleanup for expired terminal bindings.
  - _Leverage: `Task` status definitions and new idempotency model_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Reliability Engineer | Task: Build idempotency lookup/bind/expiry services that satisfy TTL rules and prevent unbounded record growth | Restrictions: Do not store raw task code in idempotency table, do not expire active non-terminal bindings, no silent conflict resolution | _Leverage: SQLModel session patterns and terminal-state semantics | _Requirements: Requirement 2 | Success: Idempotency behavior is deterministic for duplicate/new/expired cases and cleanup behavior is explicit; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 5. Add retry policy classification and backpressure guard services
  - File: `backend/app/services/retry_policy.py`, `backend/app/services/backpressure_service.py`, `backend/app/queue/rq_queue.py`
  - Implement retryability classification and bounded backoff policy from configuration.
  - Add queue depth check utility and overload exception path.
  - _Leverage: existing queue adapter and execution backend error types_
  - _Requirements: 3, 4_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Queue Reliability Engineer | Task: Add retry policy and queue backpressure service using existing RQ integration and explicit typed errors for overload conditions | Restrictions: Do not add hidden retries, do not hide overload conditions, keep classification deterministic | _Leverage: `get_task_queue`, `ExecutionBackendError` contract | _Requirements: Requirement 3, 4 | Success: Retry and overload decisions are centralized and config-driven with explicit failure modes; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 6. Integrate submit API with idempotency and overload control
  - File: `backend/app/api/tasks.py`, `backend/app/schemas/task.py`, `backend/app/core/logging.py`
  - Extend submit endpoint to accept optional idempotency key and short-circuit duplicates.
  - Enforce overload rejection for new work and emit structured lifecycle logs.
  - _Leverage: existing submit/status/result contract and auth flow_
  - _Requirements: 2, 4, 5_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: FastAPI Engineer | Task: Wire idempotency and backpressure checks into task submission while preserving existing API contract and adding structured submit logs | Restrictions: Do not break current auth behavior, do not alter endpoint URLs, avoid broad refactors outside task submission path | _Leverage: existing `submit_task` implementation and task schemas | _Requirements: Requirement 2, 4, 5 | Success: Submit endpoint supports deterministic duplicate behavior and explicit overload handling with structured logs; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 7. Integrate worker execution flow with retry/timeout terminal semantics
  - File: `backend/app/worker/tasks.py`, `backend/app/services/qibo_executor.py`, `backend/app/worker/rq_worker.py`
  - Replace inline state mutation with lifecycle service calls.
  - Track attempts, apply retry policy, map timeout to `TIMEOUT`, and exhausted retries to `RETRY_EXHAUSTED`.
  - _Leverage: current worker orchestration and execution backend exceptions_
  - _Requirements: 1, 3, 5_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Worker Runtime Engineer | Task: Refactor worker task execution to use lifecycle and retry services, including explicit timeout/retry_exhausted terminal states and attempt tracking | Restrictions: Do not swallow execution errors, do not reintroduce ad-hoc state updates, preserve result normalization behavior | _Leverage: existing `run_quantum_task` and qibo execution path | _Requirements: Requirement 1, 3, 5 | Success: Worker path is deterministic with explicit retry terminal outcomes and lifecycle metadata updates; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 8. Implement readiness endpoints and dependency probes
  - File: `backend/app/services/readiness_service.py`, `backend/app/api/health.py`
  - Add `GET /api/health/live` and `GET /api/health/ready`.
  - Validate DB, Redis, and execution backend availability in ready checks.
  - _Leverage: existing `/api/health`, redis and execution backend factories_
  - _Requirements: 6, 5_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Observability Engineer | Task: Add layered liveness/readiness checks with explicit dependency diagnostics and preserve existing simple health semantics where needed | Restrictions: Do not hide failing dependencies, do not add mock readiness paths, keep response shape machine-readable | _Leverage: existing health router and queue/backend adapters | _Requirements: Requirement 6, 5 | Success: Health endpoints clearly separate process liveness from dependency readiness with explicit non-200 behavior on unready state; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 9. Add metrics endpoint and aggregation service
  - File: `backend/app/services/metrics_service.py`, `backend/app/api/metrics.py`, `backend/app/api/__init__.py`
  - Expose parseable text metrics for success/failure/timeout/retry, queue depth, and duration summary.
  - Register new metrics router in API composition.
  - _Leverage: task persistence fields, queue depth helper, existing router wiring_
  - _Requirements: 6, 5_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Observability Developer | Task: Implement an MVP metrics service and `/api/metrics` endpoint with required reliability indicators derived from live data | Restrictions: Do not return HTML/JSON from metrics endpoint, do not omit required metric keys, keep implementation dependency-light | _Leverage: task table aggregates and queue adapter | _Requirements: Requirement 6, 5 | Success: Metrics endpoint returns parseable text including required counters/gauges/latency summary keys and is integrated into app routers; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 10. Add reliability and observability test coverage
  - File: `backend/tests/test_task_reliability.py`, `backend/tests/test_observability_endpoints.py`, `backend/tests/test_mvp_smoke.py`
  - Add unit/integration tests for lifecycle invariants, idempotency TTL behavior, retry exhaustion, backpressure, health readiness, and metrics contract.
  - Preserve deterministic tests without requiring live Docker daemon for unit scenarios.
  - _Leverage: existing pytest style in `test_mvp_smoke.py` and execution mock patterns_
  - _Requirements: 1, 2, 3, 4, 5, 6_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Test Engineer | Task: Add comprehensive automated tests for reliability and observability behaviors, including failure-path assertions and endpoint contracts | Restrictions: Do not weaken existing assertions, do not rely on nondeterministic timing assumptions, keep tests isolated from external services when possible | _Leverage: existing smoke tests and execution backend mocks | _Requirements: Requirement 1, 2, 3, 4, 5, 6 | Success: New tests cover core reliability/observability behavior and run deterministically in local test environment; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 11. Update runtime documentation and environment examples
  - File: `.env.example`, `README.md`, `docs/project-status-and-usage.md`
  - Document new reliability/observability settings, health endpoints, metrics endpoint, and idempotency submit usage.
  - Align operational guidance with new terminal states and retry semantics.
  - _Leverage: existing runbook and docker startup sections_
  - _Requirements: 2, 3, 4, 6_
  - _Prompt: Implement the task for spec task-reliability-observability, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Documentation Engineer | Task: Update environment and usage documentation for idempotency/retry/backpressure/health/metrics behavior in MVP container workflow | Restrictions: Do not claim unverifiable behavior, do not leave ambiguous defaults, keep docs executable with current compose setup | _Leverage: existing README and project usage docs | _Requirements: Requirement 2, 3, 4, 6 | Success: Docs and env examples accurately describe new behavior and can be followed directly in local Docker setup; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._
