import { useEffect, useRef } from "react";
import type { Character, Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import styles from "./ChatWindow.module.css";

interface Props {
  character?: Character;
  messages: Message[];
  speakingMessageId: string | null;
  streaming: boolean;
  onSpeak: (id: string, text: string, character?: Character) => void;
  onStop: () => void;
}

export function ChatWindow({ character, messages, speakingMessageId, streaming, onSpeak, onStop }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className={styles.window}>
      {messages.length === 0 ? (
        <div className={styles.emptyState}>
          {character && <p className={styles.emptyEmoji}>{character.emoji}</p>}
          <p className={styles.emptyEyebrow}>{character ? character.name : "Fresh space"}</p>
          <h3 className={styles.emptyTitle}>
            {character
              ? character.description
              : "Ask something that deserves a real conversation."}
          </h3>
          <p className={styles.emptyBody}>
            Your recent chats stay in the sidebar. Switch characters anytime.
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            character={character}
            isSpeaking={speakingMessageId === message.id}
            message={message}
            streaming={streaming}
            onSpeak={(text) => onSpeak(message.id, text, character)}
            onStop={onStop}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
