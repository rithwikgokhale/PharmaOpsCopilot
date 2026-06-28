# PharmaOps Copilot

**Batch Deviation Triage Prototype** — a Cognite-inspired, CDF-ready field engineering demo for pharma manufacturing deviation triage.

> This is not a validated GxP application and should not be used for real batch release, QA disposition, safety, or regulatory decisions. It is a field-engineering prototype demonstrating how contextualized industrial data and LLM-based reasoning could support human-reviewed deviation triage.

## What this is

A local-first React dashboard that models a pharma pilot plant batch deviation (Batch **B-104**) using synthetic data. The architecture mirrors Cognite Data Fusion concepts (assets, equipment, time series, activities, files) via an `IDataProvider` abstraction so a future `CdfDataProvider` could replace local JSON files.

## Quick start

```bash
# Install dependencies
npm install

# Generate synthetic data (JSON → data/generated + public/data/generated)
npm run generate-data

# Run frontend + API stub
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Default batch: **B-104**.

## Environment variables

Copy `.env.example` to `.env` (not committed):

```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

OpenAI is only needed for Phase 2 (copilot). The dashboard runs without it.

## Project structure

```
app/src/adapters/     IDataProvider, LocalDataProvider, CdfDataProvider.stub
app/src/components/   Dashboard UI (asset tree, timeline, charts)
data/generated/       Synthetic JSON (source of truth)
data/documents/       SOP markdown files
scripts/              Python data generator
server/               Express API stub (copilot in Phase 2)
```

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

## Build phases

- **Phase 1 (current):** Scaffold, synthetic data, dashboard for B-104
- **Phase 2:** Server-side copilot, evidence packet, evals, guardrails
- **Phase 3:** CDF mapping page, polish, demo script, deploy

## License

MIT — synthetic data only, no real customer data.
