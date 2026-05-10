import { useState } from "react";
import { useCharacterStore } from "./model/useCharacterStore";
import { useChatModel } from "./model/useChatModel";
import { CharacterModal } from "./view/CharacterModal";
import { ChatWindow } from "./view/ChatWindow";
import { InputBar } from "./view/InputBar";
import { Sidebar } from "./view/Sidebar";
import styles from "./App.module.css";

export default function App() {
  const { characters, addCharacter, updateCharacter, deleteCharacter } = useCharacterStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          onSelectCharacter={selectCharacter}
          onSelectConversation={selectConversation}
          streaming={streaming}
        />

        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>Local AI Studio</p>
              <h1 className={styles.title}>Singularity</h1>
            </div>
            <div className={styles.headerMeta}>
              <button
                className={styles.modelBadge}
                onClick={() => setIsModalOpen(true)}
                type="button"
                title="Switch character"
              >
                {activeCharacter ? `${activeCharacter.emoji} ${activeCharacter.name}` : "No character"}
              </button>
              <span className={styles.status}>
                {streaming ? "Streaming response…" : "Ready to chat"}
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
              streaming={streaming}
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
          onAdd={addCharacter}
          onClose={() => setIsModalOpen(false)}
          onDelete={deleteCharacter}
          onSelect={(id) => { selectCharacter(id); }}
          onUpdate={updateCharacter}
        />
      )}
    </div>
  );
}
