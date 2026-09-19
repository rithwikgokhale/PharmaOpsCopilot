/**
 * Tests for the optional multi-provider narrative layer with the OpenAI SDK
 * and global fetch mocked. Any LLM failure (timeout, malformed JSON, schema
 * violation, empty response, HTTP error) returns null so the orchestrator
 * keeps the deterministic, evidence-grounded response.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: createMock } };
  },
}));

import {
  describeLlm,
  generateNarrative,
  getLlmProvider,
  getModelName,
  isLlmEnabled,
  parseNarrative,
} from "./llm";

function completionWith(content: string | null) {
  return { choices: [{ message: { content } }] };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

const validNarrative = {
  answer: "Batch B-104 was delayed by a CIP hold.",
  whatHappened: ["CIP hold extended pre-batch (EVT-B104-001)."],
  contributingFactors: [
    { factor: "Extended CIP hold", confidence: "medium", evidenceIds: ["EVT-B104-001"] },
  ],
  whatToCheckNext: ["Verify CIP-201 conductivity sensor (WO-752)."],
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("LLM_PROVIDER", "");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  createMock.mockReset();
  fetchMock.mockReset();
});

describe("provider selection", () => {
  it("is disabled without any API key", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(isLlmEnabled()).toBe(false);
    expect(getLlmProvider()).toBeNull();
    expect(describeLlm()).toEqual({ enabled: false });
  });

  it("picks OpenAI when only OPENAI_API_KEY is set (no LLM_PROVIDER)", () => {
    expect(getLlmProvider()).toBe("openai");
    expect(isLlmEnabled()).toBe(true);
    expect(getModelName()).toBe("gpt-4.1-mini");
    expect(describeLlm()).toEqual({ enabled: true, provider: "openai", model: "gpt-4.1-mini" });
  });

  it("picks Anthropic when it is the first key present", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    expect(getLlmProvider()).toBe("anthropic");
    expect(getModelName()).toBe("claude-sonnet-4-5");
  });

  it("picks Gemini when it is the first key present", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "gem-test");
    expect(getLlmProvider()).toBe("gemini");
    expect(getModelName()).toBe("gemini-2.5-flash");
  });

  it("honors LLM_PROVIDER when that provider has a key", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    expect(getLlmProvider()).toBe("anthropic");
  });

  it("disables when LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing", () => {
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    expect(isLlmEnabled()).toBe(false);
    expect(getLlmProvider()).toBeNull();
  });

  it("disables on an unknown LLM_PROVIDER even if another key is set", () => {
    vi.stubEnv("LLM_PROVIDER", "mistral");
    expect(isLlmEnabled()).toBe(false);
  });
});

describe("parseNarrative", () => {
  it("extracts a JSON object from surrounding text", () => {
    expect(parseNarrative(`Here you go\n${JSON.stringify(validNarrative)}\n`)).toEqual(validNarrative);
  });

  it("returns null for malformed JSON", () => {
    expect(parseNarrative("this is not JSON {")).toBeNull();
  });
});

describe("generateNarrative (OpenAI)", () => {
  it("returns null without an API key, without calling the SDK", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const result = await generateNarrative("system", "user");
    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a valid JSON narrative", async () => {
    createMock.mockResolvedValueOnce(completionWith(JSON.stringify(validNarrative)));
    const result = await generateNarrative("system", "user");
    expect(result).toEqual(validNarrative);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when the model emits malformed JSON", async () => {
    createMock.mockResolvedValueOnce(completionWith("this is not JSON {"));
    const result = await generateNarrative("system", "user");
    expect(result).toBeNull();
  });

  it("returns null when the completion has no content", async () => {
    createMock.mockResolvedValueOnce(completionWith(null));
    const result = await generateNarrative("system", "user");
    expect(result).toBeNull();
  });

  it("returns null on a timeout error", async () => {
    createMock.mockRejectedValueOnce(new Error("Request timed out"));
    const result = await generateNarrative("system", "user");
    expect(result).toBeNull();
  });

  it("returns null on an API error", async () => {
    createMock.mockRejectedValueOnce(new Error("429 rate limit exceeded"));
    const result = await generateNarrative("system", "user");
    expect(result).toBeNull();
  });

  it("normalizes wrong-typed fields to safe defaults instead of crashing", async () => {
    createMock.mockResolvedValueOnce(
      completionWith(
        JSON.stringify({
          answer: "Partial answer.",
          whatHappened: "should be an array",
          contributingFactors: [
            { factor: "Something", confidence: "certain", evidenceIds: "EVT-1" },
          ],
          whatToCheckNext: [42, "Check the valve"],
        })
      )
    );
    const result = await generateNarrative("system", "user");
    expect(result).not.toBeNull();
    expect(result!.answer).toBe("Partial answer.");
    expect(result!.whatHappened).toEqual([]);
    expect(result!.contributingFactors[0].confidence).toBe("low");
    expect(result!.contributingFactors[0].evidenceIds).toEqual([]);
    expect(result!.whatToCheckNext).toEqual(["42", "Check the valve"]);
  });
});

describe("generateNarrative (Anthropic / Gemini via fetch)", () => {
  it("parses Anthropic text blocks and does not call the OpenAI SDK", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ content: [{ type: "text", text: JSON.stringify(validNarrative) }] })
    );
    const result = await generateNarrative("system", "user");
    expect(result).toEqual(validNarrative);
    expect(createMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-ant-test");
  });

  it("parses Gemini candidate parts", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "gem-test");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: JSON.stringify(validNarrative) }] } }],
      })
    );
    const result = await generateNarrative("system", "user");
    expect(result).toEqual(validNarrative);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("gemini-2.5-flash");
  });

  it("retries once on HTTP error then succeeds", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(
        jsonResponse({ content: [{ type: "text", text: JSON.stringify(validNarrative) }] })
      );
    const result = await generateNarrative("system", "user");
    expect(result).toEqual(validNarrative);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null after a failed retry", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    fetchMock.mockResolvedValue(jsonResponse({ error: "boom" }, 500));
    const result = await generateNarrative("system", "user");
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not throw at call time when LLM_PROVIDER=anthropic has no key", async () => {
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    await expect(generateNarrative("system", "user")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });
});
