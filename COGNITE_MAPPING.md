# Cognite CDF mapping

This is a **local-first** prototype. It does not connect to a CDF tenant. The domain is mapped onto the [ISA-88/95 manufacturing data model pack](https://docs.cognite.com/cdf/deploy/cdf_toolkit/references/packages/isa_data_model), [Records](https://docs.cognite.com/cdf/dm/records/concepts/records_and_streams) for high-volume events, and a small `PharmaDeviation` extension. [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp), Atlas AI (agents as code), and Flows custom apps are the landing zones for the agent and the UI.

The in-app source of truth is `CDF_MAPPINGS` in [`app/src/types/cdfMapping.ts`](./app/src/types/cdfMapping.ts). Keep this table in agreement with that array.

## Entity table

| Local entity | CDF concept | View / resource | Notes |
|---|---|---|---|
| Site / Area | ISA-95 Site → Area | `isa_manufacturing:Site, Area` | Organizational hierarchy levels 4–3. All hierarchy nodes link to ISAAsset (CogniteAsset) for navigation. |
| Asset (Bioreactor Train A, CIP Skid) | ISA-95 ProcessCell / Unit | `isa_manufacturing:ProcessCell, Unit` | The bioreactor train is a ProcessCell; BIO-101 is the Unit that executes the batch. |
| Equipment (sensors, valves, pump) | Equipment / EquipmentModule | `isa_manufacturing:Equipment · CogniteEquipment` | PH-101, TT-101, AG-101 are components of Unit BIO-101; the CIP skid serves the unit. |
| Batch | ISA-88 Batch | `isa_manufacturing:Batch` | One execution of a Recipe on a Unit. Links to Recipe, WorkOrder, Site, and Phase. |
| Batch phase (CIP, fermentation …) | ISA-88 Phase / Operation | `isa_manufacturing:Phase, Operation · CogniteActivity` | Procedural elements with start/end; the CIP hold and fermentation phases become Phase instances. |
| Deviation (DEV-104) | PharmaDeviation (extension view) | `sp_pharmaops_model:PharmaDeviation` | Small extension: status, severity, openedAt, batch, equipment. Toolkit YAML in `cdf/modules/pharmaops_deviation/`. |
| Process events, alarms, operator actions | Records | `sp_pharmaops_records:BatchEvent` (`usedFor: record`) | High-volume, immutable, linked to batch and equipment — navigable in both directions without bloating the graph. |
| TimeSeriesSignal + datapoints | ISATimeSeries | `isa_manufacturing:ISATimeSeries · CogniteTimeSeries` | Historian tags matched to instrument-index loops; datapoints via the Time Series API. |
| WorkOrder | ISA WorkOrder | `isa_manufacturing:WorkOrder · CogniteActivity` | CMMS orders linked to Equipment and Batch. CogniteMaintenanceOrder (IDM) is the alternative for SAP-PM-shaped data. |
| Operator notes, SOPs, batch record, shift handover | ISAFile / CogniteFile | `isa_manufacturing:ISAFile` | Files linked to batch, deviation, and equipment; sectioned for citation. |
| Source system (MES, Historian, CMMS, QMS) | CogniteSourceSystem | `cdf_cdm:CogniteSourceSystem` | Provenance on every sourceable instance — the contextualization report shows how each was resolved. |
| Copilot tools | Atlas AI agent (agents as code) | `cdf/modules/…/agents/pharmaops_triage.Agent.yaml` | `query` · `queryTimeSeriesDatapoints` · `askDocument`, plus an SOP-derived skill and a CLI eval suite generated from the local evals. |
| MCP server (`server/mcp`) | Industrial MCP | — | Same tool vocabulary. Today: local stdio server over synthetic data. On CDF: point Claude / Cursor / Copilot at Industrial MCP instead. |
| React web app | Flows custom app | — | Hosted in CDF; auth via `connectToHostApp()` from `@cognite/app-sdk`. |

## Why not CogniteActivity for events?

A real campaign produces thousands of alarms and operator actions. Putting those on the knowledge graph as `CogniteActivity` nodes makes the graph unnavigable. [Records](https://docs.cognite.com/cdf/dm/records/concepts/records_and_streams) are the store for high-volume immutable logs, linked to equipment and batch by text external ids. The batch *campaign itself* is an ISA-88 Batch (the pack's Batch view implements `CogniteActivity`). The quality deviation is the small `PharmaDeviation` extension — a QA record, not a work activity.

## Contextualization

`data/raw/` holds siloed MES, historian, CMMS, QMS, and engineering-register exports with their own IDs, clocks, and units. `scripts/contextualize.py` resolves them into `data/generated/` and writes `contextualization_report.json`. That is the local stand-in for extractors → RAW → transformations → instances. The CDF-ready page in the app and on the [docs site](https://rithwikgokhale.github.io/PharmaOpsCopilot/#cdf) renders the report.

Three records stay **unresolved** on purpose — the pipeline does not invent links:

1. Historian tag `CHI.WFI.FT301.PV` — no instrument-index entry.
2. CMMS equipment `CHI-UTIL-WFI-PMP301` / `10009999` — no engineering tag.
3. `WO-760` — raised against that orphan equipment.

## Agents and MCP

| Local | On CDF |
|---|---|
| `server/mcp` (`npm run mcp`) | [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp) endpoint |
| `npm run export:atlas` YAML | Atlas AI agent + skill + [`cognite agents eval run`](https://docs.cognite.com/dev/sdks/cognite-cli/agents-eval) |
| Hybrid keyword + TF-IDF (`server/retrieval`) | Atlas AI [`askDocument`](https://docs.cognite.com/dev/sdks/cognite-cli/agent-yaml#tools) | Local `sop_embeddings.json` | Packet contract unchanged. Committed TF-IDF index; not a live CDF call. |
| `IDataProvider` / `LocalDataProvider` | `CdfDataProvider` + `connectToHostApp()` in Flows |

## Toolkit module

[`cdf/modules/pharmaops_deviation/`](./cdf/modules/pharmaops_deviation/) is a module skeleton, not a deployable Toolkit project (no `cdf.toml` in this repo). Integration steps:

1. Deploy the ISA-88/95 manufacturing pack.
2. Port `contextualize.py` to RAW + transformations; entity matching for leftover tag↔equipment.
3. Deploy this module (deviation view + Records stream).
4. Deploy the exported agent, skill, and evals.
5. Point desktop copilots at Industrial MCP.

## Stub

[`app/src/adapters/CdfDataProvider.stub.ts`](./app/src/adapters/CdfDataProvider.stub.ts) is intentionally unimplemented. Every method throws `NOT_IMPLEMENTED`. This prototype runs without Cognite credentials.
