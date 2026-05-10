import type { Character } from "../types";
import styles from "./CharacterPicker.module.css";

interface Props {
  characters: Character[];
  activeCharacterId: string;
  onSelect: (characterId: string) => void;
  onManage: () => void;
  disabled: boolean;
}

export function CharacterPicker({ characters, activeCharacterId, onSelect, onManage, disabled }: Props) {
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <p className={styles.label}>Character</p>
        <button className={styles.manageButton} onClick={onManage} type="button">
          Manage →
        </button>
      </div>
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
