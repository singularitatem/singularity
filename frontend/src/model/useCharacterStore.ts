import { useEffect, useState } from "react";
import type { Character } from "../types";

const CUSTOM_KEY = "singularity.custom_characters";

const BUILTIN_FALLBACK: Character[] = [
  { id: "einstein", name: "Einstein", bot_name: "Einstein", emoji: "🧑‍🔬", description: "Nobel Prize physicist. Curious, playful, and rigorously honest." },
  { id: "socrates", name: "Socrates", bot_name: "Socrates", emoji: "🏛️", description: "Ancient philosopher. Guides through questions rather than answers." },
  { id: "ada", name: "Ada Lovelace", bot_name: "Ada", emoji: "💻", description: "Pioneer of computing. Thinks in patterns, algorithms, and poetry." },
  { id: "tesla", name: "Tesla", bot_name: "Tesla", emoji: "⚡", description: "Visionary inventor. Dreams in electricity and resonant frequencies." },
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
    fetch("/api/v1/characters")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) {
          setBuiltins(
            (data as Array<{ id: string; name: string; bot_name: string; description: string; emoji: string; system_prompt?: string }>).map((c) => ({
              id: c.id,
              name: c.name,
              bot_name: c.bot_name,
              description: c.description,
              emoji: c.emoji,
              systemPrompt: c.system_prompt ?? undefined,
              isCustom: false,
            })),
          );
        }
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
