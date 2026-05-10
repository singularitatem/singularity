import { useEffect, useRef, useState } from "react";
import type { Character, Conversation, Message, StreamChunk } from "../types";

const DEFAULT_MODEL = "default";
const STORAGE_KEY = "singularity.conversations";
const CHARACTER_KEY = "singularity.characterId";
const DEFAULT_CHARACTER_ID = "einstein";

const FALLBACK_CHARACTERS: Character[] = [
  { id: "einstein", name: "Einstein", bot_name: "Einstein", description: "Nobel Prize physicist. Curious, playful, and rigorously honest.", emoji: "🧑‍🔬" },
  { id: "socrates", name: "Socrates", bot_name: "Socrates", description: "Ancient philosopher. Guides through questions rather than answers.", emoji: "🏛️" },
  { id: "ada", name: "Ada Lovelace", bot_name: "Ada", description: "Pioneer of computing. Thinks in patterns, algorithms, and poetry.", emoji: "💻" },
  { id: "tesla", name: "Tesla", bot_name: "Tesla", description: "Visionary inventor. Dreams in electricity and resonant frequencies.", emoji: "⚡" },
];

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createConversation(characterId: string): Conversation {
  const timestamp = nowIso();
  return { id: createId(), title: "New conversation", characterId, createdAt: timestamp, updatedAt: timestamp, messages: [] };
}

function loadConversations(defaultCharacterId: string): Conversation[] {
  if (typeof window === "undefined") return [createConversation(defaultCharacterId)];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [createConversation(defaultCharacterId)];
    const parsed = JSON.parse(stored) as Conversation[];
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

function buildWebSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/v1/chat/stream`;
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

export function useChatModel() {
  const [characters, setCharacters] = useState<Character[]>(FALLBACK_CHARACTERS);
  const [activeCharacterId, setActiveCharacterId] = useState<string>(loadActiveCharacterId);
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations(loadActiveCharacterId()),
  );
  const [activeConversationId, setActiveConversationId] = useState(
    () => loadConversations(loadActiveCharacterId())[0]?.id,
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch characters from backend, fall back to hardcoded list
  useEffect(() => {
    fetch("/api/v1/characters")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (Array.isArray(data) && data.length > 0) setCharacters(data); })
      .catch(() => {});
  }, []);

  // Persist conversations and active character
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    window.localStorage.setItem(CHARACTER_KEY, activeCharacterId);
  }, [activeCharacterId]);

  // Keep activeConversationId valid
  useEffect(() => {
    if (!conversations.some((c) => c.id === activeConversationId)) {
      setActiveConversationId(conversations[0]?.id);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? conversations[0];

  const activeCharacter =
    characters.find((c) => c.id === (activeConversation?.characterId ?? activeCharacterId))
    ?? characters[0];

  const selectCharacter = (characterId: string) => {
    setActiveCharacterId(characterId);
  };

  const createNewConversation = () => {
    if (streaming) return;
    const next = createConversation(activeCharacterId);
    setConversations((prev) => sortConversations([next, ...prev]));
    setActiveConversationId(next.id);
    setInput("");
    setStreamError(null);
  };

  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setStreamError(null);
  };

  const deleteConversation = (conversationId: string) => {
    if (streaming || conversations.length === 1) return;
    const remaining = conversations.filter((c) => c.id !== conversationId);
    setConversations(remaining);
    if (conversationId === activeConversationId) setActiveConversationId(remaining[0].id);
  };

  const insertEmoji = (emoji: string) => setInput((prev) => `${prev}${emoji}`);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || !activeConversation) return;

    const sentAt = nowIso();
    const userMessage: Message = { id: createId(), role: "user", content: trimmed, createdAt: sentAt };
    const assistantMessage: Message = { id: createId(), role: "assistant", content: "", createdAt: sentAt };
    const nextMessages = [...activeConversation.messages, userMessage, assistantMessage];

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

    const ws = new WebSocket(buildWebSocketUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        model: DEFAULT_MODEL,
        bot_name: activeCharacter?.bot_name,
      }));
    };

    ws.onmessage = (event) => {
      const chunk: StreamChunk = JSON.parse(event.data);
      if (chunk.done) { ws.close(); setStreaming(false); return; }
      setConversations((prev) =>
        sortConversations(
          updateConversation(prev, activeConversation.id, (c) => {
            const msgs = [...c.messages];
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = { ...last, content: last.content + chunk.delta };
            return { ...c, updatedAt: nowIso(), messages: msgs };
          }),
        ),
      );
    };

    ws.onerror = () => {
      setStreamError("Connection problem. Check that the Python backend is running.");
      setStreaming(false);
    };

    ws.onclose = () => { wsRef.current = null; setStreaming(false); };
  };

  return {
    activeCharacter,
    activeCharacterId,
    activeConversation,
    activeConversationId,
    characters,
    conversations,
    createNewConversation,
    deleteConversation,
    input,
    insertEmoji,
    selectCharacter,
    selectConversation,
    sendMessage,
    setInput,
    streamError,
    streaming,
  };
}
