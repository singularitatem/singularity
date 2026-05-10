import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import styles from "./ChatWindow.module.css";

interface Props {
  messages: Message[];
  streaming: boolean;
}

export function ChatWindow({ messages, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className={styles.window}>
      {messages.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyEyebrow}>Fresh space</p>
          <h3 className={styles.emptyTitle}>Ask something that deserves a real conversation.</h3>
          <p className={styles.emptyBody}>
            Try brainstorming a roadmap, drafting a note, or riffing with emojis and
            follow-up questions. Your recent chats stay in the sidebar.
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble key={message.id} message={message} streaming={streaming} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
