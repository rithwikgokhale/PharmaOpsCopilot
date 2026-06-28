/**
 * Guardrails for the deviation triage assistant. The agent summarizes and
 * connects operational evidence but must NOT make batch release, GMP, safety,
 * or regulatory decisions. These checks run regardless of whether the LLM or
 * the deterministic engine produced the answer.
 */

import type { CopilotIntent } from "../../app/src/types/agent";

export const HUMAN_REVIEW_DISCLAIMER =
  "This is an evidence-summary aid, not a validated GxP system. It does not make batch release, QA disposition, safety, or regulatory decisions. A qualified human (QA/manufacturing) must review the deviation record, SOPs, and source data before any decision.";

export const AGENT_IDENTITY =
  "You are PharmaOps Copilot, a deviation triage assistant for pharma manufacturing supervisors and QA reviewers. You summarize and connect operational evidence, but you do not make batch release, GMP, safety, or regulatory decisions.";

export const UNIVERSAL_RULES = [
  "Use only the provided evidence packet and retrieved document sections.",
  "Never claim a final, confirmed root cause unless evidence is conclusive — prefer 'contributing factors' and 'hypotheses'.",
  "Always state assumptions and missing data.",
  "For QA/release/safety/regulatory decisions, decline and recommend human review.",
  "Cite evidence IDs (e.g. EVT-..., WO-..., SOP-..., DEV-..., SIG-...) for every factual claim.",
  "Separate facts from hypotheses. Prefer concise operational summaries.",
];

const RELEASE_SAFETY_PATTERNS = [
  /\b(release|releas(e|ing))\b/i,
  /\bdisposition\b/i,
  /\b(approve|approval|reject|sign[\s-]?off)\b/i,
  /\bis (it|this batch|the batch) safe\b/i,
  /\bcan (qa|we|i)\b.*\b(release|approve|ship|dispose)\b/i,
  /\bgmp\b/i,
];

/** Phrases the assistant must never emit (release/root-cause overreach). */
const BANNED_PHRASES: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(safe to release|cleared for release|approved for release|ok to release)\b/i, reason: "release decision" },
  { pattern: /\bbatch is safe\b/i, reason: "safety assertion" },
  { pattern: /\b(root cause (is|confirmed|was)|confirmed root cause|definitive root cause)\b/i, reason: "unconfirmed root-cause claim" },
  { pattern: /\b(you (can|should) release|i (recommend|approve) releas)/i, reason: "release recommendation" },
  { pattern: /\b(do not release|reject the batch|fail the batch)\b/i, reason: "disposition decision" },
];

export function classifyIntent(question: string): CopilotIntent {
  const q = question.toLowerCase();
  if (isReleaseSafetyDecision(question)) return "release_decision";
  if (/\bhandover\b|\bhand-over\b|\bshift summary\b/.test(q)) return "shift_handover";
  if (/\bmissing\b|\bgaps?\b|\bincomplete\b|\bwhat data\b/.test(q)) return "data_gaps";
  if (/\bmaintenance\b|\binspect\b|\bequipment\b.*\b(review|check|inspect)\b|\bwhich equipment\b/.test(q)) return "maintenance_review";
  if (/\bsop\b|\bprocedure\b|\bsection\b/.test(q)) return "sop_reference";
  if (/\bmanager\b.*\bvs\b|\bqa reviewer\b.*\bvs\b|\bvs\b.*\bqa\b|\baudience\b/.test(q)) return "audience_framing";
  if (/\bwhy\b|\bdelayed?\b|\bwhat happened\b|\bbefore\b|\bexcursion\b|\bdeviation\b/.test(q)) return "deviation_triage";
  return "general";
}

export function isReleaseSafetyDecision(question: string): boolean {
  return RELEASE_SAFETY_PATTERNS.some((p) => p.test(question));
}

export interface SanitizeResult {
  text: string;
  violations: string[];
}

/** Neutralizes banned phrasing in free text and reports what was caught. */
export function sanitizeText(text: string): SanitizeResult {
  let out = text;
  const violations: string[] = [];
  for (const { pattern, reason } of BANNED_PHRASES) {
    if (pattern.test(out)) {
      violations.push(reason);
      out = out.replace(pattern, "[requires human review]");
    }
  }
  return { text: out, violations };
}

export function sanitizeStringList(items: string[]): { items: string[]; violations: string[] } {
  const violations: string[] = [];
  const cleaned = items.map((item) => {
    const res = sanitizeText(item);
    violations.push(...res.violations);
    return res.text;
  });
  return { items: cleaned, violations };
}
