import pytest

from backend.inference.interface import ChatRequest
from backend.services.voice import _parse_voice, _voice_prompt, infer_voice_profile


@pytest.mark.parametrize(
    "text,expected_gender",
    [
        ("I am a woman with a high voice", "female"),
        ("He is a deep-voiced gentleman", "male"),
        ("This is a neutral synthesized tone", "neutral"),
        ("She speaks quickly and brightly", "female"),
    ],
)
def test_gender_detection(text, expected_gender):
    assert _parse_voice(text).gender == expected_gender


@pytest.mark.parametrize(
    "text,expected_pitch",
    [
        ("My voice is high-pitched and bright", 1.25),
        ("I speak in a deep, gravelly baritone", 0.75),
        ("She has a warm female voice", 1.1),
        ("He has a calm male voice", 0.9),
        ("Neutral monotone output", 1.0),
    ],
)
def test_pitch_detection(text, expected_pitch):
    assert _parse_voice(text).pitch == expected_pitch


@pytest.mark.parametrize(
    "text,expected_rate",
    [
        ("I speak very fast and energetically", 1.15),
        ("I am slow and deliberate in my speech", 0.78),
        ("I speak at a normal pace", 0.93),
    ],
)
def test_rate_detection(text, expected_rate):
    assert _parse_voice(text).rate == expected_rate


@pytest.mark.parametrize(
    "text,expected_accent",
    [
        ("I am from London, England — very british", "british"),
        ("G'day mate, I'm from Australia", "australian"),
        ("Top of the mornin, I'm from Dublin ireland", "irish"),
        ("Och aye, from Edinburgh scotland", "scottish"),
        ("I speak with no particular accent", "neutral"),
    ],
)
def test_accent_detection(text, expected_accent):
    assert _parse_voice(text).accent == expected_accent


def test_voice_prompt_includes_description_and_system_prompt():
    prompt = _voice_prompt(
        name="Luna",
        description="Warm pop idol with bright energy.",
        system_prompt="Speak with sparkle and kindness.",
    )
    assert "Character name: Luna." in prompt
    assert "Character description: Warm pop idol with bright energy." in prompt
    assert "Character system prompt: Speak with sparkle and kindness." in prompt


@pytest.mark.asyncio
async def test_infer_voice_profile_uses_description_and_system_prompt():
    captured: dict[str, ChatRequest] = {}

    class FakeService:
        async def chat(self, request: ChatRequest) -> str:
            captured["request"] = request
            return "A warm female voice with a bright british tone."

    await infer_voice_profile(
        name="Luna",
        bot_name="Luna",
        description="Warm pop idol with bright energy.",
        system_prompt="Speak with sparkle and kindness.",
        service=FakeService(),
    )

    content = captured["request"].messages[0].content
    assert "Character description: Warm pop idol with bright energy." in content
    assert "Character system prompt: Speak with sparkle and kindness." in content
