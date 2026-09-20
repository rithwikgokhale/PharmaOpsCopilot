# Operations

Who should read this: someone cloning the repo who needs to run, regenerate, or extend it.

Requires **Node 20+** (`.nvmrc`) and **python3** on `PATH`. No Python packages.

## Install, run, build

```bash
npm install
npm run generate-data
npm run dev
```

Open http://localhost:5173 (Vite). API is http://localhost:3001 (proxied as `/api`). Production-style: `npm run build && npm start` (Express serves `app/dist` on `PORT`, default 3001).

Docs site: `cd site && npm install && npm run dev` (typically :5174 or :5175). Production URL path is `/PharmaOpsCopilot/`.

## npm scripts

| Script | What it does |
|--------|----------------|
| `dev` | `concurrently` Vite (`dev:web`) + `tsx watch server/index.ts` (`dev:server`) |
| `dev:web` / `dev:server` | Each half of `dev` |
| `build` | `vite build` → `app/dist` |
| `start` | `tsx server/index.ts` (API + static if dist exists) |
| `preview` | `vite preview` of the app build |
| `mcp` | stdio MCP server |
| `export:atlas` | Write `cdf/` generated YAML |
| `generate-data` | generator → contextualize → copy-to-public → embed_sops (TF-IDF) |
| `contextualize` | `contextualize.py` + copy-to-public |
| `embed-sops` | Rebuild `sop_embeddings.json` |
| `check-data-sync` | `data/generated` vs `public/data/generated` (embeddings excluded) |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `format` / `format:check` | Prettier |
| `test` / `test:watch` | Vitest |
| `eval` | 21 cases → `evals/results.json` |

## Environment variables

Copy `.env.example` to `.env` (gitignored). All LLM keys are optional.

| Variable | Default | Effect |
|----------|---------|--------|
| `PORT` | `3001` | Express |
| `LLM_PROVIDER` | unset | Force `openai` / `anthropic` / `gemini` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | unset / `gpt-4.1-mini` | OpenAI narrative |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | unset / `claude-sonnet-4-5` | Anthropic narrative |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | unset / `gemini-2.5-flash` | Gemini narrative |
| `OPENAI_EMBEDDING_MODEL` | unused live | Only with `python3 scripts/embed_sops.py --provider openai` |

See [01-architecture.md](./01-architecture.md) for the same table in runtime context.

## Troubleshooting

**Port 3001 in use.** A previous `npm run dev` is still running. `lsof -i :3001` and stop it, or set `PORT`. Vite 5173 conflicts are the same pattern.

**python3 missing.** `generate-data` fails at the first script. Install Python 3; do not substitute `python` unless it *is* 3.x.

**Data out of sync.** `npm run check-data-sync` or CI `git diff` on `data/` / `public/data`. Fix: `npm run generate-data` and commit if the change is intentional. Do not hand-edit generated JSON.

**Atlas export drift.** CI `git diff --exit-code -- cdf/`. Re-run `npm run export:atlas` after changing `guardrails.ts` or `eval_cases.json`.

**Pages did not rebuild.** `deploy-pages.yml` path filters are `site/**`, `docs/engineering/**`, `data/generated/contextualization_report.json`, `evals/eval_cases.json`, and the workflow file. Use `workflow_dispatch` if a change outside those paths should still ship.

**`chrome-error://chromewebdata/` on localhost.** Some sandboxed browsers cannot reach the host loopback. Use a normal browser, or `curl http://localhost:5173` / `curl http://127.0.0.1:3001/api/health`. Vite may bind IPv6 `localhost` only — try the hostname `localhost` not `127.0.0.1` if one fails.

**MCP client hangs / JSON parse errors.** Logs went to stdout. This server logs to stderr only. Kill leftover `npm run mcp` processes.

**503 on `/api/copilot/chat`.** `data/generated` missing — run `generate-data` from the **repo root**.

**Evals fail after a pipeline change.** Do not loosen `mustNotSay`. Inspect `evals/results.json` missing mentions/ids; fix contextualize or orchestrator.

## Recipes

### Add a batch

1. Extend `scripts/generate_synthetic_pharma_data.py` (keep `random.seed(42)` unless you intend a full regen).
2. `npm run generate-data` and inspect `contextualization_report.json`.
3. If the batch should be a *thin* control (like B-103), do not add CIP/pH/temp events — `isB104Story` must stay false.
4. Add evals if the story is load-bearing. `npm run eval` && `npm run export:atlas`.

### Add a SOP

1. Add markdown under `data/documents/` and a row in the QMS document register in the generator (or the path `contextualize.py` already reads).
2. `npm run generate-data` (rebuilds `documents.json` + TF-IDF index).
3. Cite `SOP-…` section ids in evals if required.

### Add an intent

1. Extend `CopilotIntent` in `app/src/types/agent.ts`.
2. Add a branch in `classifyIntent` (`guardrails.ts`) and a builder in `orchestrator.ts`.
3. Tests in `guardrails.test.ts` and `orchestrator.test.ts`.
4. Eval cases + `export:atlas`.
5. Optional demo chip in `DEMO_PROMPTS`.

### Add an MCP tool

1. `server.registerTool` in `server/mcp/server.ts` with zod `inputSchema`.
2. Implement with existing `server/agent/tools.ts` functions if possible.
3. Update the expected name list in `server/mcp/server.test.ts`.
4. Document the Industrial MCP family in [05-mcp-and-atlas.md](./05-mcp-and-atlas.md). Prefer composing Atlas `query` / `queryTimeSeriesDatapoints` / `askDocument` on CDF rather than growing custom types.

### Add an eval case

See [04-evals-and-testing.md](./04-evals-and-testing.md). Short form: append `evals/eval_cases.json` → `npm run eval` → `npm run export:atlas` → update public "21" counts.

## Health checks

```bash
curl -s http://localhost:3001/api/health
# { "status": "ok", "dataReady": true, "llm": { "enabled": false } }  or provider/model
```
