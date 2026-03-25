from __future__ import annotations

from fastapi import FastAPI, HTTPException, status

from app.core.logging import configure_logging
from app.schemas.execution_service import (
    ExecuteErrorResponse,
    ExecuteRequest,
    ExecuteSuccessResponse,
    ExecutionHealthResponse,
)
from app.services.execution.base import ExecutionBackendError
from app.services.execution.gateway import get_execution_gateway


configure_logging()

execution_service_app = FastAPI(title="QCP Execution Service")

VALIDATION_ERROR_CODES = {"SANDBOX_VALIDATION_ERROR"}
EXECUTION_ERROR_CODES = {"SANDBOX_EXECUTION_ERROR", "EXECUTION_TIMEOUT"}
MISCONFIGURED_ERROR_CODE = "EXECUTION_SERVICE_MISCONFIGURED"


def _raise_api_error(status_code: int, code: str, message: str) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={"error": {"code": code, "message": message}},
    )


def _get_execution_gateway():
    try:
        gateway = get_execution_gateway()
    except ValueError as exc:
        _raise_api_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            MISCONFIGURED_ERROR_CODE,
            str(exc),
        )

    if gateway.name == "remote":
        _raise_api_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            MISCONFIGURED_ERROR_CODE,
            "execution-service cannot use remote execution backend",
        )
    return gateway


def _map_backend_error(exc: ExecutionBackendError) -> None:
    if exc.code in VALIDATION_ERROR_CODES:
        _raise_api_error(status.HTTP_400_BAD_REQUEST, exc.code, exc.message)
    if exc.code in EXECUTION_ERROR_CODES:
        _raise_api_error(status.HTTP_422_UNPROCESSABLE_ENTITY, exc.code, exc.message)
    _raise_api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, exc.code, exc.message)


@execution_service_app.get("/health", response_model=ExecutionHealthResponse)
def health_check() -> ExecutionHealthResponse:
    gateway = _get_execution_gateway()
    try:
        payload = gateway.check_health()
    except ExecutionBackendError as exc:
        _map_backend_error(exc)
    except HTTPException:
        raise
    except Exception as exc:
        _raise_api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "RUNNER_ERROR", str(exc))

    backend_name = str(payload.get("backend", gateway.name))
    return ExecutionHealthResponse(status="ok", backend=backend_name)


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
    gateway = _get_execution_gateway()
    try:
        result = gateway.execute(payload.code, timeout_seconds=payload.timeout_seconds)
        return ExecuteSuccessResponse(result=result)
    except ExecutionBackendError as exc:
        _map_backend_error(exc)
    except HTTPException:
        raise
    except ValueError as exc:
        _raise_api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "RUNNER_ERROR", str(exc))
    except Exception as exc:
        _raise_api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "RUNNER_ERROR", str(exc))
