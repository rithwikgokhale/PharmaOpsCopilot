/**
 * Orchestrator LLM-path tests with the LLM layer mocked. Verifies:
 * - hallucinated evidence IDs from the model are filtered against the packet
 * - a failed narrative falls back to the deterministic response
 * - release/safety questions never reach the model
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const { generateNarrativeMock } = vi.hoisted(() => ({
  generateNarrativeMock: vi.fn(),
}));

vi.mock("./llm", () => ({
  isLlmEnabled: () => true,
  getModelName: () => "mock-model",
  generateNarrative: generateNarrativeMock,
}));

import { runCopilot } from "./orchestrator";

afterEach(() => {
  generateNarrativeMock.mockReset();
});

describe("runCopilot (LLM enabled, mocked)", () => {
  it("filters hallucinated evidence IDs against the packet", async () => {
    generateNarrativeMock.mockResolvedValueOnce({
      answer: "LLM-enriched answer about the CIP delay.",
      whatHappened: ["CIP hold extended (EVT-B104-001)."],
      contributingFactors: [
        {
          factor: "Extended CIP hold",
          confidence: "medium",
          evidenceIds: ["EVT-B104-001", "EVT-FAKE-999", "WO-731"],
        },
      ],
      whatToCheckNext: ["Verify CIP sensor."],
    });

    const resp = await runCopilot({ batchId: "B-104", question: "Why was the batch delayed?" });

    expect(generateNarrativeMock).toHaveBeenCalledOnce();
    expect(resp.generatedBy).toBe("openai");
    expect(resp.model).toBe("mock-model");
    const cited = resp.contributingFactors.flatMap((f) => f.evidenceIds);
    expect(cited).toContain("EVT-B104-001");
    expect(cited).toContain("WO-731");
    expect(cited).not.toContain("EVT-FAKE-999");
  });

  it("falls back to the deterministic response when the LLM fails", async () => {
    generateNarrativeMock.mockResolvedValueOnce(null);

    const resp = await runCopilot({ batchId: "B-104", question: "Why was the batch delayed?" });

    expect(resp.generatedBy).toBe("deterministic");
    expect(resp.answer).toBeTruthy();
    expect(resp.contributingFactors.length).toBeGreaterThan(0);
  });

  it("falls back when the LLM returns an empty answer", async () => {
    generateNarrativeMock.mockResolvedValueOnce({
      answer: "   ",
      whatHappened: [],
      contributingFactors: [],
      whatToCheckNext: [],
    });

    const resp = await runCopilot({ batchId: "B-104", question: "Why was the batch delayed?" });
    expect(resp.generatedBy).toBe("deterministic");
  });

  it("never calls the LLM for release/safety questions", async () => {
    const resp = await runCopilot({ batchId: "B-104", question: "Can QA release this batch?" });

    expect(generateNarrativeMock).not.toHaveBeenCalled();
    expect(resp.intent).toBe("release_decision");
    expect(resp.generatedBy).toBe("deterministic");
  });
});
