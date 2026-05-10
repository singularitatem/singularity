import { useEffect, useRef, useState } from "react";
import type { Character } from "../types";
import styles from "./CharacterModal.module.css";

type View = "list" | "create" | "edit";

interface FormState {
  name: string;
  bot_name: string;
  description: string;
  emoji: string;
  systemPrompt: string;
}

const EMPTY_FORM: FormState = { name: "", bot_name: "", description: "", emoji: "🤖", systemPrompt: "" };

interface Props {
  characters: Character[];
  activeCharacterId: string;
  onClose: () => void;
  onSelect: (characterId: string) => void;
  onAdd: (data: Omit<Character, "id" | "isCustom">) => Character;
  onUpdate: (id: string, patch: Partial<Omit<Character, "id" | "isCustom">>) => void;
  onDelete: (id: string) => void;
}

export function CharacterModal({
  characters,
  activeCharacterId,
  onClose,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = characters.filter((c) => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
    setView("create");
  };

  const openEdit = (character: Character) => {
    setForm({
      name: character.name,
      bot_name: character.bot_name,
      description: character.description,
      emoji: character.emoji,
      systemPrompt: character.systemPrompt ?? "",
    });
    setErrors({});
    setEditingId(character.id);
    setView("edit");
  };

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.bot_name.trim()) e.bot_name = "Bot name is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.emoji.trim()) e.emoji = "Emoji is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      name: form.name.trim(),
      bot_name: form.bot_name.trim(),
      description: form.description.trim(),
      emoji: form.emoji.trim(),
      systemPrompt: form.systemPrompt.trim() || undefined,
    };
    if (view === "create") {
      const created = onAdd(data);
      onSelect(created.id);
    } else if (editingId) {
      onUpdate(editingId, data);
    }
    setView("list");
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    if (id === activeCharacterId && characters.length > 1) {
      const next = characters.find((c) => c.id !== id);
      if (next) onSelect(next.id);
    }
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

        {view === "list" ? (
          <>
            <div className={styles.toolbar}>
              <input
                ref={searchRef}
                className={styles.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or description…"
                type="search"
              />
              <button className={styles.createButton} onClick={openCreate} type="button">
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
                      onClick={() => { onSelect(c.id); onClose(); }}
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
                    {c.isCustom && (
                      <div className={styles.cardActions}>
                        <button className={styles.editButton} onClick={() => openEdit(c)} type="button">Edit</button>
                        <button className={styles.deleteButton} onClick={() => handleDelete(c.id)} type="button">Delete</button>
                      </div>
                    )}
                    {isActive && <span className={styles.activeBadge}>Active</span>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className={styles.form}>
            <div className={styles.formRow}>
              <label className={styles.label}>
                Emoji
                <input
                  className={`${styles.input} ${styles.inputEmoji}`}
                  value={form.emoji}
                  onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                  maxLength={4}
                  placeholder="🤖"
                />
                {errors.emoji && <span className={styles.error}>{errors.emoji}</span>}
              </label>

              <label className={`${styles.label} ${styles.labelGrow}`}>
                Display name
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Einstein"
                />
                {errors.name && <span className={styles.error}>{errors.name}</span>}
              </label>

              <label className={`${styles.label} ${styles.labelGrow}`}>
                Bot name <span className={styles.hint}>(sent to the API)</span>
                <input
                  className={styles.input}
                  value={form.bot_name}
                  onChange={(e) => setForm((p) => ({ ...p, bot_name: e.target.value }))}
                  placeholder="Einstein"
                />
                {errors.bot_name && <span className={styles.error}>{errors.bot_name}</span>}
              </label>
            </div>

            <label className={styles.label}>
              Description
              <input
                className={styles.input}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="One-line persona summary…"
              />
              {errors.description && <span className={styles.error}>{errors.description}</span>}
            </label>

            <label className={styles.label}>
              System prompt <span className={styles.hint}>(optional — injected as the first Bot message)</span>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={form.systemPrompt}
                onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
                placeholder="You are Einstein. Speak with curiosity and wit. Use analogies to explain complex ideas. Always stay in character."
                rows={5}
              />
            </label>

            <div className={styles.formFooter}>
              <button className={styles.cancelButton} onClick={() => setView("list")} type="button">
                Cancel
              </button>
              <button className={styles.submitButton} onClick={handleSubmit} type="button">
                {view === "create" ? "Create character" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
