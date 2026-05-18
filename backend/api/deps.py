import structlog
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader

from backend.services.chat import ChatService
from backend.services.conversation import ConversationService
from backend.telemetry.metrics import AUTH_FAILURE_TOTAL

log = structlog.get_logger(__name__)

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_chat_service(request: Request) -> ChatService:
    return request.app.state.chat_service


def get_conversation_service(request: Request) -> ConversationService:
    return request.app.state.conversation_service


def require_api_key(
    request: Request,
    key: str = Security(_api_key_header),
) -> None:
    """
    Validates X-API-Key when the app is configured with api_keys.
    If api_keys is empty the app runs in open mode (dev/internal use).
    """
    valid_keys: list[str] = request.app.state.settings.api_keys
    if not valid_keys:
        return
    if not key:
        AUTH_FAILURE_TOTAL.labels(reason="missing_key").inc()
        log.warning("auth.missing_key", path=request.url.path)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    if key not in valid_keys:
        AUTH_FAILURE_TOTAL.labels(reason="invalid_key").inc()
        log.warning("auth.invalid_key", path=request.url.path)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )


def get_real_ip(request: Request) -> str:
    """
    Resolve the originating client IP.
    Forwarded headers are only trusted when the direct connecting IP is in
    Settings.trusted_proxies — otherwise any client could spoof their address.
    """
    connecting_ip = request.client.host if request.client else "unknown"
    trusted: list[str] = []
    if hasattr(request.app.state, "settings"):
        trusted = request.app.state.settings.trusted_proxies
    if connecting_ip not in trusted:
        return connecting_ip
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return connecting_ip
