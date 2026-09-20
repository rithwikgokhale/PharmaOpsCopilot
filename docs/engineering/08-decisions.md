# Decisions

Who should read this: someone who needs the rejected alternatives, not only the current shape. Status is **accepted** unless noted.

Format: Context / Decision / Alternatives / Consequences / Status.

## 1. Local-first synthetic data, no CDF tenant

**Context.** A runnable prototype must work on a laptop and in CI without Cognite credentials.

**Decision.** Generate a Chicago pilot-plant story (B-104 / DEV-104) under `data/raw/` and `data/generated/`. Document the CDF mapping; do not call CDF.

**Alternatives.** Live Open Industrial Data tenant; recorded HTTP fixtures against CDF; empty UI with screenshots only.

**Consequences.** Evals and MCP are reproducible. Mapping can drift from product if docs are not re-checked. `CdfDataProvider` stays a stub.

**Status.** Accepted.

## 2. `IDataProvider` seam with `CdfDataProvider` as a stub

**Context.** The React app must not import Express or Cognite SDK calls.

**Decision.** `IDataProvider` in `app/src/adapters/IDataProvider.ts`. `LocalDataProvider` implements it. `CdfDataProvider.stub.ts` throws, with comments pointing at ISA views, Records, Time Series API, and `connectToHostApp()` ([Flows Auth API](https://docs.cognite.com/cdf/flows/reference/api/auth)).

**Alternatives.** Fetch CDF from components; a feature flag that half-implements the SDK.

**Consequences.** Swapping providers is one constructor. Every stub method throws `NOT_IMPLEMENTED`; comments document the intended SDK calls.

**Status.** Accepted.

## 3. Deterministic-first agent; LLM optional

**Context.** GxP-adjacent copy cannot depend on a vendor being up, and evals must be stable.

**Decision.** Tools → packet → typed builders always. LLM rewrites prose only when a key exists and intent is not `release_decision`. Evals pass `forceDeterministic: true`.

**Alternatives.** LLM-first RAG; LLM required in CI; critic model.

**Consequences.** Demo works offline. Narrative quality without a key is "good ops summary," not generative prose. Release questions never hit the model.

**Status.** Accepted.

## 4. JSON files instead of a database

**Context.** One plant, 5,426 datapoints (`contextualization_report.json`).

**Decision.** Static JSON on disk; Express and the browser both read it (browser via `public/data/generated`).

**Alternatives.** SQLite, DuckDB, Postgres.

**Consequences.** Zero ops. Will not hold a campaign of 1,000 batches. Time-series queries are array scans.

**Status.** Accepted for the prototype.

## 5. Hybrid Python (data) / TypeScript (agent, MCP)

**Context.** Field work needs both industrial data wrangling and a typed agent/UI.

**Decision.** Python stdlib for generate/contextualize/embed. TypeScript for orchestrator, MCP, evals, React. Shared types in `app/src/types`.

**Alternatives.** All Python (FastAPI + Streamlit); all TypeScript; LangChain Python agent.

**Consequences.** Two runtimes (`python3` + Node 20). Tokenization must stay in lockstep (`embed_sops.py` / `tokenize.ts`). Matches a typical CDF split (transformations vs Atlas/Flows).

**Status.** Accepted.

## 6. Keyword first, then TF-IDF hybrid; no vector DB

**Context.** Bounded SOP set; packet contract must not change; CI cannot depend on an embedding API.

**Decision.** Keyword retrieval first. Committed TF-IDF index `data/generated/sop_embeddings.json`. Hybrid `2 · cosine + 1 · keyword`. OpenAI embeddings optional offline rebuild only. Live `loadSopIndex` requires `provider === "tfidf"`.

**Alternatives.** pgvector, OpenAI embeddings on every request, Atlas `askDocument` only (no local path).

**Consequences.** Retrieval is explainable and offline. Quality will not match a managed document index. On CDF this becomes [`askDocument`](https://docs.cognite.com/cdf/atlas_ai/references/atlas_ai_agent_tools).

**Status.** Accepted.

## 7. Records for events; ISA-88 Batch; `PharmaDeviation` extension

**Context.** Alarms and operator actions are high volume. A batch campaign is not the same kind of object as a QA deviation.

**Decision.** Process events → Records stream `BatchEvent` (`usedFor: record`) per [Records and streams](https://docs.cognite.com/cdf/dm/records/concepts/records_and_streams). Batch → ISA-88 Batch in the [ISA Data Model pack](https://docs.cognite.com/cdf/deploy/cdf_toolkit/references/packages/isa_data_model). Deviation → small `PharmaDeviation` view (not `CogniteActivity`).

**Alternatives.** Everything as `CogniteActivity`; a custom manufacturing model that duplicates ISA; CogniteEvent (legacy).

**Consequences.** Graph stays navigable. Toolkit module cannot pin ISA pack versions on relations (skeleton). Reviewers must know Records vs activities.

**Status.** Accepted.

## 8. Generated Atlas YAML from guardrails + eval cases

**Context.** Two sources of truth would drift (local evals vs Atlas evals).

**Decision.** `export-atlas-agent.ts` writes agent, skill, and `eval.yaml` from `guardrails.ts` and `eval_cases.json`, with faithfulness `groundTruth` from `buildEvidencePacket`. Generated header; CI `git diff` on `cdf/`.

**Alternatives.** Hand-maintained YAML; only local evals.

**Consequences.** YAML is ugly to read in PRs. `lineWidth: -1` keeps diffs reviewable. Live Atlas eval still needs a project.

**Status.** Accepted.

## 9. Local MCP mirroring Industrial MCP families

**Context.** September 2026 Industrial MCP (Public Preview) exposes query / time-series / document tools to desktop agents ([Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp)).

**Decision.** Twelve local tools in those families plus composed `triage_batch` / `build_evidence_packet`. Same vocabulary so swapping to Industrial MCP is configuration, not a redesign.

**Alternatives.** Custom tool names; Python MCP; no MCP (HTTP only).

**Consequences.** Desktop demo is real. Must not claim the local server *is* Industrial MCP.

**Status.** Accepted.

## 10. Messy raw silos + contextualizer

**Context.** Customer data does not arrive as ISA instances.

**Decision.** `generate_synthetic_pharma_data.py` writes dirty silos (aliases, °F, epoch vs `DD-MON-YYYY`, duplicates, orphans). `contextualize.py` joins and writes a report.

**Alternatives.** Generate clean JSON only; skip the report.

**Consequences.** The CDF-ready page has something true to show. Pipeline bugs show up as eval failures (signal-on-unit vs instrument).

**Status.** Accepted.

## 11. Deliberately unresolved orphans

**Context.** Fuzzy matching can always attach a WFI pump to BIO-101.

**Decision.** `CHI.WFI.FT301.PV`, `CHI-UTIL-WFI-PMP301` / `10009999`, and `WO-760` stay in `unresolved[]`. Fuzzy cutoff 0.8 is not a license to invent links. Report: 3 unresolved of 65 source rows.

**Alternatives.** Force 100% match rate; drop orphans from raw.

**Consequences.** Honest field conversation. Entity matching on CDF is the leftover work ([entity matching pack](https://docs.cognite.com/cdf/deploy/cdf_toolkit/references/packages/entity_matching)).

**Status.** Accepted.

## 12. Two data copies with a sync check

**Context.** Vite serves `public/`; the server reads `data/generated/`. Embeddings must not ship to the browser.

**Decision.** `copy-data-to-public.mjs` copies JSON except `sop_embeddings.json`. `check-data-sync.mjs` and CI `git diff` enforce it.

**Alternatives.** Server-only API for all JSON; symlink; import JSON from `data/` in Vite.

**Consequences.** Easy to forget a new file. CI catches it.

**Status.** Accepted.

## 13. Separate Vite app for the docs site; GitHub Pages

**Context.** Product UI on `:5173` vs public write-up at `/PharmaOpsCopilot/`.

**Decision.** `site/` with `base: "/PharmaOpsCopilot/"`. Pages workflow on `site/**` + report JSON.

**Alternatives.** One app with a `/docs` route from day one; GitHub markdown only; Docusaurus.

**Consequences.** Two `package-lock` files, two Tailwind configs. Engineering markdown in `docs/engineering/` is canonical; the site renders it at `/docs` via `import.meta.glob`.

**Status.** Accepted.

## 14. Guardrails as code + short-circuit for release/safety

**Context.** Prompting "please don't approve batches" is not enough under jailbreak and role-play.

**Decision.** Regex intent + banned-phrase sanitizer in TypeScript. `release_decision` never calls `generateNarrative`. Disclaimer on every response.

**Alternatives.** Policy model; output classifier LLM; trust the system prompt.

**Consequences.** False positives possible (mitigated for "not a confirmed root cause"). New overreach phrases need a regex + eval.

**Status.** Accepted.

## 15. Multi-provider via thin adapters, no LangChain

**Context.** Atlas and customers use OpenAI, Anthropic, and Gemini. The packet contract is stable.

**Decision.** `openai` SDK + `fetch` for Anthropic/Gemini. Shared `parseNarrative`. Env selection order openai → anthropic → gemini.

**Alternatives.** LangChain, LiteLLM, Vercel AI SDK.

**Consequences.** Three JSON strategies to maintain. No extra framework in `package.json`. Easy to delete when Atlas hosts the model.

**Status.** Accepted.

## 16. Evals as a CI gate without LLM keys

**Context.** Agent changes must not silently start claiming "safe to release."

**Decision.** 21 deterministic cases in CI (`npm run eval` exit 1 on failure). Atlas export is extra, tagged `ci` / `multi-turn`.

**Alternatives.** Manual demo only; LLM-as-judge in CI; snapshot tests of full answers.

**Consequences.** Substring scoring is brittle (mustMention lists). No measure of narrative quality with a live model in CI.

**Status.** Accepted.
