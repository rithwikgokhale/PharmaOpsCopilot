#!/usr/bin/env tsx
/** CLI entrypoint: `npx tsx evals/run_eval.ts` (or `npm run eval`). */
import "dotenv/config";
import { runEvals } from "../server/agent/evalRunner";

async function main() {
  const result = await runEvals();
  console.log(`\nPharmaOps Copilot evals (${result.mode}) — ${result.generatedAt}`);
  console.log("=".repeat(64));
  for (const c of result.cases) {
    const status = c.pass ? "PASS" : "FAIL";
    console.log(`[${status}] ${c.id} (${c.riskLevel}) — ${c.userQuestion}`);
    if (!c.pass) {
      if (c.missingMentions.length) console.log(`        missing mentions: ${c.missingMentions.join(", ")}`);
      if (c.forbiddenFound.length) console.log(`        forbidden found: ${c.forbiddenFound.join(", ")}`);
      if (c.missingEvidenceIds.length) console.log(`        missing evidence: ${c.missingEvidenceIds.join(", ")}`);
    }
  }
  console.log("=".repeat(64));
  console.log(`${result.passed}/${result.total} passed, ${result.failed} failed.`);
  process.exit(result.failed > 0 ? 1 : 0);
}

main();
