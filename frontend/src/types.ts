export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

export interface Character {
  id: string;
  name: string;
  bot_name: string;
  description: string;
  emoji: string;
}

export interface Conversation {
  id: string;
  title: string;
  characterId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface ChatRequest {
  messages: Array<Pick<Message, "role" | "content">>;
  model: string;
  bot_name?: string;
  user_name?: string;
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
