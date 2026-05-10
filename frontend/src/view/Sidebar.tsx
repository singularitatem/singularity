import type { Character, Conversation } from "../types";
import { CharacterPicker } from "./CharacterPicker";
import styles from "./Sidebar.module.css";

interface Props {
  activeCharacterId: string;
  activeConversationId: string;
  characters: Character[];
  conversations: Conversation[];
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onSelectCharacter: (characterId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  streaming: boolean;
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function Sidebar({
  activeCharacterId,
  activeConversationId,
  characters,
  conversations,
  onCreateConversation,
  onDeleteConversation,
  onSelectCharacter,
  onSelectConversation,
  streaming,
}: Props) {
  const characterMap = Object.fromEntries(characters.map((c) => [c.id, c]));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <p className={styles.brandEyebrow}>Workspace</p>
        <h2 className={styles.brandTitle}>Conversation library</h2>
      </div>

      <CharacterPicker
        activeCharacterId={activeCharacterId}
        characters={characters}
        disabled={streaming}
        onSelect={onSelectCharacter}
      />

      <div className={styles.divider} />

      <button className={styles.createButton} onClick={onCreateConversation} type="button">
        + New chat
      </button>

      <div className={styles.list}>
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeConversationId;
          const character = characterMap[conversation.characterId];
          const previewMessage = [...conversation.messages]
            .reverse()
            .find((message) => message.content.trim());
          const preview = previewMessage?.content ?? "No messages yet";

          return (
            <div
              key={conversation.id}
              className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
            >
              <button
                className={styles.itemButton}
                onClick={() => onSelectConversation(conversation.id)}
                type="button"
              >
                <div className={styles.itemTop}>
                  <span className={styles.itemTitle}>
                    {character && <span className={styles.itemEmoji}>{character.emoji}</span>}
                    {conversation.title}
                  </span>
                  <span className={styles.itemTime}>{formatTimestamp(conversation.updatedAt)}</span>
                </div>
                <span className={styles.itemPreview}>{preview}</span>
                <div className={styles.itemFooter}>
                  <span className={styles.itemCount}>{conversation.messages.length} messages</span>
                  <span className={styles.itemCount}>{isActive && streaming ? "Live" : "Saved"}</span>
                </div>
              </button>
              {conversations.length > 1 ? (
                <button
                  className={styles.deleteButton}
                  disabled={streaming}
                  onClick={() => onDeleteConversation(conversation.id)}
                  type="button"
                >
                  Delete
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
