import { useEffect, useRef, useState } from "react";
import type { Character } from "../types";
import styles from "./CharacterModal.module.css";

interface Props {
  characters: Character[];
  activeCharacterId: string;
  onClose: () => void;
  onSelect: (characterId: string) => void;
  onOpenDetail: (character: Character | null) => void;
}

export function CharacterModal({
  characters,
  activeCharacterId,
  onClose,
  onSelect,
  onOpenDetail,
}: Props) {
  const [query, setQuery] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = characters.filter((c) => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  const handleCardClick = (c: Character) => {
    onSelect(c.id);
    onOpenDetail(c);
  };

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Characters">
        <div className={styles.header}>
          <div>
            <p className={styles.headerEyebrow}>Studio</p>
            <h2 className={styles.headerTitle}>Characters</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close" type="button">✕</button>
        </div>

        <div className={styles.toolbar}>
          <input
            ref={searchRef}
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or description…"
            type="search"
          />
          <button className={styles.createButton} onClick={() => onOpenDetail(null)} type="button">
            + New character
          </button>
        </div>

        <div className={styles.grid}>
          {filtered.length === 0 && (
            <p className={styles.empty}>No characters match "{query}".</p>
          )}
          {filtered.map((c) => {
            const isActive = c.id === activeCharacterId;
            return (
              <div key={c.id} className={`${styles.card} ${isActive ? styles.cardActive : ""}`}>
                <button
                  className={styles.cardBody}
                  onClick={() => handleCardClick(c)}
                  type="button"
                >
                  <span className={styles.cardEmoji}>{c.emoji}</span>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardName}>{c.name}</span>
                    {c.bot_name !== c.name && (
                      <span className={styles.cardBotName}>@{c.bot_name}</span>
                    )}
                    <span className={styles.cardDesc}>{c.description}</span>
                    {c.systemPrompt && (
                      <span className={styles.cardPromptBadge}>System prompt</span>
                    )}
                  </div>
                </button>
                {isActive && <span className={styles.activeBadge}>Active</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
