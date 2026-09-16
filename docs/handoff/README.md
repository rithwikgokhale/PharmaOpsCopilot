# Handoff: finish PharmaOps Copilot for the Cognite FDE sample

**Read this file first.** Then `STATE.md`, then `QUALITY_BAR.md`, then the tier file you are implementing. Do not skip `QUALITY_BAR.md`. The previous session stopped mid-Tier-1 so a cheaper model could continue at the same bar.

This is **not** a greenfield project. Most of Tier 1 is already written and uncommitted. Your job is to finish the remaining Tier 1 items, then (only if asked) Tier 2 / Tier 3.

---

## Why this work exists

The user is applying for Cognite **Senior Field Engineer / FDE** ([job 4959734101](https://job-boards.eu.greenhouse.io/cognite/jobs/4959734101)). The project is a **portfolio sample**, not an interview walkthrough. Public copy (README, docs site, About page) must **never** mention interviews, applications, or the job.

The posting's four pillars, and how this repo is supposed to answer them:

| Pillar | Job language | What this repo must show |
|---|---|---|
| **Agentic AI** | Trusted industrial agents via Atlas AI; Gemini / Claude / GPT | Evidence-first agent, guardrails, 18 evals, agents-as-code YAML, (Tier 2) multi-provider LLM |
| **Industrial architecture** | Unify siloed IT/OT/ET into one source of truth | Messy `data/raw/` + `contextualize.py` + ISA-88/95 mapping + Records |
| **Full-stack prototyping** | GenAI + CDF models + legacy systems; **Python**, embeddings, RAG, prompt chaining | Local MCP, Toolkit YAML, hybrid Python (contextualization now; embeddings in Tier 2) |
| **Evangelism / ROI** | Prove Industrial AI ROI; C-level narratives | Docs site; (Tier 2) ROI section; (Tier 3) field-friction → product feedback |

September 2026 Cognite release items this work maps to:

1. **Industrial MCP** (Public Preview) — third-party agents get the same `query` / `queryTimeSeriesDatapoints` / `askDocument` tools Atlas AI uses. Docs: [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp).
2. **Agents as code** — `<name>.Agent.yaml` + skill sidecar + `eval/eval.yaml` via Cognite CLI / Toolkit.
3. **Records** — high-volume immutable events/alarms/logs linked to equipment, not stuffed into `CogniteActivity`.
4. **ISA-88/95 Manufacturing data model pack** — `dp:models:isa_manufacturing_extension`. Pharma batch deviation is an ISA-88 use case.

User decisions already made (do not reopen):

- **Scope:** finish **Tier 1** first. Write detailed specs for Tiers 2 and 3 (this folder). Implement 2/3 only when asked.
- **Python vs TS:** **Hybrid.** Keep the TypeScript agent and MCP server. Python owns data generation, contextualization, and (Tier 2) embeddings. Do **not** port the MCP server to Python.

---

## Ordered work for the next agent

1. Read `STATE.md` so you know what is already on disk vs. still missing.
2. Read `QUALITY_BAR.md` so your diffs look like this repo, not a rewrite.
3. Implement **`TIER1.md` remaining tasks in the listed order.** Do not start Tier 2 until Tier 1's acceptance checklist is green, unless the user explicitly redirects you.
4. If asked for Tier 2 → `TIER2.md`. If asked for Tier 3 → `TIER3.md`.
5. **Do not commit or push** unless the user explicitly asks. The original Tier 1 plan included a commit/push as the *last* step; that is still gated on the user.

---

## Files in this folder

| File | Purpose |
|---|---|
| [STATE.md](./STATE.md) | Exact repo state when work stopped: done, in-progress, missing, known bugs |
| [QUALITY_BAR.md](./QUALITY_BAR.md) | Conventions, voice, verification, things that will make the result look cheap if skipped |
| [TIER1.md](./TIER1.md) | Remaining Tier 1 work, file-by-file, with YAML templates and acceptance tests |
| [TIER2.md](./TIER2.md) | Multi-provider LLM, Python embeddings/RAG, ROI + reference architecture |
| [TIER3.md](./TIER3.md) | Multi-turn evals, field-friction → product feedback |

---

## Cognite docs (use these; do not invent APIs)

This workspace has a **Cognite Docs MCP** (`user-Cognite Docs`). Prefer it over memory.

| Topic | URL |
|---|---|
| ISA-88/95 pack | https://docs.cognite.com/cdf/deploy/cdf_toolkit/references/packages/isa_data_model |
| Toolkit resource YAML | https://docs.cognite.com/cdf/deploy/cdf_toolkit/references/resource_library |
| Records + streams | https://docs.cognite.com/cdf/dm/records/concepts/records_and_streams |
| Industrial MCP | https://docs.cognite.com/cdf/build/industrial_mcp |
| Atlas agent YAML | https://docs.cognite.com/dev/sdks/cognite-cli/agent-yaml |
| Atlas agent evals | https://docs.cognite.com/dev/sdks/cognite-cli/agents-eval |
| Atlas agent tools | https://docs.cognite.com/cdf/atlas_ai/references/atlas_ai_agent_tools |
| Core data model | https://docs.cognite.com/cdf/dm/dm_reference/dm_core_data_model |
| September 2026 release | https://www.cognite.com/en/resources/blog/cognite-september-2026-release |

---

## Hard constraints (repeat of QUALITY_BAR, because they get missed)

- Never mention the job, interview, or application in README / site / About / PROJECT_BRIEF.
- Keep the GxP disclaimer: not a validated system; no release/safety decisions.
- Do not hand-edit files under `cdf/modules/.../agents/` or `cdf/agents/` — they are generated by `npm run export:atlas`.
- Do not change `evals/eval_cases.json` in Tier 1.
- Do not change `random.seed(42)` or the B-104 storyline.
- After any data-pipeline change: `npm run generate-data && npm run eval && npm test` must still pass 18/18.
- Two data copies must stay identical: `data/generated/` (API) and `public/data/generated/` (browser). `npm run check-data-sync`.
- UI changes require browser verification (app at `:5173`, site at `site` Vite), not a single screenshot.
- Do not add Python packages unless Tier 2 embeddings require them; stdlib is enough for contextualization.
