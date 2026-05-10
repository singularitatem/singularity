from backend.core.settings import Settings
from backend.inference.interface import InferenceBackend
from backend.inference.echo import EchoBackend
from backend.inference.chai_backend import ChaiBackend


def build_inference_backend(settings: Settings) -> InferenceBackend:
    if settings.provider == "chai":
        if not settings.chai_api_key.strip():
            raise ValueError(
                "CHAI_API_KEY is required when PROVIDER=chai. "
                "Set it in .env or .env.example, or switch PROVIDER=echo for local offline development."
            )
        return ChaiBackend(
            api_key=settings.chai_api_key,
            default_user_name=settings.chai_user_name,
        )
    if settings.provider == "echo":
        return EchoBackend()
    raise ValueError(f"Unsupported provider: {settings.provider!r}")
