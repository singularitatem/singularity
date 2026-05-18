import { useEffect, useRef, useState } from "react";
import { ApiError, sendChat } from "../api";
import type { Character, Message } from "../types";
import { DEFAULT_MODEL, createId, nowIso } from "./conversationStorage";
import { useConversationStore } from "./useConversationStore";

interface Props {
  characters: Character[];
}

export function useChatModel({ characters }: Props) {
  const store = useConversationStore();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const activeCharacter =
    characters.find((c) => c.id === (store.activeConversation?.characterId ?? store.activeCharacterId))
    ?? characters[0];

  const createNewConversation = () => {
    if (streaming) return;
    store.createNewConversation();
    setInput("");
    setStreamError(null);
  };

  const selectConversation = (id: string) => {
    store.selectConversation(id);
    setStreamError(null);
  };

  const deleteConversation = (id: string) => {
    if (streaming) return;
    store.deleteConversation(id);
  };

  const insertEmoji = (emoji: string) => setInput((prev) => `${prev}${emoji}`);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || !store.activeConversation) return;

    const sentAt = nowIso();
    const userMsg: Message = { id: createId(), role: "user", content: trimmed, createdAt: sentAt };
    const assistantMsg: Message = { id: createId(), role: "assistant", content: "", createdAt: sentAt };
    const nextMessages = [...store.activeConversation.messages, userMsg, assistantMsg];
    const convId = store.activeConversation.id;

    store.addMessages(convId, nextMessages, sentAt);
    setInput("");
    setStreaming(true);
    setStreamError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    sendChat(
      nextMessages.map(({ role, content }) => ({ role, content })),
      {
        model: DEFAULT_MODEL,
        bot_name: activeCharacter?.bot_name,
        system_prompt: activeCharacter?.systemPrompt ?? null,
        conversation_id: store.backendAvailable ? convId : undefined,
        character_id: store.backendAvailable ? activeCharacter?.id : undefined,
        signal: controller.signal,
      },
    )
      .then((data) => {
        store.resolveLastMessage(convId, data.content, data.usage);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        // Remove the empty assistant placeholder so the conversation stays clean.
        store.removeMessage(convId, assistantMsg.id);
        const msg =
          err instanceof ApiError && err.status === 429
            ? "Rate limited — please wait a moment."
            : err.message || "Request failed. Check that the Python backend is running.";
        setStreamError(msg);
      })
      .finally(() => {
        abortRef.current = null;
        setStreaming(false);
      });
  };

  return {
    activeCharacter,
    activeCharacterId: store.activeCharacterId,
    activeConversation: store.activeConversation,
    activeConversationId: store.activeConversationId,
    conversations: store.conversations,
    createNewConversation,
    deleteConversation,
    input,
    insertEmoji,
    recentCharacterIds: store.recentCharacterIds,
    selectCharacter: store.selectCharacter,
    selectConversation,
    sendMessage,
    setInput,
    streamError,
    streaming,
  };
}
