from fastapi import APIRouter, HTTPException, status

from app.services.readiness_service import ReadinessService

router = APIRouter(prefix="/api", tags=["health"])
readiness_service = ReadinessService()


@router.get("/health")
def health_check() -> dict[str, str]:
    return readiness_service.check_live()


@router.get("/health/live")
def health_live() -> dict[str, str]:
    return readiness_service.check_live()


@router.get("/health/ready")
def health_ready() -> dict[str, object]:
    ready, payload = readiness_service.check_ready()
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=payload)
    return payload
