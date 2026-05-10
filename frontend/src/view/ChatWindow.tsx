import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import styles from "./ChatWindow.module.css";

interface Props {
  messages: Message[];
}

export function ChatWindow({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={styles.window}>
      {messages.length === 0 && (
        <p className={styles.empty}>Send a message to start the conversation.</p>
      )}
      {messages.map((m, i) => (
        <MessageBubble key={i} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
