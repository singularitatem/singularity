import { useCallback, useEffect, useRef, useState } from "react";
import type { Character } from "../types";

interface VoiceProfile {
  namePattern?: string;
  pitch: number;
  rate: number;
}

// Hardcoded profiles for built-in characters.
const CHARACTER_VOICES: Record<string, VoiceProfile> = {
  einstein: { namePattern: "daniel|thomas|german|deutsch", pitch: 0.9,  rate: 0.82 },
  bob:      { namePattern: "alex|google us english",       pitch: 1.0,  rate: 1.0  },
  luna:     { namePattern: "samantha|zoe|victoria|karen",  pitch: 1.15, rate: 0.82 },
};

// Infer a voice profile for custom characters from their description + system prompt.
function inferVoiceProfile(character: Character): VoiceProfile {
  const text = [character.name, character.description, character.systemPrompt ?? ""]
    .join(" ")
    .toLowerCase();

  let pitch = 1.0;
  let rate = 0.95;
  let namePattern: string | undefined;

  // ── Gender ──
  const femaleScore = (text.match(/\b(she|her|woman|female|lady|queen|princess|girl|witch|goddess|mrs|ms|sister|mother|aunt)\b/g) ?? []).length;
  const maleScore   = (text.match(/\b(he|him|man|male|lord|king|prince|boy|wizard|god|mr|sir|brother|father|uncle)\b/g) ?? []).length;
  if (femaleScore > maleScore) {
    pitch += 0.18;
    namePattern = "samantha|karen|victoria|moira|zoe|fiona|female";
  } else if (maleScore > femaleScore) {
    pitch -= 0.05;
    namePattern = "daniel|alex|fred|thomas|male";
  }

  // ── Age ──
  if (/\b(ancient|elder|old|aged|wise|sage|veteran|grandfather|centuries|immortal)\b/.test(text)) {
    pitch -= 0.1;
    rate  -= 0.13;
  }
  if (/\b(young|child|kid|teen|student|junior|playful|cheerful)\b/.test(text)) {
    pitch += 0.1;
    rate  += 0.08;
  }

  // ── Energy ──
  if (/\b(energetic|enthusiastic|excited|lively|vibrant|passionate|fierce|bold|intense)\b/.test(text)) {
    rate += 0.13;
  }
  if (/\b(calm|slow|measured|thoughtful|deliberate|careful|peaceful|serene|gentle|soft)\b/.test(text)) {
    rate -= 0.12;
  }

  // ── Accent / region (overrides gender voice preference) ──
  if (/\b(british|england|london|uk|cockney|oxford)\b/.test(text)) {
    namePattern = "daniel|british";
  } else if (/\b(irish|ireland|dublin)\b/.test(text)) {
    namePattern = "moira|irish";
  } else if (/\b(australian|australia|sydney|melbourne)\b/.test(text)) {
    namePattern = "karen|australian";
  } else if (/\b(scottish|scotland|edinburgh)\b/.test(text)) {
    namePattern = "fiona|scottish";
  } else if (/\b(french|france|paris)\b/.test(text)) {
    namePattern = "thomas|french";
  }

  // ── Tone ──
  if (/\b(robot|ai|android|synthetic|machine|digital)\b/.test(text)) {
    pitch = 0.85;
    rate  = 1.05;
    namePattern = "fred|zarvox";
  }
  if (/\b(villain|dark|sinister|menacing|evil|shadow)\b/.test(text)) {
    pitch -= 0.15;
    rate  -= 0.08;
  }

  return {
    pitch: Math.max(0.5, Math.min(2.0, pitch)),
    rate:  Math.max(0.5, Math.min(1.8, rate)),
    namePattern,
  };
}

function storedProfileToVoiceProfile(vp: NonNullable<Character["voiceProfile"]>): VoiceProfile {
  const { pitch, rate, gender = "neutral", accent = "neutral" } = vp;
  const isFemale = gender === "female";
  let namePattern: string | undefined;
  switch (accent) {
    case "british":    namePattern = isFemale ? "moira|british" : "daniel|british"; break;
    case "australian": namePattern = "karen|australian"; break;
    case "irish":      namePattern = "moira|irish"; break;
    case "scottish":   namePattern = "fiona|scottish"; break;
    case "american":   namePattern = isFemale ? "samantha|zoe" : "alex"; break;
    default:           namePattern = isFemale ? "samantha|karen|victoria|moira" : gender === "male" ? "daniel|alex|thomas" : undefined;
  }
  return { pitch, rate, namePattern };
}

function resolveProfile(character: Character): VoiceProfile {
  // Stored profile (from LLM inference) takes priority over everything.
  if (character.voiceProfile) return storedProfileToVoiceProfile(character.voiceProfile);
  // Built-in characters use hand-tuned profiles; custom characters use keyword heuristic.
  return character.isCustom
    ? inferVoiceProfile(character)
    : (CHARACTER_VOICES[character.id] ?? inferVoiceProfile(character));
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "code block")
    .replace(/`[^`]+`/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*>+]\s/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

function pickVoice(voices: SpeechSynthesisVoice[], profile: VoiceProfile): SpeechSynthesisVoice | null {
  if (!profile.namePattern || voices.length === 0) return null;
  const re = new RegExp(profile.namePattern, "i");
  return voices.find((v) => re.test(v.name)) ?? null;
}

export function useSpeech() {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback((messageId: string, text: string, character?: Character) => {
    window.speechSynthesis.cancel();

    const profile = character ? resolveProfile(character) : { pitch: 1.0, rate: 0.95 };
    const plain = stripMarkdown(text);
    if (!plain) return;

    const utterance = new SpeechSynthesisUtterance(plain);
    const voice = pickVoice(voicesRef.current, profile);
    if (voice) utterance.voice = voice;
    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    utteranceRef.current = utterance;
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speakingMessageId, speak, stop };
}
