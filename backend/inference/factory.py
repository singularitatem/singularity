from backend.core.settings import Settings
from backend.inference.interface import InferenceBackend
from backend.inference.echo import EchoBackend
from backend.inference.chai_backend import ChaiBackend


def build_inference_backend(settings: Settings) -> InferenceBackend:
    if settings.provider == "chai":
        return ChaiBackend(
            api_key=settings.chai_api_key,
            default_user_name=settings.chai_user_name,
        )
    if settings.provider == "echo":
        return EchoBackend()
    raise ValueError(f"Unsupported provider: {settings.provider!r}")
