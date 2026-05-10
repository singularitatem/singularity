import type { Character, Message } from "../types";
import styles from "./MessageBubble.module.css";

interface Props {
  character?: Character;
  message: Message;
  streaming: boolean;
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function MessageBubble({ character, message, streaming }: Props) {
  const isUser = message.role === "user";
  const isStreamingAssistant =
    streaming && message.role === "assistant" && message.content.length === 0;

  const roleLabel = isUser ? "You" : (character?.name ?? "Assistant");
  const roleEmoji = isUser ? null : (character?.emoji ?? "🤖");

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.wrapperUser : styles.wrapperAssistant}`}>
      <div className={styles.message}>
        <div className={`${styles.meta} ${isUser ? styles.metaUser : ""}`}>
          {roleEmoji && <span className={styles.avatar}>{roleEmoji}</span>}
          <span className={styles.role}>{roleLabel}</span>
          <span className={styles.time}>{formatTimestamp(message.createdAt)}</span>
        </div>
        <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
          {isStreamingAssistant ? (
            <span className={styles.typing}>
              {character?.name ?? "Assistant"} is thinking
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
