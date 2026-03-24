from __future__ import annotations

from fastapi import FastAPI, HTTPException, status

from app.core.logging import configure_logging
from app.schemas.execution_service import (
    ExecuteErrorResponse,
    ExecuteRequest,
    ExecuteSuccessResponse,
    ExecutionHealthResponse,
)
from app.services.sandbox import SandboxExecutionError, SandboxValidationError, execute_user_code_inline


configure_logging()

execution_service_app = FastAPI(title="QCP Execution Service")


@execution_service_app.get("/health", response_model=ExecutionHealthResponse)
def health_check() -> ExecutionHealthResponse:
    return ExecutionHealthResponse(status="ok", backend="remote")


@execution_service_app.post(
    "/execute",
    response_model=ExecuteSuccessResponse,
    responses={
        400: {"model": ExecuteErrorResponse},
        422: {"model": ExecuteErrorResponse},
        500: {"model": ExecuteErrorResponse},
    },
)
def execute_code(payload: ExecuteRequest) -> ExecuteSuccessResponse:
    try:
        result = execute_user_code_inline(payload.code)
        return ExecuteSuccessResponse(result=result)
    except SandboxValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "SANDBOX_VALIDATION_ERROR", "message": str(exc)}},
        ) from exc
    except SandboxExecutionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "SANDBOX_EXECUTION_ERROR", "message": str(exc)}},
        ) from exc
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "RUNNER_ERROR", "message": str(exc)}},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "RUNNER_ERROR", "message": str(exc)}},
        ) from exc
