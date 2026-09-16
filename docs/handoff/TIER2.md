# Tier 2 — close explicit posting gaps

Implement **only after Tier 1's T1-G checklist is green**, and only when the user asks. User choice: **Hybrid** — TypeScript agent stays; Python owns embeddings.

Three independent workstreams. Do them in this order (1 → 3). Each is shippable alone.

Job language this tier answers:

- "strong foundation in **Python** … **embeddings, RAG**, prompt chaining"
- LLMs = **Gemini / Claude / GPT**
- "prove the **ROI** of Industrial AI", C-level narratives, reference architectures

---

## T2-1 — Multi-provider LLM

### Goal

`generateNarrative` works with OpenAI, Anthropic, or Google Gemini, selected by env. Deterministic mode (no keys) is unchanged. Evals still `forceDeterministic`. Release/safety intents still skip the LLM.

### Source of truth today

- `server/agent/llm.ts` — OpenAI-only; `isLlmEnabled()` = `Boolean(OPENAI_API_KEY)`; `getModelName()` = `OPENAI_MODEL ?? "gpt-4.1-mini"`; JSON object response parsed with `llmNarrativeSchema`.
- `server/agent/orchestrator.ts` sets `generatedBy: "openai"` on success. Change this to the provider id (`openai` | `anthropic` | `gemini`) so the UI/API health payload stays honest.
- Tests: `server/agent/llm.test.ts`, `server/agent/orchestrator.llm.test.ts` mock `generateNarrative`. Keep those tests; they should not break if the export surface (`generateNarrative`, `isLlmEnabled`, `getModelName`) stays.

### Design (keep it small)

Do **not** add LangChain. Do **not** add a plugin system.

```
LLM_PROVIDER=openai|anthropic|gemini   # default openai if any compatible key is set
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-5      # pick a current documented id; do not invent
GEMINI_API_KEY=...                     # or GOOGLE_API_KEY — pick one name and stick to it
GEMINI_MODEL=gemini-2.5-flash          # same: use the vendor's current id
```

`isLlmEnabled()`: true if the **selected** provider has a key. If `LLM_PROVIDER` is unset, pick the first key present in order openai → anthropic → gemini so existing `.env` with only `OPENAI_API_KEY` keeps working.

Each provider adapter:

1. Sends `systemPrompt` + `userPrompt`.
2. Asks for JSON (OpenAI `response_format: json_object`; Anthropic: instruct JSON in system prompt + parse; Gemini: JSON mime if available).
3. Parses with the **same** `llmNarrativeSchema` (lenient `.catch`).
4. 20s timeout, 1 retry max, return `null` on any failure (orchestrator falls back).

Shared helper: `parseNarrative(text: string): LlmNarrative | null`.

Packages: add official SDKs only (`@anthropic-ai/sdk`, `@google/generative-ai` or the current `@google/genai` — **look up the current package** before installing; do not add both). If you want zero new deps, Anthropic and Gemini can be called via `fetch` against their REST APIs. Prefer official SDKs if they are small. Do not add `ai` (Vercel) or `langchain`.

### Files to touch

| File | Change |
|---|---|
| `server/agent/llm.ts` | Split into provider functions; keep public API |
| `server/agent/llm.test.ts` | Enable/disable per provider; mock fetch/SDK; schema fallback still covered |
| `server/agent/orchestrator.ts` | `generatedBy` uses provider id |
| `server/app.ts` / `server/index.ts` / `server/mcp/index.ts` | Health/log line shows provider + model |
| `.env.example` | Document all three; comment that evals ignore keys |
| `README.md` + `site/src/sections/GettingStarted.tsx` | Optional LLM is any of the three |
| `package.json` | New deps if any |

### Prompt chaining (posting keyword — keep honest)

The orchestrator is already a chain: classify → tools → packet → (optional) narrative → sanitize. In README/site AgentDesign, name it as **prompt chaining** without adding extra LLM hops. Do **not** add a second model call (e.g. "critic") in this tier — it costs money, complicates evals, and is not required.

### Acceptance

- No keys → evals 18/18, identical to today.
- Only `OPENAI_API_KEY` set, no `LLM_PROVIDER` → still OpenAI (backward compatible).
- `LLM_PROVIDER=anthropic` without `ANTHROPIC_API_KEY` → behaves as disabled (deterministic), do not throw at import time.
- `orchestrator.llm.test.ts` still passes.
- Never send the API key to the browser.

### What not to do

- Do not call a provider for `release_decision`.
- Do not stream in this tier.
- Do not add a UI provider picker.

---

## T2-2 — Python embedding retrieval (hybrid RAG)

### Goal

Replace keyword-only retrieval with **hybrid** (keyword + embeddings) that still runs **offline** after an index is built. Hits the posting's Python + embeddings + RAG line. The evidence packet contract does not change: retrieval still returns `{ section, score }[]` with cite IDs.

### Current contract (must keep)

`server/retrieval/simpleRetriever.ts`:

```ts
retrieveDocuments(query, { batchId?, equipmentIds?, topK? }): RetrievalHit[]
```

`RetrievalHit = { section: DocSectionRecord, score: number }`.

`evidenceBuilder.ts` calls this. EVAL-07 depends on SOP section citations. Keyword overlap is enough for the bounded SOP set; embeddings must **not** drop those hits.

### Design

Python builds an index; TypeScript reads it. No Python in the request path (the Express server stays TS).

```
scripts/embed_sops.py
  reads data/documents/*.md  (same sectioning as documentStore.ts — see below)
  writes data/generated/sop_embeddings.json
  copy-data-to-public is NOT needed unless the browser reads it (it should not)

server/retrieval/hybridRetriever.ts
  loads sop_embeddings.json if present
  score = α * cosine(query_embed, section_embed) + β * keyword_score
  same related-batch / related-equipment boosts as today
  if index missing OR no embedding key: fall back to simpleRetriever (today's behavior)
```

**Sectioning must match `server/retrieval/documentStore.ts`.** Read that file first. If Python re-splits markdown differently, cite IDs diverge and EVAL-07 fails. Either:

- Import the same heading rules, or
- Have `embed_sops.py` read the already-built `data/generated/documents.json` (preferred — one splitter: `contextualize.py` already builds `documents.json` with sections).

Preferred input: **`data/generated/documents.json`**, not raw markdown.

### Embeddings provider

Offline-safe options, in preference order:

1. **Default / CI:** no API. Use a tiny local method that still demonstrates the *shape*:
   - Hashing trick / bag-of-words TF-IDF vector written as `embedding: number[]` per section, **or**
   - Optional `sentence-transformers` only if you add it to a `requirements-retrieval.txt` that CI does **not** install by default.
2. **Optional online:** `OPENAI_EMBEDDING_MODEL=text-embedding-3-small` (already commented in `.env.example`). If `OPENAI_API_KEY` is set **and** the user passed `--provider openai`, call embeddings API.

The index JSON:

```json
{
  "provider": "tfidf" | "openai" | "sentence-transformers",
  "model": "tfidf-unigram" | "text-embedding-3-small" | "...",
  "dim": 256,
  "sections": [
    { "id": "SOP-DEV-005", "vector": [0.01, ...] }
  ]
}
```

Keep `dim` modest (256 hashing / 1536 OpenAI). Commit the **tfidf** index so CI/demo work without keys. If vectors are huge, git-lfs is overkill — TF-IDF sparse stored as `{ index: number, value: number }[]` is fine.

Query-side embeddings in TypeScript:

- For `tfidf`: re-tokenize the query with the **same** vocab stored in the JSON (`vocab: string[]` + idf weights). Implement that in TS (~40 lines). Do not call Python at request time.
- For OpenAI: only if key present; otherwise keyword fallback.

`retrieveDocuments` in `simpleRetriever.ts` should become a façade:

```ts
export function retrieveDocuments(...) {
  return hybridRetrieve(...) ?? keywordRetrieve(...);
}
```

Keep `keywordRetrieve` as a named export so tests cover both.

### Files

| Path | Action |
|---|---|
| `scripts/embed_sops.py` | Create |
| `data/generated/sop_embeddings.json` | Generated; commit the tfidf flavor |
| `server/retrieval/hybridRetriever.ts` | Create |
| `server/retrieval/simpleRetriever.ts` | Façade + keep keyword function |
| `server/retrieval/simpleRetriever.test.ts` | EVAL-like queries still return SOP-DEV-* / SOP-BIO-* |
| `server/retrieval/hybridRetriever.test.ts` | Index missing → keyword; index present → SOP-DEV-005 still in topK for "escalation criteria" |
| `package.json` | `"embed-sops": "python3 scripts/embed_sops.py"`; optionally chain after contextualize in `generate-data` **only if** embedding is tfidf (no network). If you chain it, CI time stays reasonable. |
| `.env.example` | Uncomment embedding model; document `--provider` |
| README + COGNITE_MAPPING / site CdfReadiness retrieval card | "Keyword + optional embeddings; packet contract unchanged. On CDF this is `askDocument`." |

### Acceptance

- `npm run eval` 18/18 with no keys and with the committed tfidf index.
- EVAL-07 still cites SOP sections.
- Deleting `sop_embeddings.json` → copilot still works (keyword fallback).
- No embeddings computed in the browser.
- Python stdlib for tfidf (numpy not required). If you use `sentence-transformers`, isolate it behind `--provider st` and do not add it to default `generate-data`.

### What not to do

- Do not stand up a vector DB (Chroma, Pinecone, SQLite-vec) for five SOP files. A JSON index is the honest demo.
- Do not change `ask_documents` MCP tool's external shape.
- Do not claim "we use Atlas AI askDocument locally".

---

## T2-3 — ROI section + reference architecture (docs site)

### Goal

A hiring manager (and a plant director) can see **why this class of agent pays for itself**, with an honest synthetic caveat, plus one diagram that is the "reference architecture" FDE slide.

### New site section

Add `site/src/sections/Value.tsx` and register it in `site/src/App.tsx` **after Problem, before Gallery** (value context before screenshots) or after HowItWorks. Add `{ href: "#value", label: "Value" }` to `site/src/components/Nav.tsx` `LINKS`.

### Content rules

- **Illustrative, synthetic.** Banner in `amber` matching the GxP tone: numbers are not from a customer; they are a worked example a field engineer would put on a discovery slide.
- Do not invent Cognite pricing.
- Do not claim PharmaOps is in production.

### Numbers to use (keep internally consistent; label every figure "illustrative")

Build a small calculator in static copy, not a spreadsheet app:

Assumptions (show them):

- One delayed batch on a pilot plant: **$80k–$250k** cost of delay / investigation labor / slot loss (range, not a fake point estimate).
- Supervisor + QA time to assemble the B-104 packet by hand: **2–4 hours** (events, historian, CMMS, SOPs).
- Copilot triage + human review: **15–25 minutes**.
- Deviations per quarter on a similar site: **8–15** (illustrative).

Derived (show the arithmetic):

- Hours returned per quarter ≈ `(3 h − 0.3 h) × 12` ≈ **32 hours**.
- If one delayed batch is avoided or shortened because CIP/pH/temp evidence surfaced the same day, the range above is the "upside"; the hours saved are the "floor".

Three cards:

1. **Triage time** — 2–4 h → ~20 min, evidence IDs attached.
2. **Deviation cycle time** — faster escalation package for QA (SOP-DEV-004/005 cited); still a human disposition.
3. **Why data quality is the multiplier** — unresolved WFI tag / duplicate WO / °F vs °C. Bad joins → bad agents. Point at the CDF-ready contextualization panel.

### Reference architecture

Reuse `FlowDiagram` (site) with a **single** end-to-end picture, not the two-column today/future (that already lives in CdfReadiness):

```
MES · Historian · CMMS · QMS · Eng. register
        → extractors / contextualization (entity matching, units, time)
        → ISA-88/95 model + Records + PharmaDeviation
        → Industrial MCP  ──┐
        → Atlas AI agent   ─┼─→ supervisor / QA (human review)
        → Flows custom app ─┘
```

Caption: "Target reference architecture. This repo runs the local equivalent (data/raw → contextualize.py → MCP + React)."

Optional mermaid in `COGNITE_MAPPING.md` duplicating this — only if it matches the site. Prefer one source.

### README

Two sentences under "What this is" or a "Value" blurb linking the site `#value`. No fake dollar totals in the README badge.

### Acceptance

- `#value` in the nav; section readable in light and dark.
- Every number tagged illustrative/synthetic.
- No "10x" / "transform" / "revolutionize".
- Browser-verify the new section and that existing anchors (`#cdf`, `#evals`) still work.

---

## Tier 2 verification

```bash
npm run lint && npm run typecheck && npm test && npm run eval && npm run build
cd site && npm run build
```

Browser: copilot still declines release; CDF-ready unchanged; new Value section; GettingStarted mentions providers.

Commit only if asked. Suggested message: `Add multi-provider LLM, hybrid SOP retrieval, and an illustrative ROI section.`

---

## Out of scope for Tier 2

- Live CDF ingest (`cognite-sdk` transformations).
- Real Atlas eval run.
- Multi-turn evals (Tier 3).
- Field-friction writeup (Tier 3).
- Implementing CdfDataProvider.
