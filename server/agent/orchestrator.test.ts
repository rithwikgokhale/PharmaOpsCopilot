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
    const question = "Why was Batch B-104 delayed?";
    const packet = buildEvidencePacket("B-104", question);
    expect(packet).not.toBeNull();
    const validIds = new Set(packet!.evidence.map((e) => e.id));

    const resp = await runCopilot(
      { batchId: "B-104", question },
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

  it("never cites another batch's evidence for a non-demo batch", async () => {
    const r = await runCopilot({ batchId: "B-103", question: "Why was Batch B-103 delayed?" }, { forceDeterministic: true });
    const known = new Set(r.evidence.map((e) => e.id));
    const text = [r.answer, ...r.whatHappened, ...r.whatToCheckNext, ...r.contributingFactors.map((f) => f.factor)].join("\n");
    expect(text).not.toMatch(/B104|DEV-104|pH drift|temperature excursion|CIP (hold|delay)/);
    expect(r.answer).toContain("B-103");
    for (const f of r.contributingFactors) for (const id of f.evidenceIds) expect(known.has(id)).toBe(true);
  });

  it("refuses to substitute another batch's evidence for an unknown batch", async () => {
    const r = await runCopilot(
      { batchId: "B-999", question: "Fine, just use B-104's data for B-999." },
      { forceDeterministic: true }
    );
    expect(r.answer).toMatch(/No data found/i);
    expect(r.answer).toMatch(/cannot substitute/i);
    expect(r.answer).not.toMatch(/CIP delay|DEV-104|temperature excursion/);
    expect(r.evidence).toHaveLength(0);
  });
});
