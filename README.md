# PharmaOps Copilot

[![Evals](https://img.shields.io/badge/evals-21%2F21%20passing-brightgreen)](./EVALS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Project docs](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://rithwikgokhale.github.io/PharmaOpsCopilot/)

**[Project website →](https://rithwikgokhale.github.io/PharmaOpsCopilot/)** — architecture, screenshots, agent design, evals, setup guide, and CDF-ready mapping.

**Batch Deviation Triage Prototype** — a Cognite-inspired, CDF-ready demo for pharma manufacturing deviation triage. Local-first React dashboard + evidence-grounded copilot over synthetic Batch **B-104** data (events, time series, work orders, SOPs). Runs without an LLM key; optional OpenAI, Anthropic, or Gemini enrich narrative only after deterministic evidence is assembled.

> This is not a validated GxP application and should not be used for real batch release, QA disposition, safety, or regulatory decisions. It is a field-engineering prototype demonstrating how contextualized industrial data and LLM-based reasoning could support human-reviewed deviation triage.

## What this is

A local-first React dashboard **and evidence-grounded copilot** that models a pharma pilot plant batch deviation (Batch **B-104**) using synthetic data. The architecture is CDF-ready: ISA-88/95 manufacturing views, Records for high-volume events, a `PharmaDeviation` extension, a local MCP server with Industrial MCP tool families, and Atlas AI agent-as-code YAML.

Four proofs, all runnable without a CDF tenant:

1. **Messy IT/OT/ET → one model.** Siloed MES / historian / CMMS / QMS / engineering exports in `data/raw/` are resolved by `contextualize.py` into a single JSON model plus a join report.
2. **Evidence-first copilot + 21 evals.** Deterministic evidence packet, guardrails, human-review for release/safety. Citations come from data, never the model.
3. **Local MCP server** (`npm run mcp`) exposing the same tool families [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp) hosts on CDF (`query`, `queryTimeSeriesDatapoints`, `askDocument`).
4. **Atlas agents-as-code export** (`npm run export:atlas`) — agent, skill, and CLI eval suite generated from `guardrails.ts` and `evals/eval_cases.json`.

An illustrative walk-through of triage time and why contextualization is the multiplier is on the [project site](https://rithwikgokhale.github.io/PharmaOpsCopilot/#value). The figures are a worked discovery-slide example, not a customer result. Field notes from running the prototype — identity matching, units and clocks, Records, policy guardrails, evals-as-code, and Industrial MCP — are in [FIELD_NOTES.md](./FIELD_NOTES.md) and on the [site](https://rithwikgokhale.github.io/PharmaOpsCopilot/#field-notes).

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

## MCP server

```bash
npm run mcp
```

Stdio MCP server (`server/mcp/index.ts`) over the same tools the copilot uses. Point Cursor or Claude Desktop at [`mcp.json.example`](./mcp.json.example) (`npx tsx server/mcp/index.ts`, set `cwd` to this repo). Logs go to **stderr**. On CDF this would be replaced by the [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp) endpoint — do not leave the local server running in the background.

## Agents as code

```bash
npm run export:atlas
```

Writes, with a generated-file header:

- `cdf/modules/pharmaops_deviation/agents/pharmaops_triage.Agent.yaml`
- `cdf/modules/pharmaops_deviation/agents/pharmaops_deviation_triage.Skill.yaml` + `.Skill.md`
- `cdf/agents/pharmaops-triage/pharmaops-triage.agent.yaml`
- `cdf/agents/pharmaops-triage/eval/eval.yaml`

Do not hand-edit those files. Change `server/agent/guardrails.ts` or `evals/eval_cases.json` and re-run the script. Format follows the [Atlas agent YAML](https://docs.cognite.com/dev/sdks/cognite-cli/agent-yaml) and [eval](https://docs.cognite.com/dev/sdks/cognite-cli/agents-eval) docs.

## Contextualization

`scripts/generate_synthetic_pharma_data.py` writes **siloed** IT/OT/ET exports under `data/raw/` (MES dates, historian UTC epoch + a °F tag, CMMS equipment numbers, duplicated events, orphan WFI tag/pump). `scripts/contextualize.py` resolves identities, units, and clocks into `data/generated/` and a `contextualization_report.json` (six source systems, matches, conversions, duplicates, repairs, and three unresolved orphans that stay excluded). The CDF-ready page in the app and on the [docs site](https://rithwikgokhale.github.io/PharmaOpsCopilot/#cdf) renders that report. `data/generated/` and `public/data/generated/` must stay identical (`npm run check-data-sync`).

## Testing and evals

```bash
npm test          # Vitest unit + integration tests (API routes, LLM mocks, guardrails, tools, orchestrator, evals)
npm run eval      # 21 cases, deterministic mode → evals/results.json
npm run lint      # ESLint
```

The eval suite verifies required mentions, banned release/safety phrasing, and expected evidence IDs — including adversarial jailbreak, false-authority, and role-play prompts that must be refused. See [EVALS.md](./EVALS.md) and [evals/results.sample.json](./evals/results.sample.json) for reference output. `npm run export:atlas` maps the same 21 local cases into [`cdf/agents/pharmaops-triage/eval/eval.yaml`](./cdf/agents/pharmaops-triage/eval/eval.yaml) as `ci`-tagged singles plus three `multi-turn` follow-up groups.

## Environment variables

An LLM is **optional** — the copilot and evals run deterministically without a key. Copy `.env.example` to `.env` (not committed). Set one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`. `LLM_PROVIDER` selects among them; if unset, the first key present wins (openai → anthropic → gemini). Document retrieval is hybrid keyword + a committed TF-IDF index (`npm run embed-sops`); `OPENAI_EMBEDDING_MODEL` is only used if you rebuild the index with `--provider openai`. Evals always force deterministic mode and ignore keys.

```
# LLM_PROVIDER=openai|anthropic|gemini
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=3001
```

Keys are only ever read server-side (`server/agent/llm.ts`) and are never exposed to the browser.

## Project structure

```
app/src/adapters/        IDataProvider, LocalDataProvider, CdfDataProvider.stub
app/src/components/      Dashboard, copilot, ContextualizationPanel, CdfReadinessPanel
app/src/pages/           Dashboard, Copilot, CDF-ready, Evals, About
server/agent/            Orchestrator, tools, evidence builder, guardrails
server/mcp/              Local MCP server (Industrial MCP-shaped)
server/retrieval/        Hybrid keyword + TF-IDF retriever (packet contract unchanged)
data/raw/                Siloed MES / Historian / CMMS / QMS / engineering exports
data/generated/          Unified model + contextualization_report.json + sop_embeddings.json
data/documents/          SOP markdown (cite IDs)
scripts/                 generate_synthetic_pharma_data.py, contextualize.py, embed_sops.py, export-atlas-agent.ts
cdf/modules/             Toolkit module (deviation view, Records stream, agent, skill)
cdf/agents/              Cognite CLI agent + eval.yaml
evals/                   21 eval cases + runner
site/                    GitHub Pages docs site
```

## Agent design

- **Prompt chain, evidence-first.** The orchestrator is one chain — classify intent → run tools → build the packet → optional narrative → sanitize. `server/agent/evidenceBuilder.ts` gathers facts via deterministic tools; the optional LLM (OpenAI, Anthropic, or Gemini) only rewrites prose over that packet. Citations come from data, never the model. There is no second “critic” hop.
- **Guardrails.** Release / GMP / safety questions are declined and routed to QA. A post-processor neutralizes overreaching phrasing (`server/agent/guardrails.ts`).
- **Scoped intents.** Triage, release-decision, maintenance review, shift handover, data gaps, SOP reference, audience framing.
- **Evaluated.** 21 cases check required mentions, banned phrases, and expected evidence IDs — including adversarial jailbreak and prompt-injection attempts. Run them from the **Evals** tab or `npm run eval`.
- **Injection-hardened.** The user question and evidence packet are wrapped in explicit data delimiters with an instruction-hierarchy system rule, so instructions embedded in questions or documents are treated as data.

## Demo question

> "Why was Batch B-104 delayed, and what should I check before escalating the deviation?"

The dashboard surfaces: CIP delay, pH drift, temperature excursion, operator notes, work orders, deviation DEV-104, and SOP references.

## CDF / Atlas path

| Local | On CDF |
|---|---|
| ISA-95 site/area/unit, ISA-88 Batch | [ISA-88/95 manufacturing pack](https://docs.cognite.com/cdf/deploy/cdf_toolkit/references/packages/isa_data_model) |
| Process events / alarms | [Records](https://docs.cognite.com/cdf/dm/records/concepts/records_and_streams) stream `sp_pharmaops_records:BatchEvent` |
| Deviation DEV-104 | `sp_pharmaops_model:PharmaDeviation` extension |
| `server/mcp` | [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp) |
| `npm run export:atlas` | Atlas AI agent + skill + CLI evals |
| React app | Flows custom app + `connectToHostApp()` |

See [COGNITE_MAPPING.md](./COGNITE_MAPPING.md). Toolkit YAML under `cdf/` is a **skeleton**, not a deployed project.

## Engineering documentation

Architecture, data, agent, evals, MCP, decisions, and the CDF path: **[engineering docs on the project site](https://rithwikgokhale.github.io/PharmaOpsCopilot/docs)** (canonical rendered pages) and the same markdown in [`docs/engineering/`](./docs/engineering/README.md).

## Limitations

- Synthetic data only; not validated for any GxP/regulatory use.
- Hybrid keyword + TF-IDF retrieval over a bounded SOP set (no vector DB). On CDF this is Atlas AI `askDocument`. The evidence-packet contract does not change.
- Single demo deviation (B-104) is fully modeled; other batches are simpler.
- Toolkit YAML is a module skeleton. This repo has no `cdf.toml` and cannot `cdf deploy` on its own. `CdfDataProvider` is a stub.

## License

MIT — synthetic data only, no real customer data.
