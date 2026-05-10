import type { Message } from "../types";
import styles from "./MessageBubble.module.css";

interface Props {
  message: Message;
  streaming: boolean;
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === "user";
  const isStreamingAssistant =
    streaming && message.role === "assistant" && message.content.length === 0;

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.wrapperUser : styles.wrapperAssistant}`}>
      <div className={styles.message}>
        <div className={styles.meta}>
          <span className={styles.role}>{isUser ? "You" : "Singularity"}</span>
          <span className={styles.time}>{formatTimestamp(message.createdAt)}</span>
        </div>
        <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
          {isStreamingAssistant ? (
            <span className={styles.typing}>
              Thinking
              <span className={styles.cursor} />
            </span>
          ) : (
            message.content
          )}
        </div>
      </div>
    </div>
  );
}
