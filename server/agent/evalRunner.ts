/**
 * Lightweight eval runner. Runs each case through the copilot in DETERMINISTIC
 * mode so results are stable and reproducible without an API key, then checks
 * required keywords, banned phrases, and expected evidence IDs.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { runCopilot } from "./orchestrator";
import type { CopilotResponse } from "../../app/src/types/agent";

export interface EvalCase {
  id: string;
  userQuestion: string;
  batchId: string;
  expectedEvidenceIds: string[];
  mustMention: string[];
  mustNotSay: string[];
  riskLevel: "low" | "medium" | "high";
  passCriteria: string;
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
  mode: "deterministic";
  total: number;
  passed: number;
  failed: number;
  cases: EvalCaseResult[];
}

function flattenSearchText(resp: CopilotResponse): string {
  return [
    resp.answer,
    ...resp.whatHappened,
    ...resp.contributingFactors.map((f) => f.factor),
    ...resp.whatToCheckNext,
    ...resp.dataQuality,
  ]
    .join("\n")
    .toLowerCase();
}

function collectEvidenceIds(resp: CopilotResponse): string {
  const ids = [
    ...resp.evidence.map((e) => e.id),
    ...resp.contributingFactors.flatMap((f) => f.evidenceIds),
    ...resp.evidenceTimeline.map((t) => t.evidenceId ?? ""),
    ...resp.relatedDocuments.map((d) => d.id),
  ];
  // Include answer/bullets so IDs cited inline are also counted.
  return [ids.join(" "), flattenSearchText(resp)].join(" ").toLowerCase();
}

export async function runEvals(): Promise<EvalRunResult> {
  const casesPath = join(process.cwd(), "evals", "eval_cases.json");
  const cases = JSON.parse(readFileSync(casesPath, "utf-8")) as EvalCase[];

  const results: EvalCaseResult[] = [];

  for (const c of cases) {
    const resp = await runCopilot(
      { batchId: c.batchId, question: c.userQuestion },
      { forceDeterministic: true }
    );

    const searchText = flattenSearchText(resp);
    const evidenceText = collectEvidenceIds(resp);

    const missingMentions = c.mustMention.filter(
      (m) => !searchText.includes(m.toLowerCase())
    );
    const forbiddenFound = c.mustNotSay.filter((m) =>
      searchText.includes(m.toLowerCase())
    );
    const missingEvidenceIds = c.expectedEvidenceIds.filter(
      (id) => !evidenceText.includes(id.toLowerCase())
    );

    const pass =
      missingMentions.length === 0 &&
      forbiddenFound.length === 0 &&
      missingEvidenceIds.length === 0;

    results.push({
      id: c.id,
      userQuestion: c.userQuestion,
      riskLevel: c.riskLevel,
      pass,
      missingMentions,
      forbiddenFound,
      missingEvidenceIds,
      intent: resp.intent,
      answer: resp.answer,
    });
  }

  const runResult: EvalRunResult = {
    generatedAt: new Date().toISOString(),
    mode: "deterministic",
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    cases: results,
  };

  const outPath = join(process.cwd(), "evals", "results.json");
  writeFileSync(outPath, JSON.stringify(runResult, null, 2));

  return runResult;
}
