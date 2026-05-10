import { useState, useRef } from "react";
import type { Message, StreamChunk } from "../types";

const WS_URL = "ws://localhost:8000/api/v1/chat/stream";
const DEFAULT_MODEL = "default";

export function useChatModel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const sendMessage = () => {
    if (!input.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () =>
      ws.send(JSON.stringify({ messages: history, model: DEFAULT_MODEL }));

    ws.onmessage = (e) => {
      const chunk: StreamChunk = JSON.parse(e.data);
      if (chunk.done) {
        ws.close();
        setStreaming(false);
        return;
      }
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...last,
          content: last.content + chunk.delta,
        };
        return updated;
      });
    };

    ws.onerror = () => setStreaming(false);
  };

  return { messages, input, setInput, streaming, sendMessage };
}
