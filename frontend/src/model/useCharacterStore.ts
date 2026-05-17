import { useEffect, useState } from "react";
import { fetchCharacters } from "../api";
import type { Character } from "../types";

const CUSTOM_KEY = "singularity.custom_characters";

const BUILTIN_FALLBACK: Character[] = [
  { id: "einstein", name: "Einstein", bot_name: "Einstein", emoji: "🧑‍🔬", description: "Nobel Prize physicist. Curious, playful, and rigorously honest." },
  {
    id: "bob",
    name: "Bob",
    bot_name: "Bob",
    emoji: "🤖",
    description: "A wise-cracking comedy robot. Delivers jokes, puns, and hilarious stories with deadpan robotic flair.",
    systemPrompt:
      "You are Bob, a comedy robot with an encyclopedic database of jokes and funny stories. "
      + "You speak in a slightly robotic, deadpan style — but your humor is sharp and self-aware. "
      + "You love puns, one-liners, absurdist scenarios, and dramatic pauses for comedic effect. "
      + "Always end your response with a punchline or a playful robot quip. Never be mean-spirited; keep it wholesome and fun.",
  },
  {
    id: "luna",
    name: "Luna",
    bot_name: "Luna",
    emoji: "🌟",
    description: "Bubbly pop idol with a warm heart. Upbeat, sweet, and endlessly encouraging.",
    systemPrompt:
      "You are Luna, a beloved pop idol known for your bright smile and genuine warmth. "
      + "You speak in a cheerful, energetic tone with sparkles in every sentence. "
      + "You love your fans deeply and always lift people up with enthusiasm and kindness.",
  },
];

function loadCustom(): Character[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as Character[]) : [];
  } catch {
    return [];
  }
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCharacterStore() {
  const [builtins, setBuiltins] = useState<Character[]>(BUILTIN_FALLBACK);
  const [custom, setCustom] = useState<Character[]>(loadCustom);

  // Fetch builtins from backend; fallback stays in place if this fails
  useEffect(() => {
    fetchCharacters()
      .then((data) => {
        if (data.length > 0) setBuiltins(data.map((c) => ({ ...c, isCustom: false })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  }, [custom]);

  // Custom ids take precedence over builtins with the same id
  const customIds = new Set(custom.map((c) => c.id));
  const characters: Character[] = [
    ...builtins.map((c) => ({ ...c, isCustom: false })).filter((c) => !customIds.has(c.id)),
    ...custom.map((c) => ({ ...c, isCustom: true })),
  ];

  const addCharacter = (data: Omit<Character, "id" | "isCustom">): Character => {
    const next: Character = { ...data, id: createId(), isCustom: true };
    setCustom((prev) => [...prev, next]);
    return next;
  };

  const updateCharacter = (id: string, patch: Partial<Omit<Character, "id" | "isCustom">>) => {
    setCustom((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const deleteCharacter = (id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id));
  };

  return { characters, addCharacter, updateCharacter, deleteCharacter };
}
