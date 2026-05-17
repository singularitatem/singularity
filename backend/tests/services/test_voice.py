import pytest

from backend.services.voice import _parse_voice


@pytest.mark.parametrize("text,expected", [
    ("I am a woman with a bright voice", "female"),
    ("He is a deep-voiced gentleman", "male"),
    ("A neutral synthesized tone", "neutral"),
    ("She speaks quickly and clearly", "female"),
    ("He him his man", "male"),
])
def test_gender_detection(text, expected):
    assert _parse_voice(text).gender == expected


@pytest.mark.parametrize("text,expected_pitch", [
    ("My voice is high-pitched and bright", 1.25),
    ("I speak in a deep, gravelly baritone", 0.75),
    ("She has a warm voice", 1.1),    # female default
    ("He has a calm voice", 0.9),     # male default
    ("Neutral monotone output", 1.0), # neutral default
])
def test_pitch_detection(text, expected_pitch):
    assert _parse_voice(text).pitch == expected_pitch


@pytest.mark.parametrize("text,expected_rate", [
    ("I speak very fast and energetically", 1.15),
    ("I am slow and deliberate", 0.78),
    ("Normal pace", 0.93),
])
def test_rate_detection(text, expected_rate):
    assert _parse_voice(text).rate == expected_rate


@pytest.mark.parametrize("text,expected_accent", [
    ("I am from London, very british", "british"),
    ("G'day mate from Australia", "australian"),
    ("From Dublin, ireland", "irish"),
    ("From Edinburgh scotland", "scottish"),
    ("No particular accent", "neutral"),
])
def test_accent_detection(text, expected_accent):
    assert _parse_voice(text).accent == expected_accent
