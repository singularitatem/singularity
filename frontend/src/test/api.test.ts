import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchCharacters, sendChat } from "../api";

let mockFetch: ReturnType<typeof vi.fn>;
beforeEach(() => { mockFetch = vi.fn(); vi.stubGlobal("fetch", mockFetch); });
afterEach(() => { vi.unstubAllGlobals(); });

function ok(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }),
  );
}

function err(status: number, detail: string) {
  return Promise.resolve(
    new Response(JSON.stringify({ detail }), { status, headers: { "Content-Type": "application/json" } }),
  );
}

describe("fetchCharacters", () => {
  it("returns characters from the API", async () => {
    const chars = [{ id: "einstein", name: "Einstein", bot_name: "Einstein", description: "Physicist", emoji: "🧑‍🔬" }];
    mockFetch.mockReturnValueOnce(ok(chars));
    const result = await fetchCharacters();
    expect(result).toEqual(chars);
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/characters", expect.any(Object));
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockReturnValueOnce(err(401, "Unauthorized"));
    await expect(fetchCharacters()).rejects.toBeInstanceOf(ApiError);
  });
});

describe("sendChat", () => {
  it("sends messages and returns response", async () => {
    mockFetch.mockReturnValueOnce(ok({ role: "assistant", content: "hello", model: "default" }));
    const result = await sendChat([{ role: "user", content: "hi" }], { model: "default" });
    expect(result.content).toBe("hello");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/chat");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.messages[0].content).toBe("hi");
  });

  it("throws ApiError with status on upstream error", async () => {
    mockFetch.mockReturnValueOnce(err(502, "Upstream error"));
    const error = await sendChat([{ role: "user", content: "hi" }], { model: "default" }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });

  it("throws ApiError with status 429 on rate limit", async () => {
    mockFetch.mockReturnValueOnce(err(429, "Rate limited"));
    const error = await sendChat([{ role: "user", content: "hi" }], { model: "default" }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
  });

  it("includes bot_name and system_prompt in request body", async () => {
    mockFetch.mockReturnValueOnce(ok({ role: "assistant", content: "ok", model: "default" }));
    await sendChat([], { model: "default", bot_name: "Luna", system_prompt: "You are Luna." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.bot_name).toBe("Luna");
    expect(body.system_prompt).toBe("You are Luna.");
  });
});
