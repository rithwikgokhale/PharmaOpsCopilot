# PharmaOps Copilot

[![Evals](https://img.shields.io/badge/evals-12%2F12%20passing-brightgreen)](./EVALS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Project docs](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://rithwikgokhale.github.io/PharmaOpsCopilot/)

**Batch Deviation Triage Prototype** — a Cognite-inspired, CDF-ready field engineering demo for pharma manufacturing deviation triage.

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

# Run frontend + API stub
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Default batch: **B-104**. The Vite dev server proxies `/api/*` to the Express backend on port 3001.

**Project documentation site** (architecture, demo script, setup): after enabling GitHub Pages, visit [https://rithwikgokhale.github.io/PharmaOpsCopilot/](https://rithwikgokhale.github.io/PharmaOpsCopilot/). Build locally with `cd site && npm install && npm run dev`.

## Testing and evals

```bash
npm test          # Vitest unit + integration tests (guardrails, tools, orchestrator, evals)
npm run eval      # 12 cases, deterministic mode → evals/results.json
```

The eval suite verifies required mentions, banned release/safety phrasing, and expected evidence IDs. See [EVALS.md](./EVALS.md) and [evals/results.sample.json](./evals/results.sample.json) for reference output.

Run the eval suite from the CLI:

```bash
npm run eval        # 12 cases, deterministic mode → evals/results.json
```

## Environment variables

OpenAI is **optional** — the copilot and evals run deterministically without a key. To enable LLM-enriched narratives, copy `.env.example` to `.env` (not committed):

```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
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
evals/                12 eval cases + runner
```

## Agent design

- **Evidence-first.** `server/agent/evidenceBuilder.ts` gathers facts via deterministic tools; the LLM only reasons over that packet. Citations come from data, never the model.
- **Guardrails.** Release / GMP / safety questions are declined and routed to QA. A post-processor neutralizes overreaching phrasing (`server/agent/guardrails.ts`).
- **Scoped intents.** Triage, release-decision, maintenance review, shift handover, data gaps, SOP reference, audience framing.
- **Evaluated.** 12 cases check required mentions, banned phrases, and expected evidence IDs — run them from the **Evals** tab or `npm run eval`.

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
