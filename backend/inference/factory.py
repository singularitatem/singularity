from backend.core.settings import Settings
from backend.inference.interface import InferenceBackend
from backend.inference.echo import EchoBackend


def build_inference_backend(settings: Settings) -> InferenceBackend:
    if settings.provider == "echo":
        return EchoBackend()
    raise ValueError(f"Unsupported provider: {settings.provider!r}")
