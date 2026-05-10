import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Character, Message } from "../types";
import styles from "./MessageBubble.module.css";

interface Props {
  character?: Character;
  isSpeaking: boolean;
  message: Message;
  streaming: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function MessageBubble({ character, isSpeaking, message, streaming, onSpeak, onStop }: Props) {
  const isUser = message.role === "user";
  const isStreamingAssistant =
    streaming && message.role === "assistant" && message.content.length === 0;
  const canSpeak = !isUser && !isStreamingAssistant && !!message.content;

  const roleLabel = isUser ? "You" : (character?.name ?? "Assistant");
  const roleEmoji = isUser ? null : (character?.emoji ?? "🤖");

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.wrapperUser : styles.wrapperAssistant}`}>
      <div className={styles.message}>
        <div className={`${styles.meta} ${isUser ? styles.metaUser : ""}`}>
          {roleEmoji && <span className={styles.avatar}>{roleEmoji}</span>}
          <span className={styles.role}>{roleLabel}</span>
          <span className={styles.time}>{formatTimestamp(message.createdAt)}</span>
          {canSpeak && (
            <button
              className={`${styles.speakButton} ${isSpeaking ? styles.speakButtonActive : ""}`}
              onClick={() => isSpeaking ? onStop() : onSpeak(message.content)}
              title={isSpeaking ? "Stop" : "Read aloud"}
              type="button"
            >
              {isSpeaking ? (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="3" width="4" height="10" rx="1" />
                  <rect x="9" y="3" width="4" height="10" rx="1" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2.5a.5.5 0 0 0-.5-.5H5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .5-.5v-11zm-.5 0v11H5v-11h2.5zM9.5 5.5c.7.7 1 1.6 1 2.5s-.3 1.8-1 2.5l.7.7C11 10.3 11.5 9.2 11.5 8s-.5-2.3-1.3-3.2l-.7.7zm1.5-1.5c1 1 1.5 2.2 1.5 3.5s-.5 2.5-1.5 3.5l.7.7C13 10.6 13.5 9.3 13.5 8s-.5-2.6-1.3-3.7l-.7.7z" />
                </svg>
              )}
            </button>
          )}
        </div>
        <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
          {isStreamingAssistant ? (
            <span className={styles.typing}>
              {character?.name ?? "Assistant"} is thinking
              <span className={styles.cursor} />
            </span>
          ) : isUser ? (
            message.content
          ) : (
            <div className={styles.markdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
