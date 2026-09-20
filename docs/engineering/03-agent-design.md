# Agent design

Who should read this: anyone who needs to explain why the copilot can run without an API key, how citations are prevented from being invented, and where a real Atlas AI agent would take over.

## Design principle

The agent is **evidence-first and deterministic-first**. Tools assemble a structured packet from local JSON. A typed response is built from that packet. An optional LLM may rewrite *prose fields only*. Facts and citation IDs come from data, never from the model.

Mechanically, "citations come from data" means:

1. `buildEvidencePacket` (`server/agent/evidenceBuilder.ts`) collects `evidence[]` with ids that already exist in `data/generated/` (events, anomalies, work orders, notes, deviation, signals, SOP sections).
2. If `generateNarrative` (`server/agent/llm.ts`) returns contributing-factor ids, they are filtered with `validIds` from `packet.evidence` in `runCopilot` (`server/agent/orchestrator.ts`).
3. `groundToPacket` drops bullets that mention ids not in the packet (lookbehind so `SOP-DEV-005` is not treated as `DEV-005`).
4. `applyGuardrails` / `sanitizeText` (`server/agent/guardrails.ts`) neutralize banned phrasing after either path.

There is no second "critic" hop. Guardrails are code, not a model.

## Intent taxonomy

`classifyIntent` in `server/agent/guardrails.ts` returns `CopilotIntent` from `app/src/types/agent.ts`. Order matters: release/safety is checked first.

| Intent | Trigger (simplified) | LLM? |
|--------|----------------------|------|
| `release_decision` | release, disposition, approve, "batch is safe", GMP, jailbreak-style "approve the release" | Never. Short-circuited so the model cannot improvise a disposition. |
| `shift_handover` | handover, hand-over, shift summary | Optional narrative |
| `data_gaps` | missing, gaps, incomplete, "what data" | Optional |
| `maintenance_review` | maintenance, inspect, "which equipment" | Optional |
| `sop_reference` | SOP, procedure, section | Optional |
| `audience_framing` | manager vs QA, audience | Optional |
| `deviation_triage` | why, delayed, what happened, before, excursion, deviation | Optional |
| `general` | anything else | Optional |

`isReleaseSafetyDecision` uses `RELEASE_SAFETY_PATTERNS`. Safety questions share this intent because the product must not assert "the batch is safe."

## Evidence packet

`EvidencePacket` in `evidenceBuilder.ts`:

| Field | Source function | Role |
|-------|-----------------|------|
| `batch` | `getBatchSummary` | Identity, status, phase, planned/actual start |
| `deviation` | `getDeviation` | Optional `DEV-…` |
| `events` | `getEvents` | Time-ordered MES/historian/QMS events |
| `anomalies` | `detectAnomalies` | Analytics windows |
| `timeSeriesStats` | `getTimeSeriesStats` | min/max/mean/OOS per signal |
| `workOrders` | `getRelatedWorkOrders` | Primary unit + deviation equipment + CIP via `supports_cleaning` |
| `operatorNotes` | `getOperatorNotes` | E-log rows |
| `relatedEquipment` | `getRelatedEquipment` | Same-asset + deviation equipment |
| `docHits` | `retrieveRelevantDocs` | Top 5 SOP/BMR/shift sections |
| `dataQuality` | `assessDataQuality` | Calibration, completeness, QA pending |
| `evidence` | `collectEvidence` | Flat citation list for the UI and `validIds` |

Assembly order is the function-call order above. If `getBatchSummary` returns null, the packet is null and `notFoundResponse` is used.

`serializePacketForPrompt` is a compact text dump (ids in `[EVT-…]` brackets). There is no hard token cap; the synthetic plant is small enough that the full packet fits. Production would bound events/datapoints by time window.

Prompt-injection delimiters live in `buildUserPrompt` (`server/agent/promptTemplates.ts`): the user question is wrapped in `user_question` tags and the packet in `evidence_packet` tags. The system prompt's instruction hierarchy says those tagged regions are data, not instructions.

## Prompt design

`buildSystemPrompt` concatenates `AGENT_IDENTITY`, `UNIVERSAL_RULES`, "reason only over the packet", instruction hierarchy, and the JSON shape (`answer`, `whatHappened`, `contributingFactors` with confidence low/medium/high, `whatToCheckNext`).

`llmNarrativeSchema` (`zod` in `llm.ts`) is lenient: wrong-typed fields `.catch` to empty defaults. `parseNarrative` slices the first `{`… last `}` so markdown fences do not kill parsing. Malformed output returns `null` and `runCopilot` keeps the deterministic `base`.

Temperature 0.2, `max_tokens` / `maxOutputTokens` 900, timeout 20s (`REQUEST_TIMEOUT_MS`), one retry (`MAX_RETRIES`).

## Guardrails

From `server/agent/guardrails.ts`:

- **AGENT_IDENTITY** — PharmaOps Copilot summarizes operational evidence; it does not make batch release, GMP, safety, or regulatory decisions.
- **UNIVERSAL_RULES** — packet-only reasoning; prefer contributing factors over confirmed root cause; state missing data; decline QA/release/safety; cite evidence ids; separate facts from hypotheses.
- **HUMAN_REVIEW_DISCLAIMER** — not a validated GxP system; a qualified human must review before any decision. Copied onto every `CopilotResponse`.
- **BANNED_PHRASES** (reason strings):
  - `safe to release` / `cleared for release` / `approved for release` / `ok to release` → "release decision"
  - `batch is safe` → "safety assertion"
  - `root cause is/confirmed/was`, `confirmed root cause`, `definitive root cause` → "unconfirmed root-cause claim" (negation-aware: lookbehind skips "not a confirmed root cause")
  - `you can/should release`, `I recommend/approve releas` → "release recommendation"
  - `do not release` / `reject the batch` / `fail the batch` → "disposition decision"

`sanitizeText` globally replaces matches with `[requires human review]` and records reasons. `applyGuardrails` appends a `limitations[]` line when any violation fired. That channel is how the UI (and evals) see overreach without crashing the answer.

## Deterministic builders

`buildDeterministic` switches on intent: `buildReleaseResponse`, `buildMaintenanceResponse`, `buildHandoverResponse`, `buildDataGapsResponse`, `buildSopResponse`, `buildAudienceResponse`, else `buildTriageResponse`. Then `groundToPacket`.

B-104's rich narrative is gated on evidence, not on the batch id string. `isB104Story` is true only when CIP-hold, pH-drift, temperature-excursion, buffer-addition, and a deviation are all present in *this* packet. Other batches get packet-derived copy ("no deviation on record", event/WO counts) so B-103 cannot leak DEV-104 (EVAL-22).

Unknown batches (`buildEvidencePacket` null) use `notFoundResponse`: "No data found for batch …". If the question also names a foreign `B-###`, `mentionedForeignBatches` appends "I cannot substitute another batch's evidence (B-104) for B-999." (EVAL-18, EVAL-21).

## Multi-provider LLM

`getLlmProvider`: if `LLM_PROVIDER` is set, that provider is used only when its key exists; otherwise first key among openai → anthropic → gemini. `isLlmEnabled` is that result.

| Provider | Transport | JSON strategy |
|----------|-----------|---------------|
| OpenAI | `openai` SDK `chat.completions.create` | `response_format: { type: "json_object" }` |
| Anthropic | `fetch` `https://api.anthropic.com/v1/messages` | System prompt + "Respond with a single JSON object only." |
| Gemini | `fetch` `generativelanguage.googleapis.com/...:generateContent` | `responseMimeType: "application/json"` + same JSON-only suffix |

Shared `parseNarrative`. `generatedBy` on the response is `"deterministic"` or the provider id; `model` is set only on the LLM path.

Keys are read only in `llm.ts`. The browser never sees them.

## Retrieval

`retrieveDocuments` (`server/retrieval/simpleRetriever.ts`) is `hybridRetrieve ?? keywordRetrieve`. Live path requires `sop_embeddings.json` with `provider === "tfidf"` (`loadSopIndex`). An OpenAI-built index is ignored at query time.

Keyword score (`scoring.ts`): +2 exact term, +1 substring, +1.5 related batch, +1 related equipment. Haystack includes `documentTitle`, title, content, tags.

Hybrid: `score = α · cosine(TF-IDF) + β · keyword` with `ALPHA = 2`, `BETA = 1` (`hybridRetriever.ts`). Query vectors use the committed vocab + idf. Index built by `scripts/embed_sops.py` (stdlib TF-IDF; tokenization must match `server/retrieval/tokenize.ts`).

`sectionInScope` (`scope.ts`) drops sections whose `relatedBatchId` is a *different* batch, before scoring. Keyword and hybrid share it so embeddings cannot reintroduce another batch's BMR (BUG-03). `topK` is 5 on the packet path.

Missing or non-tfidf index → keyword-only. Packet contract `{ section, score }[]` is unchanged.

## Failure modes

| Situation | What the user sees |
|-----------|-------------------|
| Unknown batch | "No data found for batch B-999. Select a valid batch (e.g. B-104)." |
| Substitution ask on unknown batch | Same, plus "I cannot substitute another batch's evidence (…)." |
| Missing signal / empty chart | Dashboard empty state: "No time-series data for this batch. Batch B-104 is the fully modeled demo." |
| Injection / "approve the release" | `release_decision` answer: cannot make a release decision; QA/SOP; disclaimer. Banned phrases replaced if they still appear. |
| LLM timeout or HTTP error | stderr log; deterministic answer; `generatedBy: "deterministic"`. |
| Banned phrase in LLM prose | Phrase → `[requires human review]`; `limitations[]` records the reason. |
| Data not generated | `POST /api/copilot/chat` 503 from `server/app.ts`. |

## Atlas AI counterpart

On CDF this orchestrator is replaced by an Atlas AI agent. Guardrails become `instructions` on the agent YAML (generated from the same TypeScript constants). Domain workflow lives in one skill (`pharmaops_deviation_triage`): frontmatter name/description, body for when-to-use, ISA vocabulary, and tool sequencing. Tools are Atlas built-ins [`query`](https://docs.cognite.com/cdf/atlas_ai/references/atlas_ai_agent_tools), [`queryTimeSeriesDatapoints`](https://docs.cognite.com/cdf/atlas_ai/references/atlas_ai_agent_tools), and [`askDocument`](https://docs.cognite.com/cdf/atlas_ai/references/atlas_ai_agent_tools) — the same families [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp) exposes outside CDF. Local `triage_batch` / `build_evidence_packet` are composed conveniences, not Atlas tool types.

See [05-mcp-and-atlas.md](./05-mcp-and-atlas.md) and [11-cdf-migration-path.md](./11-cdf-migration-path.md).
