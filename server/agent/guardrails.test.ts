import { describe, expect, it } from "vitest";
import {
  classifyIntent,
  isReleaseSafetyDecision,
  sanitizeText,
} from "./guardrails";

describe("classifyIntent", () => {
  it("classifies triage questions", () => {
    expect(classifyIntent("Why was Batch B-104 delayed?")).toBe("deviation_triage");
    expect(classifyIntent("What happened before the excursion?")).toBe("deviation_triage");
  });

  it("classifies release decisions", () => {
    expect(classifyIntent("Can QA release this batch?")).toBe("release_decision");
    expect(classifyIntent("Is this batch safe to release?")).toBe("release_decision");
  });

  it("classifies maintenance review", () => {
    expect(classifyIntent("Which equipment should maintenance inspect?")).toBe(
      "maintenance_review"
    );
  });

  it("classifies shift handover", () => {
    expect(classifyIntent("Give me a shift handover summary")).toBe("shift_handover");
  });

  it("classifies data gaps", () => {
    expect(classifyIntent("What data is missing before escalation?")).toBe("data_gaps");
  });

  it("classifies SOP reference", () => {
    expect(classifyIntent("What SOP sections are relevant?")).toBe("sop_reference");
  });

  it("classifies audience framing", () => {
    expect(classifyIntent("Ops manager vs QA reviewer — how to frame this?")).toBe(
      "audience_framing"
    );
  });
});

describe("isReleaseSafetyDecision", () => {
  it("detects release and safety questions", () => {
    expect(isReleaseSafetyDecision("Can we release the batch?")).toBe(true);
    expect(isReleaseSafetyDecision("What is the GMP disposition?")).toBe(true);
    expect(isReleaseSafetyDecision("Is it safe?")).toBe(true);
  });

  it("returns false for triage questions", () => {
    expect(isReleaseSafetyDecision("Why was the batch delayed?")).toBe(false);
  });
});

describe("sanitizeText", () => {
  it("rewrites banned release phrases", () => {
    const res = sanitizeText("The batch is safe to release immediately.");
    expect(res.text).toContain("[requires human review]");
    expect(res.violations).toContain("release decision");
  });

  it("rewrites confirmed root cause claims", () => {
    const res = sanitizeText("The root cause is confirmed to be valve failure.");
    expect(res.text).toContain("[requires human review]");
    expect(res.violations).toContain("unconfirmed root-cause claim");
  });

  it("leaves clean text intact", () => {
    const clean = "QA review is required before escalation.";
    const res = sanitizeText(clean);
    expect(res.text).toBe(clean);
    expect(res.violations).toHaveLength(0);
  });
});
