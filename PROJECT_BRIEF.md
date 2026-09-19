# Project Brief

**PharmaOps Copilot** is a local-first prototype for pharma batch deviation triage. It models a synthetic pilot plant (Batch **B-104**, deviation **DEV-104**) and demonstrates how contextualized operational data plus a guardrailed AI copilot could support human-reviewed escalation — without making release, safety, or regulatory decisions.

**Project website:** [rithwikgokhale.github.io/PharmaOpsCopilot](https://rithwikgokhale.github.io/PharmaOpsCopilot/)

## Goals

- Show an evidence-grounded copilot that cites real IDs from events, anomalies, work orders, operator notes, and SOP sections.
- Unify messy IT/OT/ET exports (`data/raw/` + `contextualize.py`) into one model mapped onto ISA-88/95 + Records + a `PharmaDeviation` extension.
- Expose the same tools over a local MCP server and export them as Atlas AI agent/skill/eval YAML.
- Run fully without OpenAI or Cognite credentials; optional LLM enriches narrative only after deterministic evidence is assembled.
- Prove behavior with an 18-case eval suite (guardrails, citations, release refusal, adversarial prompts).

## Primary demo storyline (B-104)

1. Extended CIP hold delays batch start.
2. pH drifts below range; operator adds buffer after alarm.
3. Temperature excursion during fermentation.
4. Deviation DEV-104 opened; QA review pending.
5. Copilot triages with hypotheses (not confirmed root cause) and cites WO-731, WO-744, WO-752, relevant SOPs.

## Stack (summary)

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind, Recharts |
| Backend | Node.js, Express, MCP SDK |
| Data | Siloed IT/OT/ET exports + Python contextualizer |
| AI | Deterministic orchestrator + optional OpenAI (server-side only) |
| Quality | Vitest + 18-case eval runner |
| CDF-shaped | Toolkit YAML skeleton, Atlas agents-as-code, Industrial MCP tool families |

## Out of scope

- Not a validated GxP application.
- No live Cognite CDF or Atlas integration (`CdfDataProvider` is a stub).
- Keyword document retrieval only (embeddings documented as future work).

## Where to go next

- **Run locally:** see [README.md](./README.md)
- **Walk through a demo:** [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)
- **CDF mapping:** [COGNITE_MAPPING.md](./COGNITE_MAPPING.md)
- **Evals:** [EVALS.md](./EVALS.md)
