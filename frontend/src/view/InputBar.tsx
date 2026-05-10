import { useState } from "react";
import styles from "./InputBar.module.css";

const EMOJIS = ["🙂", "🔥", "✨", "🤖", "🧠", "🚀", "🎯", "💡", "🌙", "🎨"];

interface Props {
  disabled: boolean;
  onChange: (value: string) => void;
  onEmojiSelect: (emoji: string) => void;
  onSend: () => void;
  streamError: string | null;
  value: string;
}

export function InputBar({
  disabled,
  onChange,
  onEmojiSelect,
  onSend,
  streamError,
  value,
}: Props) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className={styles.composerWrap}>
      {streamError ? <p className={styles.error}>{streamError}</p> : null}

      <div className={styles.bar}>
        <div className={styles.tools}>
          <button
            aria-label="Insert emoji"
            className={styles.iconButton}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            type="button"
          >
            😊
          </button>
          <span className={styles.helper}>Enter to send. Shift+Enter for a new line.</span>
        </div>

        {showEmojiPicker ? (
          <div className={styles.emojiPicker}>
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className={styles.emoji}
                onClick={() => {
                  onEmojiSelect(emoji);
                  setShowEmojiPicker(false);
                }}
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <div className={styles.row}>
          <textarea
            className={styles.input}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Message the model, sketch an idea, or ask for a rewrite..."
            rows={1}
            value={value}
          />
          <button
            className={styles.button}
            disabled={disabled || !value.trim()}
            onClick={onSend}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
