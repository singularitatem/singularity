import { useEffect, useRef, useState } from "react";
import type { Conversation, Message, StreamChunk } from "../types";

const DEFAULT_MODEL = "default";
const STORAGE_KEY = "singularity.conversations";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createConversation(): Conversation {
  const timestamp = nowIso();
  return {
    id: createId(),
    title: "New conversation",
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
}

function loadConversations() {
  if (typeof window === "undefined") {
    return [createConversation()];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [createConversation()];
    }

    const parsed = JSON.parse(stored) as Conversation[];
    return parsed.length > 0 ? parsed : [createConversation()];
  } catch {
    return [createConversation()];
  }
}

function buildWebSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/v1/chat/stream`;
}

function titleFromMessages(messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) {
    return "New conversation";
  }

  const compact = firstUserMessage.content.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "New conversation";
  }

  return compact.length > 32 ? `${compact.slice(0, 32)}...` : compact;
}

function updateConversationRecord(
  conversations: Conversation[],
  conversationId: string,
  updater: (conversation: Conversation) => Conversation,
) {
  return conversations.map((conversation) =>
    conversation.id === conversationId ? updater(conversation) : conversation,
  );
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function useChatModel() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations(),
  );
  const [activeConversationId, setActiveConversationId] = useState(
    () => loadConversations()[0]?.id ?? createConversation().id,
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (!conversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(conversations[0]?.id ?? createConversation().id);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ??
    conversations[0];

  const createNewConversation = () => {
    if (streaming) return;

    const nextConversation = createConversation();
    setConversations((prev) => sortConversations([nextConversation, ...prev]));
    setActiveConversationId(nextConversation.id);
    setInput("");
    setStreamError(null);
  };

  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setStreamError(null);
  };

  const deleteConversation = (conversationId: string) => {
    if (streaming || conversations.length === 1) return;

    const remaining = conversations.filter(
      (conversation) => conversation.id !== conversationId,
    );
    setConversations(remaining);

    if (conversationId === activeConversationId) {
      setActiveConversationId(remaining[0].id);
    }
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => `${prev}${emoji}`);
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || !activeConversation) return;

    const sentAt = nowIso();
    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: sentAt,
    };
    const assistantMessage: Message = {
      id: createId(),
      role: "assistant",
      content: "",
      createdAt: sentAt,
    };

    const nextMessages = [...activeConversation.messages, userMessage, assistantMessage];
    const nextTitle = titleFromMessages(nextMessages);

    setConversations((prev) =>
      sortConversations(
        updateConversationRecord(prev, activeConversation.id, (conversation) => ({
          ...conversation,
          title: nextTitle,
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
      ws.send(
        JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          model: DEFAULT_MODEL,
        }),
      );
    };

    ws.onmessage = (event) => {
      const chunk: StreamChunk = JSON.parse(event.data);
      if (chunk.done) {
        ws.close();
        setStreaming(false);
        return;
      }

      setConversations((prev) =>
        sortConversations(
          updateConversationRecord(prev, activeConversation.id, (conversation) => {
            const updatedMessages = [...conversation.messages];
            const last = updatedMessages[updatedMessages.length - 1];
            updatedMessages[updatedMessages.length - 1] = {
              ...last,
              content: last.content + chunk.delta,
            };

            return {
              ...conversation,
              updatedAt: nowIso(),
              messages: updatedMessages,
            };
          }),
        ),
      );
    };

    ws.onerror = () => {
      setStreamError("Connection problem. Check that the Python backend is running.");
      setStreaming(false);
    };

    ws.onclose = () => {
      wsRef.current = null;
      setStreaming(false);
    };
  };

  return {
    activeConversation,
    activeConversationId,
    conversations,
    createNewConversation,
    deleteConversation,
    input,
    insertEmoji,
    selectConversation,
    sendMessage,
    setInput,
    streamError,
    streaming,
  };
}
