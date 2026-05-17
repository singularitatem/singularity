import { useEffect, useRef, useState } from "react";
import type { Character, ChatResponse, Conversation, Message } from "../types";

const DEFAULT_MODEL = "default";
const STORAGE_KEY = "singularity.conversations";
const CHARACTER_KEY = "singularity.characterId";
const RECENT_KEY = "singularity.recentCharacterIds";
const DEFAULT_CHARACTER_ID = "einstein";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createConversation(characterId: string): Conversation {
  const ts = nowIso();
  return { id: createId(), title: "New conversation", characterId, createdAt: ts, updatedAt: ts, messages: [] };
}

function loadConversations(defaultCharacterId: string): Conversation[] {
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

function loadActiveCharacterId(): string {
  try { return window.localStorage.getItem(CHARACTER_KEY) ?? DEFAULT_CHARACTER_ID; }
  catch { return DEFAULT_CHARACTER_ID; }
}

function loadRecentCharacterIds(activeId: string): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    return [activeId, ...parsed.filter((id) => id !== activeId)].slice(0, 2);
  } catch {
    return [activeId];
  }
}

function titleFromMessages(messages: Message[]) {
  const first = messages.find((m) => m.role === "user");
  if (!first?.content.trim()) return "New conversation";
  const compact = first.content.replace(/\s+/g, " ").trim();
  return compact.length > 32 ? `${compact.slice(0, 32)}…` : compact;
}

function updateConversation(convs: Conversation[], id: string, fn: (c: Conversation) => Conversation) {
  return convs.map((c) => (c.id === id ? fn(c) : c));
}

function sortConversations(convs: Conversation[]) {
  return [...convs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

interface Props {
  characters: Character[];
}

export function useChatModel({ characters }: Props) {
  const [activeCharacterId, setActiveCharacterId] = useState<string>(loadActiveCharacterId);
  const [recentCharacterIds, setRecentCharacterIds] = useState<string[]>(() =>
    loadRecentCharacterIds(loadActiveCharacterId()),
  );
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations(loadActiveCharacterId()),
  );
  const [activeConversationId, setActiveConversationId] = useState(
    () => loadConversations(loadActiveCharacterId())[0]?.id,
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    window.localStorage.setItem(CHARACTER_KEY, activeCharacterId);
  }, [activeCharacterId]);

  useEffect(() => {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentCharacterIds));
  }, [recentCharacterIds]);

  useEffect(() => {
    if (!conversations.some((c) => c.id === activeConversationId)) {
      setActiveConversationId(conversations[0]?.id);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? conversations[0];

  const activeCharacter =
    characters.find((c) => c.id === (activeConversation?.characterId ?? activeCharacterId))
    ?? characters[0];

  const selectCharacter = (characterId: string) => {
    setActiveCharacterId(characterId);
    setRecentCharacterIds((prev) =>
      [characterId, ...prev.filter((id) => id !== characterId)].slice(0, 2),
    );
  };

  const createNewConversation = () => {
    if (streaming) return;
    const next = createConversation(activeCharacterId);
    setConversations((prev) => sortConversations([next, ...prev]));
    setActiveConversationId(next.id);
    setInput("");
    setStreamError(null);
  };

  const selectConversation = (id: string) => { setActiveConversationId(id); setStreamError(null); };

  const deleteConversation = (id: string) => {
    if (streaming || conversations.length === 1) return;
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (id === activeConversationId) setActiveConversationId(remaining[0].id);
  };

  const insertEmoji = (emoji: string) => setInput((prev) => `${prev}${emoji}`);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || !activeConversation) return;

    const sentAt = nowIso();
    const userMsg: Message = { id: createId(), role: "user", content: trimmed, createdAt: sentAt };
    const assistantMsg: Message = { id: createId(), role: "assistant", content: "", createdAt: sentAt };
    const nextMessages = [...activeConversation.messages, userMsg, assistantMsg];

    setConversations((prev) =>
      sortConversations(
        updateConversation(prev, activeConversation.id, (c) => ({
          ...c,
          title: titleFromMessages(nextMessages),
          updatedAt: sentAt,
          messages: nextMessages,
        })),
      ),
    );
    setInput("");
    setStreaming(true);
    setStreamError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    fetch("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        model: DEFAULT_MODEL,
        bot_name: activeCharacter?.bot_name,
        system_prompt: activeCharacter?.systemPrompt ?? null,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json() as Promise<ChatResponse>;
      })
      .then((data) => {
        setConversations((prev) =>
          sortConversations(
            updateConversation(prev, activeConversation.id, (c) => {
              const msgs = [...c.messages];
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: data.content };
              return { ...c, updatedAt: nowIso(), messages: msgs };
            }),
          ),
        );
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setStreamError(err.message || "Request failed. Check that the Python backend is running.");
        }
      })
      .finally(() => {
        abortRef.current = null;
        setStreaming(false);
      });
  };

  return {
    activeCharacter,
    activeCharacterId,
    activeConversation,
    activeConversationId,
    conversations,
    createNewConversation,
    deleteConversation,
    input,
    insertEmoji,
    recentCharacterIds,
    selectCharacter,
    selectConversation,
    sendMessage,
    setInput,
    streamError,
    streaming,
  };
}
