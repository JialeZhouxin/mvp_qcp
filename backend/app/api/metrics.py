from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/api", tags=["metrics"])
metrics_service = MetricsService()


@router.get("/metrics", response_class=PlainTextResponse)
def get_metrics() -> PlainTextResponse:
    """Export Prometheus-compatible metrics payload."""
    payload = metrics_service.render_metrics_text()
    return PlainTextResponse(content=payload, media_type="text/plain; version=0.0.4")
