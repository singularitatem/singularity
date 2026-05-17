import re
from typing import Optional

from backend.core.models import VoiceProfile
from backend.inference.interface import ChatMessage, ChatRequest
from backend.services.chat import ChatService

_VOICE_QUESTION = (
    "In two or three sentences, describe your speaking voice. "
    "Mention whether you are male or female, whether your voice is high-pitched or low-pitched, "
    "and whether you speak quickly or slowly."
)


def _voice_prompt(name: str, description: Optional[str], system_prompt: Optional[str]) -> str:
    parts = [f"Character name: {name}."]
    if description:
        parts.append(f"Character description: {description}")
    if system_prompt:
        parts.append(f"Character system prompt: {system_prompt}")
    parts.append(_VOICE_QUESTION)
    return " ".join(parts)


def _parse_voice(text: str) -> VoiceProfile:
    t = text.lower()

    female = len(re.findall(r"\b(female|woman|feminine|lady|girl|she|her)\b", t))
    male = len(re.findall(r"\b(male|man|masculine|gentleman|boy|he|him|his|deep|gruff|gravelly|baritone)\b", t))
    gender = "female" if female > male else "male" if male > 0 else "neutral"

    if re.search(r"\b(high.pitch|high pitch|squeaky|shrill|light|airy|bright|soprano)\b", t):
        pitch = 1.25
    elif re.search(r"\b(low.pitch|low pitch|deep|bass|gravelly|gruff|booming|baritone|rumbling)\b", t):
        pitch = 0.75
    elif gender == "female":
        pitch = 1.1
    elif gender == "male":
        pitch = 0.9
    else:
        pitch = 1.0

    if re.search(r"\b(fast|quick|rapid|swift|hurried|brisk|energetic)\b", t):
        rate = 1.15
    elif re.search(r"\b(slow|deliberate|measured|careful|gentle|calm|wise|aged|ancient|methodical|paced)\b", t):
        rate = 0.78
    else:
        rate = 0.93

    if re.search(r"\b(british|england|london|uk|cockney|oxford|eton)\b", t):
        accent = "british"
    elif re.search(r"\b(australian|australia|sydney|mate)\b", t):
        accent = "australian"
    elif re.search(r"\b(irish|ireland|dublin)\b", t):
        accent = "irish"
    elif re.search(r"\b(scottish|scotland|edinburgh|highland)\b", t):
        accent = "scottish"
    else:
        accent = "neutral"

    return VoiceProfile(pitch=pitch, rate=rate, gender=gender, accent=accent)


async def infer_voice_profile(
    *,
    name: str,
    bot_name: Optional[str],
    description: Optional[str],
    system_prompt: Optional[str],
    service: ChatService,
) -> VoiceProfile:
    request = ChatRequest(
        messages=[
            ChatMessage(
                role="user",
                content=_voice_prompt(
                    name=name,
                    description=description,
                    system_prompt=system_prompt,
                ),
            )
        ],
        model="default",
        bot_name=bot_name or name,
        system_prompt=system_prompt,
    )
    raw = await service.chat(request)
    return _parse_voice(raw)
