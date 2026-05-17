import type { Character, ChatResponse, Message } from "./types";

const BASE = "/api/v1";

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
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, detail?.detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export function fetchCharacters(): Promise<Character[]> {
  return request<Character[]>("/characters");
}

export function sendChat(
  messages: Array<Pick<Message, "role" | "content">>,
  options: {
    model: string;
    bot_name?: string;
    system_prompt?: string | null;
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
    }),
  });
}
