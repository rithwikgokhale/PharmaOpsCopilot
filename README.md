# PharmaOps Copilot

[![Evals](https://img.shields.io/badge/evals-18%2F18%20passing-brightgreen)](./EVALS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Project docs](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://rithwikgokhale.github.io/PharmaOpsCopilot/)

**[Project website →](https://rithwikgokhale.github.io/PharmaOpsCopilot/)** — architecture, screenshots, agent design, evals, setup guide, and CDF-ready mapping.

**Batch Deviation Triage Prototype** — a Cognite-inspired, CDF-ready demo for pharma manufacturing deviation triage. Local-first React dashboard + evidence-grounded copilot over synthetic Batch **B-104** data (events, time series, work orders, SOPs). Runs without OpenAI; optional LLM enriches narrative only after deterministic evidence is assembled.

> This is not a validated GxP application and should not be used for real batch release, QA disposition, safety, or regulatory decisions. It is a field-engineering prototype demonstrating how contextualized industrial data and LLM-based reasoning could support human-reviewed deviation triage.

## What this is

A local-first React dashboard **and evidence-grounded copilot** that models a pharma pilot plant batch deviation (Batch **B-104**) using synthetic data. The architecture mirrors Cognite Data Fusion concepts (assets, equipment, time series, activities, files) via an `IDataProvider` abstraction so a future `CdfDataProvider` could replace local JSON files.

The copilot answers questions like *"Why was Batch B-104 delayed, and what should I check before escalating?"* by assembling a deterministic evidence packet (events, anomalies, time-series stats, work orders, operator notes, SOP sections) **before** any LLM reasoning, so every citation is real and release/safety decisions are deferred to human review. It runs fully without an OpenAI key (deterministic engine); add a key to enrich the narrative.

## Quick start

```bash
# Install dependencies
npm install

# Generate synthetic data (JSON → data/generated + public/data/generated)
npm run generate-data

# Run frontend + Express API
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Default batch: **B-104**. The Vite dev server proxies `/api/*` to the Express backend on port 3001.

To run a production-style build (Express serves the built frontend and the API from one process on port 3001):

```bash
npm run build && npm start
```

For screenshots, architecture diagrams, and the full walkthrough, see the **[project website](https://rithwikgokhale.github.io/PharmaOpsCopilot/)**. Build the docs site locally with `cd site && npm install && npm run dev`.

## Testing and evals

```bash
npm test          # Vitest unit + integration tests (API routes, LLM mocks, guardrails, tools, orchestrator, evals)
npm run eval      # 18 cases, deterministic mode → evals/results.json
npm run lint      # ESLint
```

The eval suite verifies required mentions, banned release/safety phrasing, and expected evidence IDs — including adversarial jailbreak, false-authority, and role-play prompts that must be refused. See [EVALS.md](./EVALS.md) and [evals/results.sample.json](./evals/results.sample.json) for reference output.

## Environment variables

OpenAI is **optional** — the copilot and evals run deterministically without a key. Copy `.env.example` to `.env` (not committed). Only `OPENAI_API_KEY` and `OPENAI_MODEL` are used today; embedding settings are reserved for future vector retrieval.

```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
PORT=3001
```

The key is only ever read server-side (`server/agent/llm.ts`) and is never exposed to the browser.

## Project structure

```
app/src/adapters/     IDataProvider, LocalDataProvider, CdfDataProvider.stub
app/src/components/   Dashboard + copilot UI
app/src/pages/        Dashboard, Copilot, CDF-ready, Evals, About
app/src/agent/        Frontend API client + shared contract
data/generated/       Synthetic JSON (source of truth)
data/documents/       SOP markdown files (sectioned with cite IDs)
scripts/              Python data generator
server/agent/         Orchestrator, tools, evidence builder, guardrails, eval runner
server/retrieval/     Keyword document retriever (RAG Option A)
evals/                18 eval cases + runner
```

## Agent design

- **Evidence-first.** `server/agent/evidenceBuilder.ts` gathers facts via deterministic tools; the LLM only reasons over that packet. Citations come from data, never the model.
- **Guardrails.** Release / GMP / safety questions are declined and routed to QA. A post-processor neutralizes overreaching phrasing (`server/agent/guardrails.ts`).
- **Scoped intents.** Triage, release-decision, maintenance review, shift handover, data gaps, SOP reference, audience framing.
- **Evaluated.** 18 cases check required mentions, banned phrases, and expected evidence IDs — including adversarial jailbreak and prompt-injection attempts. Run them from the **Evals** tab or `npm run eval`.
- **Injection-hardened.** The user question and evidence packet are wrapped in explicit data delimiters with an instruction-hierarchy system rule, so instructions embedded in questions or documents are treated as data.

## Demo question

> "Why was Batch B-104 delayed, and what should I check before escalating the deviation?"

The dashboard surfaces: CIP delay, pH drift, temperature excursion, operator notes, work orders, deviation DEV-104, and SOP references.

## CDF / Atlas future path

| Local | Future CDF |
|-------|------------|
| Asset hierarchy | CogniteAsset |
| Equipment | CogniteEquipment |
| Time series | CogniteTimeSeries |
| Batch/Deviation | CogniteActivity (domain extension) |
| SOPs | CogniteFile |
| Copilot | Atlas AI agent + tools |
| Web app | Flows custom app via `connectToHostApp()` |

See [COGNITE_MAPPING.md](./COGNITE_MAPPING.md) for details.

## Limitations

- Synthetic data only; not validated for any GxP/regulatory use.
- Keyword retrieval (no vector DB yet) — adequate for the bounded SOP set.
- Single demo deviation (B-104) is fully modeled; other batches are simpler.

## License

MIT — synthetic data only, no real customer data.
