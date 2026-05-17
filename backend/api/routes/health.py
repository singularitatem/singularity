from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def liveness() -> dict:
    """
    Liveness probe: returns 200 as long as the process is running.
    Never checks upstream dependencies — a provider outage must not
    cause the orchestrator to restart this process.
    """
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(request: Request) -> JSONResponse:
    """
    Readiness probe: returns 200 only when the upstream provider is
    reachable. Use this for load-balancer and k8s readiness checks.
    """
    backend = request.app.state.backend
    ok = await backend.health_check()
    body = {"status": "ok" if ok else "degraded"}
    return JSONResponse(body, status_code=200 if ok else 503)
