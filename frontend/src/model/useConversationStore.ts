import { useEffect, useState } from "react";
import type { Conversation, Message } from "../types";
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
  selectCharacter: (characterId: string) => void;
  createNewConversation: () => Conversation;
  selectConversation: (id: string) => void;
  /** Returns false and does nothing when only one conversation remains. */
  deleteConversation: (id: string) => boolean;
  addMessages: (convId: string, messages: Message[], timestamp: string) => void;
  resolveLastMessage: (convId: string, content: string) => void;
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
    return next;
  };

  const selectConversation = (id: string) => { setActiveConversationId(id); };

  const deleteConversation = (id: string): boolean => {
    if (conversations.length === 1) return false;
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (id === activeConversationId) setActiveConversationId(remaining[0].id);
    return true;
  };

  const addMessages = (convId: string, messages: Message[], timestamp: string) => {
    setConversations((prev) =>
      sortConversations(
        updateConversation(prev, convId, (c) => ({
          ...c,
          title: titleFromMessages(messages),
          updatedAt: timestamp,
          messages,
        })),
      ),
    );
  };

  const resolveLastMessage = (convId: string, content: string) => {
    setConversations((prev) =>
      sortConversations(
        updateConversation(prev, convId, (c) => {
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
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
    activeConversationId,
    activeConversation,
    selectCharacter,
    createNewConversation,
    selectConversation,
    deleteConversation,
    addMessages,
    resolveLastMessage,
    removeMessage,
  };
}
