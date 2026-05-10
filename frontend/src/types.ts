export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface ChatRequest {
  messages: Array<Pick<Message, "role" | "content">>;
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
