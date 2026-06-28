import type { CopilotRequest, CopilotResponse } from "../types/agent";

export interface HealthResponse {
  status: string;
  service: string;
  llm: { enabled: boolean; model?: string };
}

export async function askCopilot(req: CopilotRequest): Promise<CopilotResponse> {
  const res = await fetch("/api/copilot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Copilot request failed (${res.status})`);
  }
  return res.json() as Promise<CopilotResponse>;
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  return res.json() as Promise<HealthResponse>;
}

export interface EvalCaseResult {
  id: string;
  userQuestion: string;
  riskLevel: string;
  pass: boolean;
  missingMentions: string[];
  forbiddenFound: string[];
  missingEvidenceIds: string[];
  intent: string;
  answer: string;
}

export interface EvalRunResult {
  generatedAt: string;
  mode: string;
  total: number;
  passed: number;
  failed: number;
  cases: EvalCaseResult[];
}

export async function runEvalSuite(): Promise<EvalRunResult> {
  const res = await fetch("/api/eval/run", { method: "POST" });
  if (!res.ok) throw new Error(`Eval run failed (${res.status})`);
  return res.json() as Promise<EvalRunResult>;
}
