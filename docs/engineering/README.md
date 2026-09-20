# Engineering documentation

Who should read this: an engineer who has never opened the repo and needs to draw the architecture, name every language and library, trace one copilot question from keystroke to answer, and map the local system onto Cognite Data Fusion concept-for-concept. These files are the canonical write-up. The [project site](https://rithwikgokhale.github.io/PharmaOpsCopilot/docs) is meant to render them; GitHub renders the same markdown.

This is a **local-first field-engineering prototype**, not a validated GxP system and not a deployed CDF project. Numbers below come from committed artefacts: `evals/eval_cases.json` (21 cases), `server/mcp/server.test.ts` (12 tools), `data/generated/contextualization_report.json` (6 sources, 65 source rows, 5,426 datapoints, 49 matches, 3 unresolved).

## Start here

1. [Architecture](./01-architecture.md) — runtime diagram, dependency rules, request lifecycle.
2. [Data model and contextualization](./02-data-model-and-contextualization.md) — silos, joins, ISA mapping.
3. [Agent design](./03-agent-design.md) — evidence-first chain, guardrails, retrieval, LLM adapters.
4. [MCP and Atlas](./05-mcp-and-atlas.md) — local tools, agents-as-code, Toolkit skeleton.
5. [Evals and testing](./04-evals-and-testing.md) — Vitest, 21 cases, CLI `eval.yaml`.
6. [Decisions](./08-decisions.md) — ADRs with rejected alternatives.
7. [CDF migration path](./11-cdf-migration-path.md) — what a real tenant would do next.

Then the remaining files as needed: [frontend](./06-frontend.md), [tech stack](./07-tech-stack.md), [operations](./09-operations.md), [security and compliance](./10-security-and-compliance.md).

## Documents

| File | One line |
|------|----------|
| [01-architecture.md](./01-architecture.md) | Context diagram, components, copilot lifecycle, ports, CI. |
| [02-data-model-and-contextualization.md](./02-data-model-and-contextualization.md) | Domain glossary, unified JSON, messy silos, `contextualize.py`. |
| [03-agent-design.md](./03-agent-design.md) | Intents, packet, prompts, guardrails, hybrid retrieval. |
| [04-evals-and-testing.md](./04-evals-and-testing.md) | Test pyramid, scoring, Atlas multi-turn export. |
| [05-mcp-and-atlas.md](./05-mcp-and-atlas.md) | 12 MCP tools, Atlas YAML, Toolkit module. |
| [06-frontend.md](./06-frontend.md) | React app routes, charts, theming, docs site. |
| [07-tech-stack.md](./07-tech-stack.md) | Every language and library, why it is here. |
| [08-decisions.md](./08-decisions.md) | Sixteen architecture decision records. |
| [09-operations.md](./09-operations.md) | Scripts, env vars, troubleshooting, recipes. |
| [10-security-and-compliance.md](./10-security-and-compliance.md) | Keys, injection, GxP posture, provenance. |
| [11-cdf-migration-path.md](./11-cdf-migration-path.md) | Step-by-step from this repo to a CDF project. |

Entity mapping lives in [COGNITE_MAPPING.md](../../COGNITE_MAPPING.md). Field friction lives in [FIELD_NOTES.md](../../FIELD_NOTES.md). Source to keep open while reading: [guardrails.ts](../../server/agent/guardrails.ts), [orchestrator.ts](../../server/agent/orchestrator.ts), [evidenceBuilder.ts](../../server/agent/evidenceBuilder.ts), [llm.ts](../../server/agent/llm.ts), [hybridRetriever.ts](../../server/retrieval/hybridRetriever.ts), [contextualize.py](../../scripts/contextualize.py).

## Repo map

```
app/src/
  adapters/          IDataProvider, LocalDataProvider, CdfDataProvider.stub
  agent/             Browser fetch client for /api/copilot/chat
  components/        Dashboard, copilot, charts, CDF-ready panels
  context/           Data, copilot bus, toasts
  hooks/             Theme
  pages/             Dashboard, Copilot, CDF-ready, Evals, About
  types/             Domain, agent, CDF mapping, contextualization report
  utils/             Time formatting, motion, asset tree
server/
  agent/             Orchestrator, tools, evidence builder, guardrails, LLM, evals
  data/              localDataAccess (reads data/generated)
  mcp/               stdio MCP server
  retrieval/         Keyword + TF-IDF hybrid, batch scope filter
  app.ts             Express routes
  index.ts           Listener + production static serve
scripts/
  generate_synthetic_pharma_data.py
  contextualize.py
  embed_sops.py
  export-atlas-agent.ts
  copy-data-to-public.mjs
  check-data-sync.mjs
cdf/
  modules/pharmaops_deviation/   Toolkit: data_modeling, streams, agents
  agents/pharmaops-triage/       CLI agent YAML + eval/eval.yaml
evals/                   eval_cases.json, run_eval.ts, results.sample.json
data/raw/                Siloed MES / historian / CMMS / QMS / engineering
data/generated/          Unified model + report + sop_embeddings.json
data/documents/          SOP markdown
public/data/generated/   Browser copy (embeddings excluded)
site/                    GitHub Pages landing site
```
