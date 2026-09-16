/**
 * Maps local domain objects to Cognite Data Fusion concepts.
 *
 * The target is the ISA-88/95 Manufacturing data model deployment pack
 * (batch and discrete manufacturing on top of the Core Data Model), with
 * high-volume events in Records and a small deviation extension view. Toolkit
 * YAML for the extension lives in cdf/modules/pharmaops_deviation/.
 *
 * See:
 *   https://docs.cognite.com/cdf/deploy/cdf_toolkit/references/packages/isa_data_model
 *   https://docs.cognite.com/cdf/dm/records/concepts/records_and_streams
 *   https://docs.cognite.com/cdf/build/industrial_mcp
 */

export interface CdfMappingEntry {
  localType: string;
  cdfConcept: string;
  cdfView?: string;
  notes: string;
}

export const CDF_MAPPINGS: CdfMappingEntry[] = [
  {
    localType: "Site / Area",
    cdfConcept: "ISA-95 Site → Area",
    cdfView: "isa_manufacturing:Site, Area",
    notes: "Organizational hierarchy levels 4–3. All hierarchy nodes link to ISAAsset (CogniteAsset) for navigation.",
  },
  {
    localType: "Asset (Bioreactor Train A, CIP Skid)",
    cdfConcept: "ISA-95 ProcessCell / Unit",
    cdfView: "isa_manufacturing:ProcessCell, Unit",
    notes: "The bioreactor train is a ProcessCell; BIO-101 is the Unit that executes the batch.",
  },
  {
    localType: "Equipment (sensors, valves, pump)",
    cdfConcept: "Equipment / EquipmentModule",
    cdfView: "isa_manufacturing:Equipment · CogniteEquipment",
    notes: "PH-101, TT-101, AG-101 are components of Unit BIO-101; the CIP skid serves the unit.",
  },
  {
    localType: "Batch",
    cdfConcept: "ISA-88 Batch",
    cdfView: "isa_manufacturing:Batch",
    notes: "One execution of a Recipe on a Unit. Links to Recipe, WorkOrder, Site, and Phase.",
  },
  {
    localType: "Batch phase (CIP, fermentation …)",
    cdfConcept: "ISA-88 Phase / Operation",
    cdfView: "isa_manufacturing:Phase, Operation · CogniteActivity",
    notes: "Procedural elements with start/end; the CIP hold and fermentation phases become Phase instances.",
  },
  {
    localType: "Deviation (DEV-104)",
    cdfConcept: "PharmaDeviation (extension view)",
    cdfView: "sp_pharmaops_model:PharmaDeviation",
    notes: "Small extension: status, severity, openedAt, batch, equipment, relatedEvents. Toolkit YAML in cdf/modules/.",
  },
  {
    localType: "Process events, alarms, operator actions",
    cdfConcept: "Records",
    cdfView: "sp_pharmaops_records:BatchEvent (usedFor: record)",
    notes: "High-volume, immutable, linked to batch and equipment — navigable in both directions without bloating the graph.",
  },
  {
    localType: "TimeSeriesSignal + datapoints",
    cdfConcept: "ISATimeSeries",
    cdfView: "isa_manufacturing:ISATimeSeries · CogniteTimeSeries",
    notes: "Historian tags matched to instrument-index loops; datapoints via the Time Series API.",
  },
  {
    localType: "WorkOrder",
    cdfConcept: "ISA WorkOrder",
    cdfView: "isa_manufacturing:WorkOrder · CogniteActivity",
    notes: "CMMS orders linked to Equipment and Batch. CogniteMaintenanceOrder (IDM) is the alternative for SAP-PM-shaped data.",
  },
  {
    localType: "Operator notes, SOPs, batch record, shift handover",
    cdfConcept: "ISAFile / CogniteFile",
    cdfView: "isa_manufacturing:ISAFile",
    notes: "Files linked to batch, deviation, and equipment; sectioned for citation.",
  },
  {
    localType: "Source system (MES, Historian, CMMS, QMS)",
    cdfConcept: "CogniteSourceSystem",
    cdfView: "cdf_cdm:CogniteSourceSystem",
    notes: "Provenance on every sourceable instance — the contextualization report shows how each was resolved.",
  },
  {
    localType: "Copilot tools",
    cdfConcept: "Atlas AI agent (agents as code)",
    cdfView: "cdf/modules/…/agents/pharmaops_triage.Agent.yaml",
    notes: "query · queryTimeSeriesDatapoints · askDocument, plus an SOP-derived skill and a CLI eval suite generated from the local evals.",
  },
  {
    localType: "MCP server (server/mcp)",
    cdfConcept: "Industrial MCP",
    notes: "Same tool vocabulary. Today: local stdio server over synthetic data. On CDF: point Claude / Cursor / Copilot at Industrial MCP instead.",
  },
  {
    localType: "React web app",
    cdfConcept: "Flows custom app",
    notes: "Hosted in CDF; auth via connectToHostApp() from @cognite/app-sdk.",
  },
];
