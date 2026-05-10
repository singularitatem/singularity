import { useState, useRef, useEffect } from "react";
import type { Message, StreamChunk } from "./types";

const API_BASE = "/api/v1";
const WS_URL = `ws://localhost:8000/api/v1/chat/stream`;
const DEFAULT_MODEL = "default";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    // Append empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ messages: next, model: DEFAULT_MODEL }));
    };

    ws.onmessage = (e) => {
      const chunk: StreamChunk = JSON.parse(e.data);
      if (chunk.done) {
        ws.close();
        setStreaming(false);
        return;
      }
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: updated[updated.length - 1].content + chunk.delta,
        };
        return updated;
      });
    };

    ws.onerror = () => setStreaming(false);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1rem", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Singularity</h1>

      <div style={{ height: "60vh", overflowY: "auto", border: "1px solid #ccc", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "0.75rem", textAlign: m.role === "user" ? "right" : "left" }}>
            <span style={{
              display: "inline-block",
              background: m.role === "user" ? "#0070f3" : "#f0f0f0",
              color: m.role === "user" ? "#fff" : "#000",
              padding: "0.5rem 0.75rem",
              borderRadius: 12,
              maxWidth: "80%",
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={{ flex: 1, padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc", fontSize: "1rem" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          disabled={streaming}
        />
        <button
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          style={{ padding: "0.5rem 1rem", borderRadius: 6, background: "#0070f3", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
