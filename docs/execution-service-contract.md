# Execution Service Contract

## Purpose

`execution-service` is the internal execution boundary for **code tasks**.

It is not the path for graphical circuit tasks.

Current responsibility:

- receive code execution requests from backend/worker
- dispatch execution through the configured execution backend
- return normalized success or error payloads

## Current runtime role

In the current Docker Compose stack:

- `worker` uses `EXECUTION_BACKEND=remote`
- `execution-service` uses `EXECUTION_BACKEND=docker`

That means the effective chain is:

```text
worker -> execution-service -> Docker runner
```

## Endpoints

### `GET /health`

Response shape:

```json
{
  "status": "ok",
  "backend": "docker"
}
```

Notes:

- `backend` reflects the real execution backend
- it must not be treated as a fixed `"remote"` marker

### `POST /execute`

Request:

```json
{
  "code": "def main():\n    return {'counts': {'00': 2, '11': 2}}",
  "timeout_seconds": 5
}
```

Success response:

```json
{
  "result": {
    "counts": {
      "00": 2,
      "11": 2
    }
  }
}
```

Error response shape:

```json
{
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "execution timed out"
  }
}
```

## Error mapping

Current contract expectations:

- request validation errors -> `400`
- execution failure / execution timeout -> `422`
- infrastructure or runtime backend failures -> `500`

## Scope boundary

This contract is for internal service-to-service communication only.

It does not define:

- public frontend API behavior
- graphical circuit submit contract
- project persistence contract
