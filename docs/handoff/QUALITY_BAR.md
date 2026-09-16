# Quality bar — match this or the sample looks cheaper than the rest of the repo

The previous work was done to a principal-engineer review standard. A cheaper model will drift toward generic README tone, invented Cognite APIs, extra abstractions, and unverified UI. This file is the antidote.

---

## Voice and positioning

- This is a **field-engineering prototype** and **open-source sample**, not a product launch and not an interview packet.
- **Never** write: interview, take-home, application, hiring, "for Cognite recruiters", "FDE assignment".
- **Always** keep the GxP disclaimer near the top of README / About / site: not validated; no batch release / QA disposition / safety / regulatory decisions.
- Prefer specific nouns (`ISA-88 Batch`, `Records stream`, `contextualize.py`, `Industrial MCP`) over "modern AI platform" / "leverage" / "seamless".
- When you mention a Cognite product, link the public docs URL. If you cannot find it via the Cognite Docs MCP, do not invent a path.
- Do not claim the prototype **deploys** to CDF. It is **CDF-ready**: artifacts a Toolkit/CLI user could deploy; `CdfDataProvider` is a stub; no tenant is required to run the demo.

Good: "Today a local MCP server exposes the same tool families Industrial MCP hosts on CDF."

Bad: "We fully integrate with Cognite Data Fusion and Atlas AI."

---

## Code conventions in this repo

- TypeScript, ESM (`"type": "module"`), path aliases as already used. Do not introduce a new bundler or CSS framework.
- Frontend: React 18, Vite, Tailwind, `framer-motion`, `lucide-react`. Reuse `Card`/`Badge`/`Section` on the site; reuse `ArchitectureDiagram` / motion helpers in the app.
- Backend: Express + `zod`. Agent stays in `server/agent/*`. Do not move it.
- Python 3, **stdlib only** for generator + contextualizer (`csv`, `json`, `difflib`, `re`, `datetime`, `pathlib`). No pandas, no pydantic, no cognite-sdk until Tier 2 if a CDF ingest script is explicitly requested (it is not, in Tier 1).
- Tests: Vitest. Evals: `evals/run_eval.ts` over `evals/eval_cases.json`. Do not add Jest.
- Formatting: Prettier + ESLint already configured. Run `npm run lint` rather than reformatting the whole tree.
- Comments: explain *why* (guardrails, provenance, ISA mapping). Do not narrate "import React".
- Generated files: header comment that names the generator. Humans edit the source of truth (`guardrails.ts`, `eval_cases.json`, the Python scripts), then regenerate.

### Contrast (already burned us once)

Light theme: body text `text-slate-700` / `text-slate-600` on `bg-white`. Headings `text-slate-900`.

Dark theme: body `text-slate-300` on `dark:bg-brand-800` / `brand-900`. Headings `text-slate-100`. Accent links `text-accent-700` / `dark:text-accent-300`.

Never `text-slate-400` as primary body on white. Never yellow-on-white for anything except the GxP warning, which uses `amber-50` / `amber-900` with a border.

### UI verification (user rule)

If you change UI, layout, routing, or rendered data:

1. `npm run dev` and exercise the flow in the browser MCP (or say what you could not verify).
2. A screenshot is not verification. Click, navigate, check empty/error states.
3. Check **both** the app (`/cdf`) and the docs site (`#cdf`) when the mapping story changes.
4. Check light and dark if you touched colors.
5. Hunt regressions on Dashboard, Copilot, Evals — they share generated data.

---

## Data and eval invariants

These are load-bearing. Breaking them fails CI or the demo script.

1. Default batch is **B-104**, deviation **DEV-104**, equipment **BIO-101**, CIP skid **CIP-201**.
2. Storyline: CIP conductivity hold → late start → pH drift/alarm → operator buffer → temperature excursion → agitator dip → DEV-104 opened → QA pending.
3. Work orders cited in evals: **WO-731** (pH probe, PH-101), **WO-744** (transfer valve, VLV-203), **WO-752** (CIP conductivity, CIP-201).
4. `npm run eval` → **18/18**. Do not drop cases. Do not add cases in Tier 1.
5. Guardrails: never "safe to release", "batch is safe", "final root cause confirmed". Always end with `HUMAN_REVIEW_DISCLAIMER`.
6. `random.seed(42)` in the generator. Deterministic output. If `generate-data` changes JSON that evals key on, you broke a mapping — fix the pipeline, do not loosen evals.
7. `data/generated` and `public/data/generated` byte-identical (`check-data-sync`).
8. Orphan records in `data/raw` stay **unresolved**. Do not fuzzy-match the WFI pump onto BIO-101 to make the unresolved count zero.

---

## Cognite vocabulary (use correctly)

| Say | Do not say |
|---|---|
| ISA-95 Site → Area → ProcessCell → Unit → EquipmentModule | "assets in a tree" as the target model |
| ISA-88 Batch / Phase / Operation | Batch = CogniteActivity (that was the old mapping) |
| PharmaDeviation extension view in `sp_pharmaops_model` | A whole new manufacturing data model that duplicates ISA |
| Records (`usedFor: record`) for events/alarms | CogniteActivity / CogniteEvent for the high-volume log |
| Atlas AI **Query** tool (`type: query`) | `queryKnowledgeGraph` (deprecated name in older copy) |
| `queryTimeSeriesDatapoints`, `askDocument` | Invented tool names |
| Industrial MCP | "our MCP replaces Industrial MCP" |
| Toolkit module under `cdf/modules/pharmaops_deviation` | A fake `cognite-toolkit` install in this repo |
| Flows custom app + `connectToHostApp()` | Claiming the app is already hosted in CDF |

ISA pack facts (from Cognite docs, verify if the pack changes):

- Pack id: `dp:models:isa_manufacturing_extension` inside `dp:models`.
- Enterprise space: `dm_dom_isa_manufacturing`.
- 24 containers, 26 views, composed model `ISA_Manufacturing_DOM`.
- Hierarchy: Enterprise → Site → Area → ProcessCell → Unit → EquipmentModule (ISA-95) and Recipe → Procedure → UnitProcedure → Operation → Phase (ISA-88).
- Many views implement `cdf_cdm` interfaces (`CogniteActivity`, `CogniteDescribable`, `CogniteTimeSeries`).
- Our module **extends** this pack with `PharmaDeviation` + a Records stream. We do **not** copy the 26 ISA views into this repo.

Toolkit filename suffixes are load-bearing (Cognite Toolkit will ignore misnamed files):

| Resource | Directory | Suffix |
|---|---|---|
| Space | `data_modeling/` | `.space.yaml` |
| Container | `data_modeling/` | `.container.yaml` |
| View | `data_modeling/` | `.view.yaml` |
| Data model | `data_modeling/` | `.datamodel.yaml` |
| Stream | `streams/` | `*.Streams.yaml` (capital S) |
| Agent | `agents/` | `*.Agent.yaml` |
| Skill | `agents/` | `*.Skill.yaml` + sibling `.Skill.md` |

Agent skill YAML is **only** `externalId`. Body lives in the markdown sidecar with frontmatter `name` + `description` matching the skill identity.

Stream templates Cognite documents: `ImmutableTestStream`, `BasicArchive`, `BasicLiveData`. For a demo of immutable batch events use **`BasicArchive`** (production-like) or `ImmutableTestStream` if you want the documented example. State the choice in a comment. Do not invent a fourth template name.

---

## Hybrid Python / TypeScript split (user decision)

| Keep in TypeScript | Keep in / add as Python |
|---|---|
| React app, Express API, orchestrator, tools, guardrails, eval runner, MCP server, `export-atlas-agent.ts` | `generate_synthetic_pharma_data.py`, `contextualize.py` |
| Vitest | (Tier 2) embedding index script |

Do **not** add a parallel Python MCP server. Do **not** rewrite `export-atlas-agent.ts` in Python — it imports `guardrails.ts` and `buildEvidencePacket` directly.

---

## Git and CI

- Do not `git config`.
- Do not commit unless the user says to. When they do, follow the repo's existing message style (short why-focused sentences; HEREDOC). Do not commit `.env`.
- Do not force-push.
- Do not `--no-verify`.
- After commit, `git status` should be clean except files the user asked to leave out.
- CI (`.github/workflows/ci.yml`) today: `check-data-sync`, lint, typecheck, test, eval, build, plus a separate site job. Adding `export:atlas` drift: generate, then `git diff --exit-code -- cdf/`. Ubuntu images have `python3`; you do **not** need `setup-python` unless you add pip deps (Tier 2).
- Pages deploy is a **separate** workflow, path-filtered. If you change only `COGNITE_MAPPING.md` / README, Pages will **not** rebuild. Site copy lives in `site/src`. Changing `data/generated/contextualization_report.json` **does** trigger Pages after the freeze patch to `deploy-pages.yml`.

---

## What "done" looks like vs. a sloppy finish

A sloppy cheaper-model finish:

- README still says the generator writes JSON directly.
- `COGNITE_MAPPING.md` still maps events to CogniteActivity.
- Toolkit folder has agents but no data model, while the UI claims "Toolkit YAML in cdf/modules/".
- Site TechStack still says "12-case".
- Typecheck fails on MCP tests.
- No browser check; the contextualization panel's fetch 404s because `public/data/generated/contextualization_report.json` was forgotten.
- Invented CDF view names (`cognite:PharmaBatch`).

A finish that matches this repo:

- Every public surface (README, site, About, PROJECT_BRIEF, DEMO_SCRIPT, mapping doc, stub comments) tells the **same** ISA-88/95 + Records + MCP + agents-as-code story.
- `cdf/modules/pharmaops_deviation/data_modeling/` and `streams/` exist and match the names already used in `cdfMapping.ts` (`sp_pharmaops_model:PharmaDeviation`, `sp_pharmaops_records:BatchEvent`).
- `npm run typecheck && npm test && npm run eval && npm run lint && npm run build && (cd site && npm run build)` all pass.
- App `/cdf` shows the report (6 systems, 49 matches, 3 unresolved) and the new mapping table.
- Site `#cdf` shows the three cards with those same numbers (imported from the JSON, not hardcoded).
- `npm run export:atlas` is idempotent (`git diff` empty after a second run).

---

## When you are unsure

1. Query Cognite Docs MCP (`search_cognite_docs` then `query_docs_filesystem_cognite_docs` on the `.mdx` path).
2. Prefer a smaller YAML skeleton with a comment "not deployed; format follows resource_library" over a 400-line guessed schema.
3. Do not add features from TIER2/TIER3 "while you're here".
4. Do not refactor `server/agent/orchestrator.ts` unless a test forces it.
