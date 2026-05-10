import { useEffect, useRef, useState } from "react";
import type { Character, VoiceProfile } from "../types";
import styles from "./CharacterDetailModal.module.css";

interface Props {
  character: Character | null; // null = create mode
  onClose: () => void;
  onAdd: (data: Omit<Character, "id" | "isCustom">) => Character;
  onUpdate: (id: string, patch: Partial<Omit<Character, "id" | "isCustom">>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

export function CharacterDetailModal({ character, onClose, onAdd, onUpdate, onDelete, onSelect }: Props) {
  const isCreate = character === null;
  const isReadOnly = !isCreate && !character?.isCustom;

  const [form, setForm] = useState({
    name: character?.name ?? "",
    bot_name: character?.bot_name ?? "",
    description: character?.description ?? "",
    emoji: character?.emoji ?? "🤖",
    systemPrompt: character?.systemPrompt ?? "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(character?.voiceProfile ?? null);
  const [voiceState, setVoiceState] = useState<"idle" | "loading" | "done" | "error">(
    character?.voiceProfile ? "done" : "idle"
  );

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const suggestVoice = async () => {
    if (!form.name.trim() && !form.description.trim()) return;
    setVoiceState("loading");
    try {
      const res = await fetch("/api/v1/characters/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          bot_name: form.bot_name || form.name,
          description: form.description,
          system_prompt: form.systemPrompt || null,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setVoiceProfile(await res.json());
      setVoiceState("done");
    } catch {
      setVoiceState("error");
    }
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.bot_name.trim()) e.bot_name = "Required";
    if (!form.description.trim()) e.description = "Required";
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
      voiceProfile: voiceProfile ?? undefined,
    };
    if (isCreate) {
      const created = onAdd(data);
      onSelect(created.id);
    } else if (character?.id) {
      onUpdate(character.id, data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!character?.id) return;
    onDelete(character.id);
    onClose();
  };

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={styles.card} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.identity}>
            <span className={styles.bigEmoji}>{form.emoji || "🤖"}</span>
            <div>
              <p className={styles.characterName}>{form.name || (isCreate ? "New character" : "")}</p>
              {isReadOnly && <p className={styles.readOnlyHint}>Built-in · read only</p>}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Emoji</span>
              <input
                className={`${styles.input} ${styles.inputEmoji}`}
                value={form.emoji}
                onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                maxLength={4}
                readOnly={isReadOnly}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldGrow}`}>
              <span className={styles.fieldLabel}>Display name</span>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Einstein"
                readOnly={isReadOnly}
              />
              {errors.name && <span className={styles.error}>{errors.name}</span>}
            </label>
            <label className={`${styles.field} ${styles.fieldGrow}`}>
              <span className={styles.fieldLabel}>Bot name <span className={styles.hint}>(sent to API)</span></span>
              <input
                className={styles.input}
                value={form.bot_name}
                onChange={(e) => setForm((p) => ({ ...p, bot_name: e.target.value }))}
                placeholder="Einstein"
                readOnly={isReadOnly}
              />
              {errors.bot_name && <span className={styles.error}>{errors.bot_name}</span>}
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Description</span>
            <input
              className={styles.input}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="One-line persona summary…"
              readOnly={isReadOnly}
            />
            {errors.description && <span className={styles.error}>{errors.description}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>System prompt <span className={styles.hint}>(optional)</span></span>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={form.systemPrompt}
              onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
              placeholder="You are Einstein. Speak with curiosity and wit…"
              rows={4}
              readOnly={isReadOnly}
            />
          </label>

          {/* Voice */}
          <div className={styles.voiceRow}>
            <button
              className={styles.voiceBtn}
              disabled={isReadOnly || voiceState === "loading" || (!form.name.trim() && !form.description.trim())}
              onClick={suggestVoice}
              type="button"
            >
              {voiceState === "loading" ? "Analysing…" : "✦ Suggest voice"}
            </button>
            {voiceState === "done" && voiceProfile && (
              <span className={styles.voiceBadge}>
                {voiceProfile.gender} · {voiceProfile.accent} · pitch {voiceProfile.pitch.toFixed(2)} · rate {(voiceProfile.rate ?? 1).toFixed(2)}
              </span>
            )}
            {voiceState === "error" && <span className={styles.voiceError}>Could not infer — try again.</span>}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {character?.isCustom && (
            <button className={styles.deleteBtn} onClick={handleDelete} type="button">Delete</button>
          )}
          <div className={styles.footerRight}>
            <button className={styles.cancelBtn} onClick={onClose} type="button">Cancel</button>
            {!isReadOnly && (
              <button className={styles.saveBtn} onClick={handleSubmit} type="button">
                {isCreate ? "Create character" : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
