import type { Character } from "../types";
import styles from "./CharacterPicker.module.css";

interface Props {
  characters: Character[];
  activeCharacterId: string;
  onSelect: (characterId: string) => void;
  disabled: boolean;
}

export function CharacterPicker({ characters, activeCharacterId, onSelect, disabled }: Props) {
  return (
    <div className={styles.section}>
      <p className={styles.label}>Character</p>
      <div className={styles.grid}>
        {characters.map((character) => {
          const isActive = character.id === activeCharacterId;
          return (
            <button
              key={character.id}
              className={`${styles.card} ${isActive ? styles.cardActive : ""}`}
              disabled={disabled}
              onClick={() => onSelect(character.id)}
              title={character.description}
              type="button"
            >
              <span className={styles.emoji}>{character.emoji}</span>
              <span className={styles.name}>{character.name}</span>
              <span className={styles.description}>{character.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
