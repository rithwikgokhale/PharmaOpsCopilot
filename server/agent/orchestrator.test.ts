import { describe, expect, it } from "vitest";
import { runCopilot } from "./orchestrator";
import { buildEvidencePacket } from "./evidenceBuilder";

describe("runCopilot (deterministic)", () => {
  it("returns triage response with contributing factors for B-104", async () => {
    const resp = await runCopilot(
      { batchId: "B-104", question: "Why was Batch B-104 delayed?" },
      { forceDeterministic: true }
    );
    expect(resp.intent).toBe("deviation_triage");
    expect(resp.answer.toLowerCase()).toContain("dev");
    expect(resp.contributingFactors.length).toBeGreaterThan(0);
    expect(resp.humanReviewRequired).toBe(true);
  });

  it("cites only evidence IDs that exist in the packet", async () => {
    const packet = buildEvidencePacket("B-104", "Why delayed?");
    expect(packet).not.toBeNull();
    const validIds = new Set(packet!.evidence.map((e) => e.id));

    const resp = await runCopilot(
      { batchId: "B-104", question: "Why was Batch B-104 delayed?" },
      { forceDeterministic: true }
    );

    for (const factor of resp.contributingFactors) {
      for (const id of factor.evidenceIds) {
        expect(validIds.has(id)).toBe(true);
      }
    }
    for (const e of resp.evidence) {
      expect(validIds.has(e.id)).toBe(true);
    }
  });

  it("declines release decisions without banned phrases", async () => {
    const resp = await runCopilot(
      { batchId: "B-104", question: "Can QA release this batch?" },
      { forceDeterministic: true }
    );
    expect(resp.intent).toBe("release_decision");
    expect(resp.answer.toLowerCase()).toMatch(/cannot|qa|human/);
    const text = [resp.answer, ...resp.whatHappened].join(" ").toLowerCase();
    expect(text).not.toMatch(/safe to release|cleared for release/);
  });

  it("returns not-found for unknown batch", async () => {
    const resp = await runCopilot(
      { batchId: "B-999", question: "What happened?" },
      { forceDeterministic: true }
    );
    expect(resp.confidence).toBe("low");
    expect(resp.answer).toContain("B-999");
    expect(resp.evidence).toHaveLength(0);
  });
});
