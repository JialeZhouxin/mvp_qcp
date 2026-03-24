import base64
import binascii
import json
import os

from app.services.sandbox import SandboxExecutionError, SandboxValidationError, run_with_limits

CODE_B64_ENV = "EXEC_CODE_B64"
TIMEOUT_ENV = "EXEC_TIMEOUT_SECONDS"


def _read_code() -> str:
    raw_code = os.getenv(CODE_B64_ENV)
    if not raw_code:
        raise ValueError(f"{CODE_B64_ENV} is required")
    try:
        return base64.b64decode(raw_code.encode("ascii")).decode("utf-8")
    except (UnicodeEncodeError, binascii.Error, UnicodeDecodeError) as exc:
        raise ValueError("failed to decode EXEC_CODE_B64") from exc


def _read_timeout() -> int:
    raw_timeout = os.getenv(TIMEOUT_ENV, "60")
    timeout = int(raw_timeout)
    if timeout <= 0:
        raise ValueError("timeout must be positive")
    return timeout


def _emit(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False))


def main() -> int:
    try:
        code = _read_code()
        timeout_seconds = _read_timeout()
        result = run_with_limits(code, timeout_seconds=timeout_seconds)
        _emit({"ok": True, "result": result})
        return 0
    except SandboxValidationError as exc:
        _emit({"ok": False, "error": {"code": "SANDBOX_VALIDATION_ERROR", "message": str(exc)}})
        return 2
    except SandboxExecutionError as exc:
        _emit({"ok": False, "error": {"code": "SANDBOX_EXECUTION_ERROR", "message": str(exc)}})
        return 3
    except (ValueError, TypeError) as exc:
        _emit({"ok": False, "error": {"code": "RUNNER_ERROR", "message": str(exc)}})
        return 4


if __name__ == "__main__":
    raise SystemExit(main())
