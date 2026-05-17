from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader

from backend.services.chat import ChatService

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_chat_service(request: Request) -> ChatService:
    return request.app.state.chat_service


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
    if not key or key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )


def get_real_ip(request: Request) -> str:
    """
    Resolve the originating client IP, respecting common proxy headers.
    Falls back to the direct connection address.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"
