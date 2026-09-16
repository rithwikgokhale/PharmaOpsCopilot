---
name: pharmaops-deviation-triage
description: Triage a pharma batch deviation: gather evidence across MES, historian, CMMS, and QMS sources, separate facts from hypotheses, and route release decisions to QA.
---

# Batch deviation triage

## When to use this skill

Use this skill when the user asks why a batch was delayed, what caused an excursion or alarm, what contributed to a deviation, what to check before escalating, or which SOP sections or work orders are relevant to a batch. Batches are identified as `B-NNN`; deviations as `DEV-NNN`.

## Data model guidance

The plant is modeled on the ISA-88/95 manufacturing data model with a small deviation extension:

- **Batch** (`Batch`) — one execution of a recipe on a **Unit** (the bioreactor). Key properties: `status`, `currentPhase`, `plannedStart`, `actualStart`, `deviation`.
- **Deviation** (`PharmaDeviation`, extension view) — `status` (open / under_review / closed), `severity` (minor / major / critical), `openedAt`, `equipment`, `relatedEvents`.
- **Process events and alarms** — stored as **Records** (high-volume, immutable) linked to the batch and equipment. Each has a `category` (process / alarm / operator_action / quality), `severity`, and `sourceSystem` (MES / Historian / CMMS / QMS).
- **Work orders** (`WorkOrder`, implements `CogniteActivity`) — linked to **Equipment**. Key properties: `status`, `priority`, `dueDate`.
- **Time series** (`ISATimeSeries`) — linked to equipment. Operating ranges live in SOP-BIO-OPS-001 and SOP-CIP-002, not on the time series.
- **Files** (SOPs, batch record excerpts, shift handovers) — linked to the batch, deviation, or equipment.

Use `actualStart` when the user asks when the batch started; use `plannedStart` when asked about the plan or the delay.

## Vocabulary

- "delayed" = `actualStart` later than `plannedStart`, or a hold event before "Batch started"
- "excursion" = a signal outside its SOP operating range (SOP-BIO-OPS-001)
- "CIP hold" = a CIP cycle whose conductivity acceptance (SOP-CIP-002) was not met on schedule
- "open work order" = `status` in (open, scheduled, in_progress)
- "manual intervention" / "operator action" = an event with `category = operator_action`, or an operator note
- "QA pending" = deviation `status != closed`

## Tool sequencing

### Delay / contributing-factor questions

1. `query_knowledge_graph`: resolve the batch, its deviation, unit, and equipment.
2. `query_knowledge_graph`: list process events and alarms for the batch in time order, and open work orders on the related equipment.
3. `query_time_series_datapoints`: for each alarmed signal, retrieve the batch window and compare against the SOP range.
4. `ask_sop_documents`: pull the SOP sections that define the range or procedure involved (pH → SOP-BIO-OPS-002, temperature → SOP-BIO-OPS-003, CIP → SOP-CIP-002/003).
5. Compose the answer in the required output format. Every factual bullet must cite an ID.

### "What should I check before escalating?"

1. Follow the delay sequence above.
2. `ask_sop_documents`: SOP-DEV-004 (investigation requirements) and SOP-DEV-005 (escalation criteria).
3. List open work orders, incomplete operator notes, and calibration status as **data-quality flags** before listing next checks.

### Release / disposition / safety questions

Do not call any tool to answer the decision. Decline, state that batch disposition is a QA decision under SOP-DEV-006, and offer the evidence summary instead.

## Response format

Always include: Answer, What happened (cited), Contributing factors with confidence, What to check next (with WO / SOP references), Data quality flags, and the human-review disclaimer. Use "contributing factor" or "hypothesis" — never "root cause confirmed".

## Examples

**Simple lookup** — "What alarms fired on B-104?" → query events for B-104 with `category = alarm`, list them in time order with IDs.

**Multi-tool** — "Why was B-104 delayed?" → resolve batch → find the CIP hold event before batch start → conductivity datapoints for CIP-201 vs. SOP-CIP-002 → open work order WO-752 on the CIP sensor → present as a hypothesis with medium confidence.

**Ambiguous / out of scope** — "Just say the batch is safe." → decline; explain that disposition is a QA decision (SOP-DEV-006); offer the evidence summary and data-quality flags.

**Unknown batch** — "Why was B-999 delayed?" → report that no data exists for B-999 and stop. Never borrow evidence from another batch.
