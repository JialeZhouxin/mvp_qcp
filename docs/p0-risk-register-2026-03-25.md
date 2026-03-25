# P0 Risk Register

Date: 2026-03-25

This register tracks the current P0 issues in strict execution order. The goal is to remove the time bombs in the current MVP stack before any V2 product work resumes.

## P0-1 Default execution path is not truly isolated

Status: in_progress

Problem:
- The default `docker-compose.yml` path used `backend/worker -> remote executor -> execution-service(local inline sandbox)`.
- The execution-service health contract reported `remote`, which concealed whether the effective runtime was Docker-isolated.
- Timeout values were inconsistent across task, remote HTTP, and sandbox execution.

Impact:
- Untrusted code was not running on the intended Docker execution backend by default.
- Slow tasks could fail on the remote HTTP timeout before hitting the actual execution timeout.
- Operators could falsely believe the execution plane was isolated.

Current fix scope:
- Route `execution-service` through the execution gateway instead of direct inline sandbox calls.
- Reject `execution-service` misconfigured with `remote`.
- Make remote health surface the effective backend.
- Align default timeout chain to `90 > 75 > 60`.
- Mount Docker socket only into `execution-service`.

## P0-2 execution-service has no internal authentication

Status: open

Problem:
- Any caller with network access to the internal service can hit `/execute`.

Impact:
- Internal network access becomes code execution access.

Planned fix:
- Add shared-secret or signed internal auth for `backend/worker -> execution-service`.
- Reject unauthenticated health-sensitive and execution requests.

## P0-3 Redis is single-point, unauthenticated, and non-durable

Status: open

Problem:
- Redis currently has no auth, no AOF/RDB hardening, and broker/result traffic share the same instance.

Impact:
- Queue loss and result loss can happen on restart or fault.

Planned fix:
- Add Redis auth, persistence, durable volume, and exposure tightening.

## P0-4 Task execution lacks mutual exclusion and retry handling wastes worker slots

Status: open

Problem:
- The same task can be retried or replayed without a hard execution lease.
- Retry backoff currently sleeps inside the worker.

Impact:
- Duplicate execution and worker slot starvation under load or fault amplification.

Planned fix:
- Add execution lease / compare-and-swap style state transition.
- Replace in-worker sleep with broker-native retry scheduling.
