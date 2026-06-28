import { AGENT_IDENTITY, UNIVERSAL_RULES } from "./guardrails";
import { serializePacketForPrompt, type EvidencePacket } from "./evidenceBuilder";
import type { CopilotIntent } from "../../app/src/types/agent";

export function buildSystemPrompt(): string {
  return [
    AGENT_IDENTITY,
    "",
    "Rules:",
    ...UNIVERSAL_RULES.map((r) => `- ${r}`),
    "",
    "You will receive a structured evidence packet. Reason ONLY over it. Do not invent",
    "events, equipment, measurements, or document IDs. Every evidence ID you cite must",
    "appear verbatim in the packet.",
    "",
    "Respond with a JSON object of the form:",
    "{",
    '  "answer": string,                       // direct, concise answer to the question',
    '  "whatHappened": string[],               // factual bullets, each citing evidence IDs',
    '  "contributingFactors": [                // hypotheses, NOT confirmed root cause',
    '    { "factor": string, "confidence": "low"|"medium"|"high", "evidenceIds": string[] }',
    "  ],",
    '  "whatToCheckNext": string[]             // concrete next actions for a human reviewer',
    "}",
    "",
    "Do not state a confirmed root cause. Do not make or recommend a release/disposition",
    "or safety decision; defer those to QA/human review.",
  ].join("\n");
}

export function buildUserPrompt(
  question: string,
  intent: CopilotIntent,
  packet: EvidencePacket
): string {
  return [
    `USER QUESTION: ${question}`,
    `DETECTED INTENT: ${intent}`,
    "",
    "EVIDENCE PACKET:",
    serializePacketForPrompt(packet),
  ].join("\n");
}
