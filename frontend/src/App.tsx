import { useState } from "react";
import { useCharacterStore } from "./model/useCharacterStore";
import { useChatModel } from "./model/useChatModel";
import { useSpeech } from "./model/useSpeech";
import type { Character } from "./types";
import { CharacterDetailModal } from "./view/CharacterDetailModal";
import { CharacterModal } from "./view/CharacterModal";
import { ChatWindow } from "./view/ChatWindow";
import { InputBar } from "./view/InputBar";
import { Sidebar } from "./view/Sidebar";
import styles from "./App.module.css";

export default function App() {
  const { characters, addCharacter, updateCharacter, deleteCharacter } = useCharacterStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailCharacter, setDetailCharacter] = useState<Character | null | undefined>(undefined);
  // undefined = closed, null = create mode, Character = edit mode

  const {
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
    setInput,
    streamError,
    streaming,
    sendMessage,
  } = useChatModel({ characters });

  const recentCharacters = recentCharacterIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is typeof characters[0] => c !== undefined);

  const { speakingMessageId, speak, stop } = useSpeech();

  return (
    <div className={styles.page}>
      <div className={styles.aurora} />
      <div className={styles.shell}>
        <Sidebar
          activeCharacterId={activeCharacterId}
          activeConversationId={activeConversationId}
          allCharacters={characters}
          recentCharacters={recentCharacters}
          conversations={conversations}
          onCreateConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
          onManageCharacters={() => setIsModalOpen(true)}
          onOpenCharacterDetail={(c) => setDetailCharacter(c)}
          onSelectCharacter={selectCharacter}
          onSelectConversation={selectConversation}
          streaming={streaming}
        />

        <main className={styles.main}>
          <header className={styles.header}>
            <h1 className={styles.title}>Singularity</h1>
            <div className={styles.headerMeta}>
              <button
                className={styles.modelBadge}
                onClick={() => setIsModalOpen(true)}
                type="button"
                title="Switch character"
              >
                {activeCharacter ? `${activeCharacter.emoji} ${activeCharacter.name}` : "No character"}
              </button>
              <span className={`${styles.status} ${streaming ? styles.statusStreaming : styles.statusReady}`}>
                <span className={styles.statusDot} />
                {streaming ? "Responding…" : "Ready"}
              </span>
            </div>
          </header>

          <section className={styles.chatCard}>
            <div className={styles.chatHeader}>
              <div>
                <h2 className={styles.chatTitle}>{activeConversation?.title}</h2>
                <p className={styles.chatSubtitle}>
                  {activeConversation?.messages.length === 0
                    ? "Start a fresh conversation or pick one from the library."
                    : `${activeConversation?.messages.length} messages in this thread`}
                </p>
              </div>
            </div>

            <ChatWindow
              character={activeCharacter}
              messages={activeConversation?.messages ?? []}
              speakingMessageId={speakingMessageId}
              streaming={streaming}
              onSpeak={speak}
              onStop={stop}
            />

            <InputBar
              disabled={streaming}
              onChange={setInput}
              onEmojiSelect={insertEmoji}
              onSend={sendMessage}
              streamError={streamError}
              value={input}
            />
          </section>
        </main>
      </div>

      {isModalOpen && (
        <CharacterModal
          activeCharacterId={activeCharacterId}
          characters={characters}
          onClose={() => setIsModalOpen(false)}
          onSelect={(id) => { selectCharacter(id); }}
          onOpenDetail={(c) => { setDetailCharacter(c); }}
        />
      )}

      {detailCharacter !== undefined && (
        <CharacterDetailModal
          character={detailCharacter}
          onClose={() => setDetailCharacter(undefined)}
          onAdd={addCharacter}
          onUpdate={updateCharacter}
          onDelete={deleteCharacter}
          onSelect={selectCharacter}
        />
      )}
    </div>
  );
}
