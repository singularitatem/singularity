import { useChatModel } from "./model/useChatModel";
import { ChatWindow } from "./view/ChatWindow";
import { InputBar } from "./view/InputBar";
import styles from "./App.module.css";

export default function App() {
  const { messages, input, setInput, streaming, sendMessage } = useChatModel();

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>Singularity</h1>
      <ChatWindow messages={messages} />
      <InputBar
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        disabled={streaming}
      />
    </div>
  );
}
