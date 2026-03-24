from fastapi import APIRouter, HTTPException, status

from app.services.readiness_service import ReadinessService

router = APIRouter(prefix="/api", tags=["health"])
readiness_service = ReadinessService()


@router.get("/health")
def health_check() -> dict[str, str]:
    """Return service liveness status for generic health probes."""
    return readiness_service.check_live()


@router.get("/health/live")
def health_live() -> dict[str, str]:
    """Return service liveness status for explicit live endpoint."""
    return readiness_service.check_live()


@router.get("/health/ready")
def health_ready() -> dict[str, object]:
    """Return dependency readiness status and fail with 503 when unavailable."""
    ready, payload = readiness_service.check_ready()
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=payload)
    return payload
