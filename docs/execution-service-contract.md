# Execution Service Contract

## Purpose

`execution-service` is a minimal remote execution stub for the `remote` execution backend.
It exists as a separate HTTP service boundary so the worker no longer has to assume direct
ownership of the execution environment.

## Endpoints

### `GET /health`

Response:

```json
{
  "status": "ok",
  "backend": "remote"
}
```

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

Validation failure:

```json
{
  "detail": {
    "error": {
      "code": "SANDBOX_VALIDATION_ERROR",
      "message": "import not allowed: os"
    }
  }
}
```

Execution failure:

```json
{
  "detail": {
    "error": {
      "code": "SANDBOX_EXECUTION_ERROR",
      "message": "boom"
    }
  }
}
```

## Status Codes

1. `200`: execution succeeded
2. `400`: request passed schema validation but code failed sandbox validation
3. `422`: code executed but failed inside the sandbox or timed out
4. `500`: unexpected runner-side error

## Current Scope

1. Reuses the existing in-process sandbox runtime
2. Does not yet provide authentication
3. Does not yet isolate runtime resources as a separate deployed service
4. Exists to establish a stable HTTP contract for later remote execution rollout
