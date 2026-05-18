import { useEffect, useRef, useState } from "react";
import {
  createServerConversation,
  deleteServerConversation,
  fetchConversations,
  updateServerConversationTitle,
} from "../api";
import type { Conversation, Message, TokenUsage } from "../types";
import {
  CHARACTER_KEY,
  RECENT_KEY,
  STORAGE_KEY,
  createConversation,
  loadActiveCharacterId,
  loadConversations,
  loadRecentCharacterIds,
  nowIso,
  sortConversations,
  titleFromMessages,
  updateConversation,
} from "./conversationStorage";

export interface ConversationStore {
  activeCharacterId: string;
  recentCharacterIds: string[];
  conversations: Conversation[];
  activeConversationId: string;
  activeConversation: Conversation;
  backendAvailable: boolean;
  selectCharacter: (characterId: string) => void;
  createNewConversation: () => Conversation;
  selectConversation: (id: string) => void;
  /** Returns false and does nothing when only one conversation remains. */
  deleteConversation: (id: string) => boolean;
  addMessages: (convId: string, messages: Message[], timestamp: string) => void;
  resolveLastMessage: (convId: string, content: string, usage?: TokenUsage) => void;
  removeMessage: (convId: string, messageId: string) => void;
}

export function useConversationStore(): ConversationStore {
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
  const [backendAvailable, setBackendAvailable] = useState(false);
  // Track whether we've finished the initial backend sync so we don't double-write.
  const syncedRef = useRef(false);

  // On mount: try to load conversations from the backend.
  // If successful, replace localStorage state with server state.
  useEffect(() => {
    fetchConversations()
      .then((serverConvs) => {
        setBackendAvailable(true);
        syncedRef.current = true;
        if (serverConvs.length > 0) {
          const sorted = sortConversations(serverConvs);
          setConversations(sorted);
          setActiveConversationId((prev) =>
            sorted.some((c) => c.id === prev) ? prev : sorted[0].id,
          );
        }
      })
      .catch(() => {
        // Backend unavailable — keep localStorage state, no sync.
        syncedRef.current = true;
      });
  }, []);

  // Persist to localStorage whenever conversations change.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    window.localStorage.setItem(CHARACTER_KEY, activeCharacterId);
  }, [activeCharacterId]);

  useEffect(() => {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentCharacterIds));
  }, [recentCharacterIds]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? conversations[0];

  const selectCharacter = (characterId: string) => {
    setActiveCharacterId(characterId);
    setRecentCharacterIds((prev) =>
      [characterId, ...prev.filter((id) => id !== characterId)].slice(0, 2),
    );
  };

  const createNewConversation = (): Conversation => {
    const next = createConversation(activeCharacterId);
    setConversations((prev) => sortConversations([next, ...prev]));
    setActiveConversationId(next.id);
    if (backendAvailable) {
      createServerConversation(next).catch(() => undefined);
    }
    return next;
  };

  const selectConversation = (id: string) => { setActiveConversationId(id); };

  const deleteConversation = (id: string): boolean => {
    if (conversations.length === 1) return false;
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (id === activeConversationId) setActiveConversationId(remaining[0].id);
    if (backendAvailable) {
      deleteServerConversation(id).catch(() => undefined);
    }
    return true;
  };

  const addMessages = (convId: string, messages: Message[], timestamp: string) => {
    setConversations((prev) => {
      const next = sortConversations(
        updateConversation(prev, convId, (c) => ({
          ...c,
          title: titleFromMessages(messages),
          updatedAt: timestamp,
          messages,
        })),
      );
      // Update title on the server when it changes from "New conversation".
      if (backendAvailable) {
        const updated = next.find((c) => c.id === convId);
        if (updated && updated.title !== "New conversation") {
          updateServerConversationTitle(convId, updated.title).catch(() => undefined);
        }
      }
      return next;
    });
  };

  const resolveLastMessage = (convId: string, content: string, usage?: TokenUsage) => {
    setConversations((prev) =>
      sortConversations(
        updateConversation(prev, convId, (c) => {
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content, usage };
          return { ...c, updatedAt: nowIso(), messages: msgs };
        }),
      ),
    );
  };

  const removeMessage = (convId: string, messageId: string) => {
    setConversations((prev) =>
      sortConversations(
        updateConversation(prev, convId, (c) => ({
          ...c,
          messages: c.messages.filter((m) => m.id !== messageId),
        })),
      ),
    );
  };

  return {
    activeCharacterId,
    recentCharacterIds,
    conversations,
    activeConversationId: activeConversation?.id ?? activeConversationId,
    activeConversation,
    backendAvailable,
    selectCharacter,
    createNewConversation,
    selectConversation,
    deleteConversation,
    addMessages,
    resolveLastMessage,
    removeMessage,
  };
}
