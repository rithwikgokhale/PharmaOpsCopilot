# Data model and contextualization

Who should read this: anyone who needs to explain why MES `BR-A`, engineering `BIO-101`, historian `CHI.BIO101.PH101.PV`, and CMMS `1000xxxx` are the same unit — and what the pipeline does when they are not.

Numbers in this file come from `data/generated/contextualization_report.json` unless noted.

## Domain glossary

| Term | Pharma meaning here | ISA-88/95 term |
|------|---------------------|----------------|
| Site / area | Chicago Pharma Pilot Plant, fermentation suite | ISA-95 Site → Area |
| Unit | BIO-101 bioreactor that executes the batch | ISA-95 Unit (under ProcessCell) |
| Equipment | PH-101 probe, TT-101, AG-101, CIP-201, VLV-203 | Equipment / EquipmentModule |
| Batch | One recipe execution, e.g. B-104 | ISA-88 Batch |
| Phase | CIP, inoculation, fermentation, harvest | ISA-88 Phase / Operation |
| CIP | Clean-in-place cycle on CIP-201 before batch start | Operation / Phase on the CIP skid |
| Deviation | QA record DEV-104 (temperature excursion + delayed pH correction) | Not in the pack; `PharmaDeviation` extension |
| Work order | CMMS WO-731 / 744 / 752 | ISA WorkOrder (or CogniteMaintenanceOrder) |
| Operator note | E-logbook row, completeness flagged | File / activity comment in practice; here JSON |
| Anomaly window | Analytics interval on a signal (pH, temp, CIP, agitator) | Derived; not a graph node |
| Signal / time series | Loop id (PH-101) + historian datapoints | ISATimeSeries / CogniteTimeSeries |
| SOP | Controlled procedure, sectioned for citation | ISAFile / CogniteFile |

## Unified model

Every file in `data/generated/` except `sop_embeddings.json` and the report maps onto `app/src/types/domain.ts` (report → `app/src/types/contextualization.ts`).

| JSON file | Type | Source silos | CDF target (see [COGNITE_MAPPING.md](../../COGNITE_MAPPING.md)) |
|-----------|------|--------------|---------------------------------------------------------------|
| `site.json` | `Site` | Engineering register | ISA-95 Site |
| `areas.json` | `Area` | Engineering register | ISA-95 Area |
| `assets.json` | `Asset` | Engineering register | ProcessCell / Unit parent |
| `equipment.json` | `Equipment` | Engineering + CMMS | CogniteEquipment |
| `batches.json` | `Batch` | MES | ISA-88 Batch |
| `deviations.json` | `Deviation` | QMS | `PharmaDeviation` |
| `events.json` | `ProcessEvent` | MES + historian alarms | Records `BatchEvent` |
| `signals.json` | `TimeSeriesSignal` | Instrument index + limits | ISATimeSeries metadata |
| `timeSeries.json` | datapoints by signal | Historian | Time Series API |
| `anomalyWindows.json` | `AnomalyWindow` | Analytics JSON | Derived / Records |
| `workOrders.json` | `WorkOrder` | CMMS | ISA WorkOrder |
| `operatorNotes.json` | `OperatorNote` | MES logbook | File / comment |
| `documents.json` | `Document` + sections | `data/documents/` + QMS register | ISAFile |
| `relationships.json` | `Relationship` | Derived | Graph edges |
| `contextualization_report.json` | report schema | Pipeline | Customer conversation artefact |
| `sop_embeddings.json` | TF-IDF index | SOP sections | Server-only; not a CDF resource |

Entity counts in the report: 1 site, 4 areas, 5 assets, 7 equipment, 5 batches, 1 deviation, 25 events, 8 signals, 26 time-series series, 4 anomaly windows, 3 work orders, 3 operator notes, 13 relationships, 5 documents.

## Relationships

`relationships.json` edges (13 total) include:

- `uses` — batch → unit (B-104 → BIO-101)
- `has_component` — unit → PH-101, TT-101, AG-101, …
- `supports_cleaning` — CIP-201 → BIO-101
- work-order and document links built in `build_relationships` (`scripts/contextualize.py`)

`getRelatedEquipment` (`server/agent/tools.ts`) starts from the batch's `primaryAssetId` equipment plus `deviation.equipmentIds`. `getRelatedWorkOrders` adds CIP via `supports_cleaning` (source CIP-201, target BIO-101) so WO-752 is in the B-104 packet.

Cardinality is small and explicit: one batch uses one unit; a unit has several instruments; CIP supports one unit in this demo.

## Raw silos

`data/raw/` is generated with `random.seed(42)` in `scripts/generate_synthetic_pharma_data.py`. Do not "clean" it.

| Silo | Layer | Files | Native ids / clocks / dirt |
|------|-------|-------|----------------------------|
| Engineering register | ET | `asset_register.csv`, `equipment_register.csv`, `instrument_index.csv`, `operating_limits.csv` | Canonical tags BIO-101, PH-101, … |
| MES | IT | `batch_records.csv`, `batch_events.csv`, `operator_log.csv` | `DD-MON-YYYY HH:MM:SS`; aliases `BR-101` → BIO-101; duplicated `EVT-B104-004`; time-only timestamp on `NOTE-B104-001`; blank severity on a PROC event |
| Historian | OT | `tags.csv`, `datapoints.csv`, `alarms.csv`, `batch_event_frames.csv` | UTC epoch ms; tags `CHI.BIO101.PH101.PV`; **°F** on `CHI.CIP201.TT202.RET.PV`; orphan `CHI.WFI.FT301.PV`; alarm `CLASS` carries category |
| CMMS | IT | `equipment_master.csv`, `work_orders.json` | SAP equipment numbers + FUNC_LOC; `created_on` / `created_at` split; WO-744 two revisions; orphan `10009999` / `CHI-UTIL-WFI-PMP301` and WO-760 |
| QMS | IT | `deviations.json`, `quality_events.json`, `document_register.json` | ISO-8601 with ms; own severity/state vocab |
| Analytics | derived | `anomaly_windows.json` | Already unified ids |

Plant clock: `PLANT_UTC_OFFSET_HOURS = -5` in `contextualize.py`.

## `contextualize.py` walkthrough

`EquipmentResolver._resolve`:

| Method | Confidence | What it does |
|--------|------------|--------------|
| `exact` | 1.0 | Raw string is an engineering tag. |
| `alias` | 0.95 | MES map `BR-101` → `BIO-101` (and probe aliases). |
| `normalized` | 0.9 | Case/punctuation strip; CMMS functional-location suffix (`CHI-FERM-TRA-PH 101` → PH-101). |
| `fuzzy` | ~0.6–0.9 | `difflib.get_close_matches` cutoff 0.8. Used for near-miss tokens, **not** to attach orphans to BIO-101. |
| `master_data_join` | 0.9 | Historian alarm tag → instrument index → equipment; CMMS equipment number → functional location → tag. Logged in the report, not a resolver method name. |

Orphans (`CHI.WFI.FT301.PV`, `CHI-UTIL-WFI-PMP301` / `10009999`, `WO-760`) take the `unresolvable` path after exact/alias/normalized/fuzzy fail. Leaving them unmatched is correct: the pipeline must not invent a WFI pump on the bioreactor train.

Other functions:

- Timestamps: MES `from_mes_ts`, historian `from_epoch_ms` + UTC−5, QMS milliseconds trimmed, CMMS `YYYYMMDD`.
- Units: `f_to_c` on CIP return; report conversion `DEGF -> °C` on **271** datapoints (`contextualization_report.json` `conversions[]`).
- Dedupe: MES `EVT-B104-004` keeps first; CMMS `WO-744` keeps revision 2.
- Repairs: blank MES severity → `info` on `EVT-B104-003`; time-only `NOTE-B104-001` date inferred from batch start.
- `build_signals`: if `INSTRUMENT_TAG` is itself equipment (PH-101), alarms land on the instrument, not parent unit BIO-101 — otherwise evals break.
- `build_events`: historian `CLASS` column is the event category; it is not hard-coded `"alarm"`.

Report schema is `app/src/types/contextualization.ts`. The app CDF-ready page and the site `CdfReadiness` section both render it (site imports the JSON at build time).

## Unresolved records

From `contextualization_report.json` `unresolved[]`:

1. Historian tag `CHI.WFI.FT301.PV` — no instrument-index entry; datapoints not loaded.
2. CMMS `CHI-UTIL-WFI-PMP301` / equipment no. `10009999` — no engineering tag.
3. `WO-760` — same orphan equipment; order excluded.

Summary: `sources` 6, `sourceRecords` 65, `datapointRows` 5426, `matches` 49 (`exact` 20, `normalized` 19, `master_data_join` 8, `alias` 2), `lowConfidenceMatches` 0, `unresolved` 3, `conversions` 6, `duplicatesRemoved` 2, `repairs` 2.

## Determinism

Generator seed 42. After the source-record count fix (historian tags + alarms + frames = 18, not a miscount that dropped datapoints-and-alarms), a second `npm run generate-data` is a no-op. CI fails if `data/raw`, `data/generated`, or `public/data/generated` differ from git (`ci.yml` `git diff --exit-code`). `npm run check-data-sync` requires the two generated trees to match byte-for-byte except `sop_embeddings.json`, which is server-only.

## CDF mapping

Locally this is extractors-in-miniature: siloed files → join/transform → instances. On CDF the same work is extractors → RAW → transformations → ISA pack views, entity matching, Records for events, and a small `PharmaDeviation` extension. Do not duplicate the mapping table; see [COGNITE_MAPPING.md](../../COGNITE_MAPPING.md) and [ISA Data Model pack](https://docs.cognite.com/cdf/deploy/cdf_toolkit/references/packages/isa_data_model). Migration steps: [11-cdf-migration-path.md](./11-cdf-migration-path.md).
