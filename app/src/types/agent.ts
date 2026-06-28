/**
 * Shared contract between the copilot backend (server/agent) and the frontend.
 * Kept framework-agnostic so the server can import it directly.
 */

export type EvidenceType =
  | "event"
  | "workOrder"
  | "document_section"
  | "signal"
  | "operator_note"
  | "deviation"
  | "anomaly";

export interface EvidenceRef {
  id: string;
  type: EvidenceType;
  label: string;
  detail?: string;
  timestamp?: string;
}

export interface TimelineEntry {
  timestamp: string;
  description: string;
  evidenceId?: string;
  category?: string;
}

export type Confidence = "low" | "medium" | "high";

export interface ContributingFactor {
  factor: string;
  confidence: Confidence;
  evidenceIds: string[];
}

export interface RelatedAssetRef {
  id: string;
  name: string;
  reason?: string;
}

export interface CopilotResponse {
  /** 1. Direct answer */
  answer: string;
  /** 2. What happened */
  whatHappened: string[];
  /** 3. Evidence timeline */
  evidenceTimeline: TimelineEntry[];
  /** 4. Most likely contributing factors (hypotheses, not confirmed root cause) */
  contributingFactors: ContributingFactor[];
  /** 5. What to check next */
  whatToCheckNext: string[];
  /** 6. Data quality / missing context */
  dataQuality: string[];
  /** Supporting references */
  relatedAssets: RelatedAssetRef[];
  relatedDocuments: EvidenceRef[];
  evidence: EvidenceRef[];
  /** Confidence + limitations */
  confidence: Confidence;
  limitations: string[];
  /** 7. Human review disclaimer */
  humanReviewRequired: boolean;
  humanReviewDisclaimer: string;
  /** Provenance */
  generatedBy: "deterministic" | "openai";
  model?: string;
  intent: CopilotIntent;
}

export type CopilotIntent =
  | "deviation_triage"
  | "release_decision"
  | "maintenance_review"
  | "shift_handover"
  | "data_gaps"
  | "sop_reference"
  | "audience_framing"
  | "general";

export interface CopilotRequest {
  batchId: string;
  question: string;
}

export interface DemoPrompt {
  id: string;
  label: string;
  question: string;
}

export const DEMO_PROMPTS: DemoPrompt[] = [
  { id: "dp-why", label: "Why delayed?", question: "Why was Batch B-104 delayed, and what should I check before escalating the deviation?" },
  { id: "dp-before", label: "Before excursion", question: "What happened before the temperature excursion?" },
  { id: "dp-equip", label: "Equipment to review", question: "Which equipment should QA or maintenance review?" },
  { id: "dp-handover", label: "Shift handover", question: "Generate a shift handover summary." },
  { id: "dp-missing", label: "Missing data", question: "What data is missing before escalation?" },
  { id: "dp-sop", label: "Relevant SOPs", question: "What SOP sections are relevant?" },
  { id: "dp-release", label: "Can QA release?", question: "Can QA release this batch?" },
  { id: "dp-audience", label: "Ops vs QA", question: "What would you show an operations manager vs a QA reviewer?" },
];
