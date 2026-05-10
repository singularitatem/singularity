import { useCallback, useEffect, useRef, useState } from "react";
import type { Character } from "../types";

interface VoiceProfile {
  namePattern?: string;
  pitch: number;
  rate: number;
}

// Voice pattern is a case-insensitive regex substring matched against voice.name.
// Falls back to any available voice when no match is found.
const CHARACTER_VOICES: Record<string, VoiceProfile> = {
  einstein:  { namePattern: "daniel|thomas|german|deutsch", pitch: 0.9,  rate: 0.82 },
  socrates:  { namePattern: "daniel|fred|thomas",           pitch: 0.75, rate: 0.75 },
  ada:       { namePattern: "samantha|karen|victoria|moira|female", pitch: 1.1, rate: 0.93 },
  tesla:     { namePattern: "alex|english (united states)|google us", pitch: 1.0, rate: 1.12 },
};

const DEFAULT_PROFILE: VoiceProfile = { pitch: 1.0, rate: 0.95 };

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

  // Voices load async on first call; keep a fresh ref.
  useEffect(() => {
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // Cancel on unmount.
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback((messageId: string, text: string, character?: Character) => {
    window.speechSynthesis.cancel();

    const profile = character ? (CHARACTER_VOICES[character.id] ?? DEFAULT_PROFILE) : DEFAULT_PROFILE;
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
