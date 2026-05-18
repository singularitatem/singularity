import type { Character, ChatResponse, Conversation, Message } from "./types";

const BASE = "/api/v1";
// Set VITE_API_KEY in .env when the backend is configured with api_keys.
// Leave unset for open/dev mode.
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, detail?.detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Characters ────────────────────────────────────────────────────────────────

export function fetchCharacters(): Promise<Character[]> {
  return request<Character[]>("/characters");
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export function sendChat(
  messages: Array<Pick<Message, "role" | "content">>,
  options: {
    model: string;
    bot_name?: string;
    system_prompt?: string | null;
    conversation_id?: string;
    character_id?: string;
    signal?: AbortSignal;
  },
): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    signal: options.signal,
    body: JSON.stringify({
      messages,
      model: options.model,
      bot_name: options.bot_name,
      system_prompt: options.system_prompt ?? null,
      conversation_id: options.conversation_id,
      character_id: options.character_id,
    }),
  });
}

// ── Conversations ─────────────────────────────────────────────────────────────

interface ServerConversationSummary {
  id: string;
  title: string;
  character_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ServerMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ServerConversation {
  id: string;
  title: string;
  character_id: string;
  created_at: string;
  updated_at: string;
  messages: ServerMessage[];
}

function adaptServerConversation(s: ServerConversation): Conversation {
  return {
    id: s.id,
    title: s.title,
    characterId: s.character_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    messages: s.messages.map((m) => ({
      id: m.id,
      role: m.role as Message["role"],
      content: m.content,
      createdAt: m.created_at,
    })),
  };
}

export async function fetchConversations(): Promise<Conversation[]> {
  const summaries = await request<ServerConversationSummary[]>("/conversations");
  // Fetch full conversations (with messages) in parallel for the list.
  // For large history, we'd paginate — acceptable at this scale.
  const full = await Promise.all(
    summaries.map((s) => request<ServerConversation>(`/conversations/${s.id}`)),
  );
  return full.map(adaptServerConversation);
}

export function createServerConversation(conv: Conversation): Promise<void> {
  return request<unknown>("/conversations", {
    method: "POST",
    body: JSON.stringify({
      id: conv.id,
      title: conv.title,
      character_id: conv.characterId,
      created_at: conv.createdAt,
      updated_at: conv.updatedAt,
    }),
  }).then(() => undefined);
}

export function deleteServerConversation(id: string): Promise<void> {
  return request<void>(`/conversations/${id}`, { method: "DELETE" }).then(() => undefined);
}

export function updateServerConversationTitle(id: string, title: string): Promise<void> {
  return request<unknown>(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  }).then(() => undefined);
}
