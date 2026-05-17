import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api";
import { useChatModel } from "../model/useChatModel";
import type { Character } from "../types";

const EINSTEIN: Character = {
  id: "einstein",
  name: "Einstein",
  bot_name: "Einstein",
  description: "Physicist",
  emoji: "🧑‍🔬",
};

const BOB: Character = {
  id: "bob",
  name: "Bob",
  bot_name: "Bob",
  description: "Robot comedian",
  emoji: "🤖",
};

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, "sendChat").mockResolvedValue({ role: "assistant", content: "pong", model: "default" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderModel(characters = [EINSTEIN, BOB]) {
  return renderHook(() => useChatModel({ characters }));
}

describe("conversation creation", () => {
  it("starts with one conversation", () => {
    const { result } = renderModel();
    expect(result.current.conversations).toHaveLength(1);
  });

  it("createNewConversation adds a second conversation", () => {
    const { result } = renderModel();
    act(() => { result.current.createNewConversation(); });
    expect(result.current.conversations).toHaveLength(2);
  });

  it("new conversation becomes active", () => {
    const { result } = renderModel();
    const before = result.current.activeConversation.id;
    act(() => { result.current.createNewConversation(); });
    expect(result.current.activeConversation.id).not.toBe(before);
  });
});

describe("conversation switching", () => {
  it("selectConversation changes the active conversation", () => {
    const { result } = renderModel();
    act(() => { result.current.createNewConversation(); });
    const [first, second] = result.current.conversations;
    act(() => { result.current.selectConversation(first.id); });
    expect(result.current.activeConversation.id).toBe(first.id);
    act(() => { result.current.selectConversation(second.id); });
    expect(result.current.activeConversation.id).toBe(second.id);
  });

  it("deleteConversation removes the conversation", () => {
    const { result } = renderModel();
    act(() => { result.current.createNewConversation(); });
    const toDelete = result.current.conversations[1].id;
    act(() => { result.current.deleteConversation(toDelete); });
    expect(result.current.conversations.find((c) => c.id === toDelete)).toBeUndefined();
  });

  it("does not delete the last conversation", () => {
    const { result } = renderModel();
    const id = result.current.conversations[0].id;
    act(() => { result.current.deleteConversation(id); });
    expect(result.current.conversations).toHaveLength(1);
  });
});

describe("character switching", () => {
  it("selectCharacter updates activeCharacterId", () => {
    const { result } = renderModel();
    act(() => { result.current.selectCharacter("bob"); });
    expect(result.current.activeCharacterId).toBe("bob");
  });

  it("selectCharacter updates recentCharacterIds", () => {
    const { result } = renderModel();
    act(() => { result.current.selectCharacter("bob"); });
    expect(result.current.recentCharacterIds[0]).toBe("bob");
  });
});

describe("sendMessage", () => {
  it("adds user and assistant messages to the conversation", async () => {
    const { result } = renderModel();
    act(() => { result.current.setInput("hello"); });
    await act(async () => { result.current.sendMessage(); });
    const msgs = result.current.activeConversation.messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("hello");
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].content).toBe("pong");
  });

  it("clears input after sending", async () => {
    const { result } = renderModel();
    act(() => { result.current.setInput("test"); });
    await act(async () => { result.current.sendMessage(); });
    expect(result.current.input).toBe("");
  });

  it("does not send empty input", async () => {
    const { result } = renderModel();
    await act(async () => { result.current.sendMessage(); });
    expect(api.sendChat).not.toHaveBeenCalled();
  });

  it("sets streamError on API error", async () => {
    vi.spyOn(api, "sendChat").mockRejectedValueOnce(new api.ApiError(502, "Upstream error"));
    const { result } = renderModel();
    act(() => { result.current.setInput("hi"); });
    await act(async () => { result.current.sendMessage(); });
    expect(result.current.streamError).toBeTruthy();
  });

  it("sets friendly message on rate limit error", async () => {
    vi.spyOn(api, "sendChat").mockRejectedValueOnce(new api.ApiError(429, "Rate limited"));
    const { result } = renderModel();
    act(() => { result.current.setInput("hi"); });
    await act(async () => { result.current.sendMessage(); });
    expect(result.current.streamError).toMatch(/rate limit/i);
  });
});
