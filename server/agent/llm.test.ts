/**
 * Tests for the optional OpenAI layer with the SDK fully mocked. Verifies the
 * critical property of the design: any LLM failure (timeout, malformed JSON,
 * schema violation, empty response) returns null so the orchestrator keeps the
 * deterministic, evidence-grounded response.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: createMock } };
  },
}));

import { generateNarrative, isLlmEnabled } from "./llm";

function completionWith(content: string | null) {
  return { choices: [{ message: { content } }] };
}

const validNarrative = {
  answer: "Batch B-104 was delayed by a CIP hold.",
  whatHappened: ["CIP hold extended pre-batch (EVT-B104-001)."],
  contributingFactors: [
    { factor: "Extended CIP hold", confidence: "medium", evidenceIds: ["EVT-B104-001"] },
  ],
  whatToCheckNext: ["Verify CIP-201 conductivity sensor (WO-752)."],
};

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  createMock.mockReset();
});

describe("isLlmEnabled", () => {
  it("is false without an API key", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(isLlmEnabled()).toBe(false);
  });

  it("is true with an API key", () => {
    expect(isLlmEnabled()).toBe(true);
  });
});

describe("generateNarrative", () => {
  it("returns null without an API key, without calling the SDK", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const result = await generateNarrative("system", "user");
    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("parses a valid JSON narrative", async () => {
    createMock.mockResolvedValueOnce(completionWith(JSON.stringify(validNarrative)));
    const result = await generateNarrative("system", "user");
    expect(result).toEqual(validNarrative);
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
