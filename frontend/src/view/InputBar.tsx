import styles from "./InputBar.module.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export function InputBar({ value, onChange, onSend, disabled }: Props) {
  return (
    <div className={styles.bar}>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
        placeholder="Type a message…"
        disabled={disabled}
      />
      <button
        className={styles.button}
        onClick={onSend}
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </div>
  );
}
