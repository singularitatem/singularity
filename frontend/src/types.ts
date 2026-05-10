// Mirrors proto/chat.proto message shapes

export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  model: string;
}

export interface ChatResponse {
  role: Role;
  content: string;
  model: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}
