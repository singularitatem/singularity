import { useChatModel } from "./model/useChatModel";
import { ChatWindow } from "./view/ChatWindow";
import { InputBar } from "./view/InputBar";
import { Sidebar } from "./view/Sidebar";
import styles from "./App.module.css";

export default function App() {
  const {
    activeConversation,
    activeConversationId,
    conversations,
    createNewConversation,
    deleteConversation,
    input,
    insertEmoji,
    selectConversation,
    setInput,
    streamError,
    streaming,
    sendMessage,
  } = useChatModel();

  return (
    <div className={styles.page}>
      <div className={styles.aurora} />
      <div className={styles.shell}>
        <Sidebar
          activeConversationId={activeConversationId}
          conversations={conversations}
          onCreateConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
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
              <span className={styles.modelBadge}>Echo backend</span>
              <span className={styles.status}>
                {streaming ? "Streaming response" : "Ready to chat"}
              </span>
            </div>
          </header>

          <section className={styles.chatCard}>
            <div className={styles.chatHeader}>
              <div>
                <h2 className={styles.chatTitle}>{activeConversation.title}</h2>
                <p className={styles.chatSubtitle}>
                  {activeConversation.messages.length === 0
                    ? "Start a fresh conversation or pick one from the library."
                    : `${activeConversation.messages.length} messages in this thread`}
                </p>
              </div>
            </div>

            <ChatWindow messages={activeConversation.messages} streaming={streaming} />

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
    </div>
  );
}
