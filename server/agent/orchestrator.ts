/**
 * Copilot orchestrator. Flow:
 *   1. Classify intent (guardrails).
 *   2. Build a deterministic evidence packet (tools + retrieval).
 *   3. Produce a deterministic, evidence-grounded structured response.
 *   4. Optionally enrich the narrative with OpenAI, Anthropic, or Gemini (citations stay deterministic).
 *   5. Run guardrails sanitization on all free text.
 *
 * The deterministic path means the demo and evals work with NO API key.
 */

import { buildEvidencePacket, type EvidencePacket } from "./evidenceBuilder";
import {
  classifyIntent,
  HUMAN_REVIEW_DISCLAIMER,
  sanitizeStringList,
  sanitizeText,
} from "./guardrails";
import { generateNarrative, getLlmProvider, getModelName, isLlmEnabled } from "./llm";
import { buildSystemPrompt, buildUserPrompt } from "./promptTemplates";
import type {
  ContributingFactor,
  CopilotIntent,
  CopilotRequest,
  CopilotResponse,
  EvidenceRef,
  TimelineEntry,
} from "../../app/src/types/agent";
import type { ProcessEvent } from "../../app/src/types/domain";

export interface RunOptions {
  forceDeterministic?: boolean;
}

export async function runCopilot(
  req: CopilotRequest,
  opts: RunOptions = {}
): Promise<CopilotResponse> {
  const intent = classifyIntent(req.question);
  const packet = buildEvidencePacket(req.batchId, req.question);

  if (!packet) {
    const resp = notFoundResponse(req.batchId, intent);
    const foreign = mentionedForeignBatches(req.question, req.batchId);
    if (foreign.length) {
      resp.answer += ` I cannot substitute another batch's evidence (${foreign.join(", ")}) for ${req.batchId}.`;
    }
    return resp;
  }

  const base = buildDeterministic(packet, intent, req.question);

  // Release/safety questions are answered deterministically by design — we do
  // not let the model improvise a disposition.
  const useLlm = !opts.forceDeterministic && isLlmEnabled() && intent !== "release_decision";

  if (useLlm) {
    const narrative = await generateNarrative(
      buildSystemPrompt(),
      buildUserPrompt(req.question, intent, packet)
    );
    if (narrative && narrative.answer.trim()) {
      const validIds = new Set(packet.evidence.map((e) => e.id));
      base.answer = narrative.answer;
      base.whatHappened = narrative.whatHappened.length ? narrative.whatHappened : base.whatHappened;
      if (narrative.contributingFactors.length) {
        base.contributingFactors = narrative.contributingFactors.map((f) => ({
          ...f,
          evidenceIds: f.evidenceIds.filter((id) => validIds.has(id)),
        }));
      }
      if (narrative.whatToCheckNext.length) base.whatToCheckNext = narrative.whatToCheckNext;
      base.generatedBy = getLlmProvider() ?? "openai";
      base.model = getModelName();
    }
  }

  return applyGuardrails(base);
}

// ---------------------------------------------------------------------------
// Deterministic response construction
// ---------------------------------------------------------------------------

function buildDeterministic(
  packet: EvidencePacket,
  intent: CopilotIntent,
  question: string
): CopilotResponse {
  const common = commonFields(packet, intent);

  let resp: CopilotResponse;
  switch (intent) {
    case "release_decision":
      resp = buildReleaseResponse(packet, common);
      break;
    case "maintenance_review":
      resp = buildMaintenanceResponse(packet, common);
      break;
    case "shift_handover":
      resp = buildHandoverResponse(packet, common);
      break;
    case "data_gaps":
      resp = buildDataGapsResponse(packet, common);
      break;
    case "sop_reference":
      resp = buildSopResponse(packet, common, question);
      break;
    case "audience_framing":
      resp = buildAudienceResponse(packet, common);
      break;
    case "deviation_triage":
    case "general":
    default:
      resp = buildTriageResponse(packet, common);
  }
  return groundToPacket(resp, packet);
}

type CommonFields = Pick<
  CopilotResponse,
  | "evidenceTimeline"
  | "dataQuality"
  | "relatedAssets"
  | "relatedDocuments"
  | "evidence"
  | "humanReviewRequired"
  | "humanReviewDisclaimer"
  | "generatedBy"
  | "intent"
  | "limitations"
  | "confidence"
>;

function commonFields(packet: EvidencePacket, intent: CopilotIntent): CommonFields {
  const evidenceTimeline: TimelineEntry[] = packet.events.map((e) => ({
    timestamp: e.timestamp,
    description: e.title,
    evidenceId: e.id,
    category: e.category,
  }));

  const relatedDocuments: EvidenceRef[] = packet.docHits.map((d) => ({
    id: d.sectionId,
    type: "document_section",
    label: d.title,
    detail: d.documentTitle,
  }));

  const humanReviewRequired = Boolean(
    packet.deviation && packet.deviation.status !== "closed"
  );

  return {
    evidenceTimeline,
    dataQuality: packet.dataQuality.map((f) => f.message),
    relatedAssets: packet.relatedEquipment.map((e) => ({
      id: e.id,
      name: `${e.tag} — ${e.name}`,
    })),
    relatedDocuments,
    evidence: packet.evidence,
    humanReviewRequired,
    humanReviewDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    generatedBy: "deterministic",
    intent,
    limitations: [
      "Based solely on synthetic operational data and retrieved SOP excerpts.",
      "Contributing factors are hypotheses, not a confirmed root cause.",
    ],
    confidence: humanReviewRequired ? "medium" : "high",
  };
}

function findEvent(events: ProcessEvent[], re: RegExp): ProcessEvent | undefined {
  return events.find((e) => re.test(e.title) || (e.description ? re.test(e.description) : false));
}

function id(evt: ProcessEvent | undefined): string[] {
  return evt ? [evt.id] : [];
}

function buildTriageResponse(packet: EvidencePacket, common: CommonFields): CopilotResponse {
  const { events } = packet;
  const cipHold = findEvent(events, /CIP hold|conductivity/i);
  const start = findEvent(events, /batch started/i);
  const phDrift = findEvent(events, /pH drift/i);
  const phAlarm = findEvent(events, /pH low alarm/i);
  const tempExc = findEvent(events, /temperature excursion/i);
  const agDip = findEvent(events, /agitator/i);
  const buffer = findEvent(events, /buffer addition/i);
  const devOpened = findEvent(events, /deviation .* opened/i);
  const dev = packet.deviation;

  const valveNote = packet.operatorNotes.find((n) => /valve|sticking/i.test(n.content));

  const isB104Story = Boolean(cipHold && phDrift && tempExc && buffer && dev);
  const answer = isB104Story
    ? `Batch ${packet.batch.id} started late and is now under deviation ${dev?.id ?? "—"}. ` +
      `The most relevant contributing factors are an extended CIP delay before the batch, a gradual pH drift ` +
      `below the target range during fermentation, a temperature excursion above the upper limit, and a manual ` +
      `operator intervention (buffer addition) after the pH low alarm. These are contributing factors and ` +
      `hypotheses, not a confirmed root cause — QA/human review is required before escalation.`
    : dev
      ? `Batch ${packet.batch.id} is under deviation ${dev.id} ("${dev.title}", ${dev.severity}, ${dev.status.replace("_", " ")}). ` +
        `${packet.events.length} events, ${packet.anomalies.length} anomaly windows and ${packet.workOrders.length} related work orders are on record; see the evidence below. These are observations, not a confirmed root cause — QA/human review is required.`
      : `Batch ${packet.batch.id} is ${packet.batch.status} with no deviation on record. ` +
        `${packet.events.length} events and ${packet.workOrders.length} work orders on related equipment are available below; nothing in the evidence indicates a CIP, pH, or temperature issue for this batch.`;

  const whatHappened = [
    cipHold && `Pre-batch CIP cycle was held because conductivity did not reach the rinse threshold in time (${[cipHold.id, "ANOM-B104-CIP"].join(", ")}).`,
    start && `Batch started behind plan (${start.id}).`,
    phDrift && phAlarm && `pH drifted below the lower limit and triggered a low-pH alarm (${[phDrift.id, phAlarm.id, "ANOM-B104-PH"].join(", ")}).`,
    tempExc && `Temperature exceeded the upper control limit for ~18 minutes (${[tempExc.id, "ANOM-B104-TEMP", "SIG-TEMP-101"].join(", ")}).`,
    agDip && `Agitator speed briefly dipped during the same window (${[agDip.id, "ANOM-B104-AG"].join(", ")}).`,
    buffer && `Operator added buffer per SOP after the alarm (${[buffer.id, "NOTE-B104-002"].join(", ")}).`,
    devOpened && dev && `Deviation ${dev.id} was opened for temperature excursion and delayed pH correction; QA review pending (${[devOpened.id, dev.id].join(", ")}).`,
  ].filter(Boolean) as string[];

  const contributingFactors: ContributingFactor[] = [
    cipHold && {
      factor: "Extended CIP hold delayed batch start (conductivity slow to reach threshold).",
      confidence: "medium" as const,
      evidenceIds: [...id(cipHold), "ANOM-B104-CIP", "WO-752"],
    },
    phDrift && {
      factor: "pH probe accuracy may be degraded — calibration due soon (WO-731) — potentially linked to the pH drift and late correction.",
      confidence: "medium" as const,
      evidenceIds: ["WO-731", ...id(phDrift)],
    },
    tempExc && {
      factor: "Temperature excursion above the upper control limit during fermentation.",
      confidence: "high" as const,
      evidenceIds: [...id(tempExc), "ANOM-B104-TEMP"],
    },
    valveNote && {
      factor: "Transfer valve VLV-203 sticking noted by operator; inspection open (WO-744).",
      confidence: "low" as const,
      evidenceIds: [valveNote.id, "WO-744"],
    },
  ].filter(Boolean) as ContributingFactor[];

  const whatToCheckNext = [
    `Review deviation ${dev?.id ?? "record"} and the batch record (BMR-B104-004) for completeness.`,
    "Verify PH-101 calibration status (WO-731) before trusting pH readings.",
    "Inspect transfer valve VLV-203 for sticking (WO-744).",
    "Confirm CIP-201 conductivity sensor response time (WO-752).",
    "Complete the operator note on the manual valve check (NOTE-B104-001).",
    "Escalate to QA for disposition per SOP-DEV-005.",
  ];

  return {
    answer,
    whatHappened,
    contributingFactors,
    whatToCheckNext,
    ...common,
  };
}

function buildReleaseResponse(packet: EvidencePacket, common: CommonFields): CopilotResponse {
  const dev = packet.deviation;
  const answer =
    `I cannot make a release decision or batch disposition — that is QA's responsibility and is out of scope ` +
    `for this assistant. QA review is required. To support that review, a qualified reviewer should check the ` +
    `deviation record (${dev?.id ?? "deviation"}) and the relevant SOP sections (e.g. SOP-DEV-006 on batch ` +
    `disposition), confirm calibration status (WO-731), and complete the batch record.`;

  return {
    answer,
    whatHappened: [
      `Batch ${packet.batch.id} has an open deviation (${dev?.id ?? "—"}) currently ${dev?.status.replace("_", " ") ?? "pending"} (${dev?.id ?? ""}).`,
      "Disposition authority rests with QA per SOP-DEV-006; this assistant only summarizes evidence.",
    ],
    contributingFactors: [],
    whatToCheckNext: [
      `Open and review the deviation record ${dev?.id ?? ""} in the QMS.`,
      "Review SOP-DEV-006 (batch disposition) and SOP-DEV-005 (escalation).",
      "Confirm calibration and sensor reliability evidence (WO-731, WO-752).",
      "Route to QA for the disposition decision.",
    ],
    ...common,
    confidence: "high",
    humanReviewRequired: true,
  };
}

function buildMaintenanceResponse(packet: EvidencePacket, common: CommonFields): CopilotResponse {
  const answer =
    "For maintenance and QA review, three equipment items stand out based on the evidence: the PH-101 pH probe " +
    "(calibration due, WO-731), the VLV-203 transfer valve (sticking observed by the operator, inspection open " +
    "WO-744), and the CIP-201 CIP skid / conductivity sensor (response-time check open, WO-752).";

  return {
    answer,
    whatHappened: [
      "PH-101 pH probe: calibration is due soon (WO-731); pH drifted below range during the batch (EVT-B104-005).",
      "VLV-203 transfer valve: operator observed slight sticking (NOTE-B104-001); inspection work order is open (WO-744).",
      "CIP-201 conductivity sensor: extended CIP hold suggests slow/uncertain readings (ANOM-B104-CIP); sensor check open (WO-752).",
    ],
    contributingFactors: [
      { factor: "pH probe calibration status may affect measurement reliability.", confidence: "medium", evidenceIds: ["WO-731", "EVT-B104-005"] },
      { factor: "Transfer valve sticking could affect transfer/agitation behavior.", confidence: "low", evidenceIds: ["NOTE-B104-001", "WO-744"] },
      { factor: "CIP conductivity sensor responsiveness may have extended the CIP hold.", confidence: "medium", evidenceIds: ["ANOM-B104-CIP", "WO-752"] },
    ],
    whatToCheckNext: [
      "Prioritize VLV-203 inspection (WO-744, high priority).",
      "Verify PH-101 calibration (WO-731) before next batch.",
      "Check CIP-201 conductivity sensor response (WO-752).",
    ],
    ...common,
  };
}

function buildHandoverResponse(packet: EvidencePacket, common: CommonFields): CopilotResponse {
  const dev = packet.deviation;
  const answer = `Shift handover summary for Batch ${packet.batch.id}.`;

  return {
    answer,
    whatHappened: [
      `Current deviation status: ${dev?.id ?? "—"} is ${dev?.status.replace("_", " ") ?? "n/a"}; QA review pending (${dev?.id ?? ""}).`,
      `Affected batch / assets: Batch ${packet.batch.id} on BIO-101 (Bioreactor Train A); equipment ${packet.relatedEquipment.map((e) => e.tag).join(", ")}.`,
      "Open actions: QA disposition of the deviation; inspect VLV-203 (WO-744); verify PH-101 calibration (WO-731); check CIP-201 conductivity sensor (WO-752).",
      "Next shift watchouts: monitor pH trend (probe calibration due), watch temperature stability after the excursion, and complete outstanding operator notes (NOTE-B104-001).",
    ],
    contributingFactors: [],
    whatToCheckNext: [
      "Confirm QA has the deviation record for review.",
      "Track WO-744 / WO-731 / WO-752 to closure.",
      "Complete the batch record open items (BMR-B104-009).",
    ],
    ...common,
  };
}

function buildDataGapsResponse(packet: EvidencePacket, common: CommonFields): CopilotResponse {
  const dev = packet.deviation;
  const answer =
    "Before escalation, several data gaps should be closed: calibration verification for the PH-101 pH probe " +
    "(WO-731) is not documented; manual intervention details (buffer addition and the valve check) are incomplete " +
    "in the operator notes; confirm sensor reliability for the CIP-201 conductivity sensor (WO-752); and QA " +
    `disposition pending for deviation ${dev?.id ?? "—"}.`;

  return {
    answer,
    whatHappened: [
      "Calibration verification: PH-101 calibration due (WO-731) and not yet confirmed.",
      "Manual intervention details: operator note on the valve check is marked partial (NOTE-B104-001).",
      "Confirm sensor reliability: CIP-201 conductivity sensor check is open (WO-752).",
      `QA disposition pending: deviation ${dev?.id ?? ""} is still under review.`,
    ],
    contributingFactors: [],
    whatToCheckNext: [
      "Document PH-101 calibration verification (WO-731).",
      "Complete operator note NOTE-B104-001 with valve position before/after.",
      "Record buffer addition volume/lot in the batch record (BMR-B104-003).",
      "Confirm CIP-201 sensor reliability (WO-752).",
    ],
    ...common,
  };
}

function buildSopResponse(
  packet: EvidencePacket,
  common: CommonFields,
  _question: string
): CopilotResponse {
  const dev = packet.deviation;
  const sopHits = packet.docHits
    .map((d) => d.sectionId)
    .filter((sectionId) => sectionId.startsWith("SOP-"));
  const anchor = ["SOP-DEV-005", "SOP-DEV-006", "SOP-BIO-OPS-003", "SOP-CIP-002"];
  // Always anchor on the core deviation/operations/CIP SOP sections, then add
  // any additional SOP sections surfaced by retrieval.
  const cited = [...new Set([...anchor, ...sopHits])];

  const answer =
    "The most relevant SOP sections for this deviation are: " +
    `${cited.join(", ")}. These cover deviation escalation and disposition, bioreactor temperature-excursion ` +
    "handling, and CIP conductivity acceptance.";

  return {
    answer,
    whatHappened: [
      "[SOP-DEV-005] Escalation criteria — escalate major deviations to QA within 4 hours.",
      "[SOP-DEV-006] Batch disposition — only QA may disposition a batch.",
      "[SOP-BIO-OPS-003] Temperature excursions above 37.5°C for >15 min require a deviation.",
      "[SOP-CIP-002] Final rinse conductivity must be below 0.10 mS/cm before batch start.",
      ...packet.docHits
        .filter((d) => !d.sectionId.startsWith("SOP-"))
        .map((d) => `[${d.sectionId}] ${d.documentTitle} — ${d.title}: ${truncate(d.content, 160)}`),
    ],
    contributingFactors: [],
    whatToCheckNext: [
      ...(dev ? [`Apply SOP-DEV-005 escalation timing to ${dev.id}.`] : []),
      "Confirm temperature-excursion handling per SOP-BIO-OPS-003.",
      "Verify CIP acceptance per SOP-CIP-002.",
    ],
    ...common,
  };
}

function buildAudienceResponse(packet: EvidencePacket, common: CommonFields): CopilotResponse {
  const dev = packet.deviation;
  const delayMin = delayMinutes(packet);
  const delayLead = delayMin != null ? `${delayMin}-minute delayed start` : "schedule vs plan";
  const devLabel = dev?.id ?? "the open deviation";
  const answer =
    "For an operations manager: lead with schedule and containment — the batch started late after a CIP delay, " +
    "there was a temperature excursion that returned to range, and the line is stable but under a deviation. " +
    "For a QA reviewer: lead with compliance and evidence — deviation " +
    `${devLabel}, SOP adherence, calibration status ` +
    "(WO-731), evidence completeness, and disposition readiness.";

  return {
    answer,
    whatHappened: [
      `Operations manager view: ${delayLead}, temperature excursion recovered, current status under deviation, immediate containment actions.`,
      `QA reviewer view: deviation ${devLabel} scope, SOP compliance (SOP-DEV / SOP-BIO-OPS), calibration verification (WO-731), data completeness, disposition pending.`,
    ],
    contributingFactors: [],
    whatToCheckNext: [
      "Ops: confirm schedule impact on downstream batches.",
      "QA: confirm deviation record completeness before disposition.",
    ],
    ...common,
  };
}

// ---------------------------------------------------------------------------
// Guardrail post-processing
// ---------------------------------------------------------------------------

/** Ids in the packet, plus SOP section ids (plant-wide procedures, not batch-scoped). */
function knownIdSet(packet: EvidencePacket): Set<string> {
  return new Set(packet.evidence.map((e) => e.id));
}

const ID_TOKEN = /(?<![A-Z]-)\b(EVT|ANOM|NOTE|WO|DEV|BMR|SHIFT|SIG)-[A-Z0-9-]+\b/g;

/**
 * True when free text names an evidence id that is not in this batch's packet.
 * SOP-* ids are exempt (procedures apply to every batch). Ids that embed a
 * batch number (…-B104-…) must match the packet's batch.
 */
function mentionsForeignId(text: string, packet: EvidencePacket, known: Set<string>): boolean {
  const batchDigits = packet.batch.id.replace(/\D/g, "");
  for (const m of text.matchAll(ID_TOKEN)) {
    const id = m[0];
    const embedded = /-B-?(\d+)-/.exec(id)?.[1];
    if (embedded && embedded !== batchDigits) return true;
    if (!known.has(id)) return true;
  }
  return false;
}

function groundToPacket(resp: CopilotResponse, packet: EvidencePacket): CopilotResponse {
  const known = knownIdSet(packet);
  const keep = (s: string) => !mentionsForeignId(s, packet, known);
  return {
    ...resp,
    whatHappened: resp.whatHappened.filter(keep),
    whatToCheckNext: resp.whatToCheckNext.filter(keep),
    contributingFactors: resp.contributingFactors
      .map((f) => ({ ...f, evidenceIds: f.evidenceIds.filter((id) => known.has(id)) }))
      .filter((f) => f.evidenceIds.length > 0 && keep(f.factor)),
  };
}

function delayMinutes(packet: EvidencePacket): number | null {
  if (!packet.batch.actualStart || !packet.batch.plannedStart) return null;
  const ms = Date.parse(packet.batch.actualStart) - Date.parse(packet.batch.plannedStart);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.round(ms / 60_000);
}

function applyGuardrails(resp: CopilotResponse): CopilotResponse {
  const answerRes = sanitizeText(resp.answer);
  const whatHappenedRes = sanitizeStringList(resp.whatHappened);
  const checkRes = sanitizeStringList(resp.whatToCheckNext);
  const factorsRes = sanitizeStringList(resp.contributingFactors.map((f) => f.factor));

  const violations = [
    ...answerRes.violations,
    ...whatHappenedRes.violations,
    ...checkRes.violations,
    ...factorsRes.violations,
  ];

  const limitations = [...resp.limitations];
  if (violations.length) {
    limitations.push(
      `Guardrails neutralized ${violations.length} statement(s) that overreached (${[...new Set(violations)].join(", ")}).`
    );
  }

  return {
    ...resp,
    answer: answerRes.text,
    whatHappened: whatHappenedRes.items,
    whatToCheckNext: checkRes.items,
    contributingFactors: resp.contributingFactors.map((f, i) => ({
      ...f,
      factor: factorsRes.items[i],
    })),
    limitations,
  };
}

function mentionedForeignBatches(question: string, batchId: string): string[] {
  return [...new Set([...question.matchAll(/\bB-\d+\b/g)].map((m) => m[0]).filter((id) => id !== batchId))];
}

function notFoundResponse(batchId: string, intent: CopilotIntent): CopilotResponse {
  return {
    answer: `No data found for batch ${batchId}. Select a valid batch (e.g. B-104).`,
    whatHappened: [],
    evidenceTimeline: [],
    contributingFactors: [],
    whatToCheckNext: [],
    dataQuality: [],
    relatedAssets: [],
    relatedDocuments: [],
    evidence: [],
    confidence: "low",
    limitations: ["Batch not found in the local dataset."],
    humanReviewRequired: false,
    humanReviewDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    generatedBy: "deterministic",
    intent,
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
