import type { Conversation, Message } from "../types";

export const DEFAULT_MODEL = "default";
export const STORAGE_KEY = "singularity.conversations";
export const CHARACTER_KEY = "singularity.characterId";
export const RECENT_KEY = "singularity.recentCharacterIds";
export const DEFAULT_CHARACTER_ID = "einstein";

export function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createConversation(characterId: string): Conversation {
  const ts = nowIso();
  return { id: createId(), title: "New conversation", characterId, createdAt: ts, updatedAt: ts, messages: [] };
}

export function loadConversations(defaultCharacterId: string): Conversation[] {
  if (typeof window === "undefined") return [createConversation(defaultCharacterId)];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createConversation(defaultCharacterId)];
    const parsed = JSON.parse(raw) as Conversation[];
    const valid = parsed.map((c) => ({ ...c, characterId: c.characterId ?? defaultCharacterId }));
    return valid.length > 0 ? valid : [createConversation(defaultCharacterId)];
  } catch {
    return [createConversation(defaultCharacterId)];
  }
}

export function loadActiveCharacterId(): string {
  try { return window.localStorage.getItem(CHARACTER_KEY) ?? DEFAULT_CHARACTER_ID; }
  catch { return DEFAULT_CHARACTER_ID; }
}

export function loadRecentCharacterIds(activeId: string): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    return [activeId, ...parsed.filter((id) => id !== activeId)].slice(0, 2);
  } catch {
    return [activeId];
  }
}

export function titleFromMessages(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first?.content.trim()) return "New conversation";
  const compact = first.content.replace(/\s+/g, " ").trim();
  return compact.length > 32 ? `${compact.slice(0, 32)}…` : compact;
}

export function updateConversation(
  convs: Conversation[],
  id: string,
  fn: (c: Conversation) => Conversation,
): Conversation[] {
  return convs.map((c) => (c.id === id ? fn(c) : c));
}

export function sortConversations(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
