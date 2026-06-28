/**
 * Maps local domain objects to future Cognite CDF / CDM concepts.
 * See: https://docs.cognite.com/cdf/dm/dm_reference/dm_core_data_model
 */

export interface CdfMappingEntry {
  localType: string;
  cdfConcept: string;
  cdfView?: string;
  notes: string;
}

export const CDF_MAPPINGS: CdfMappingEntry[] = [
  {
    localType: "Site / Area / Asset",
    cdfConcept: "CogniteAsset",
    cdfView: "cdf_cdm:CogniteAsset(v1)",
    notes:
      "Hierarchical asset tree. Areas and sites are parent CogniteAsset nodes.",
  },
  {
    localType: "Equipment",
    cdfConcept: "CogniteEquipment",
    cdfView: "cdf_cdm:CogniteEquipment(v1)",
    notes:
      "Physical devices linked to CogniteAsset via direct relation (asset property).",
  },
  {
    localType: "TimeSeriesSignal + points",
    cdfConcept: "CogniteTimeSeries",
    cdfView: "cdf_cdm:CogniteTimeSeries(v1)",
    notes:
      "Metadata via Instances API; datapoints via Time Series API. Linked to equipment/assets.",
  },
  {
    localType: "Batch / CIP cycle / Deviation",
    cdfConcept: "CogniteActivity",
    cdfView: "cdf_cdm:CogniteActivity(v1)",
    notes:
      "Domain-specific extension of CogniteActivity for batch lifecycle and quality events.",
  },
  {
    localType: "WorkOrder",
    cdfConcept: "CogniteMaintenanceOrder",
    cdfView: "cdf_idm:CogniteMaintenanceOrder(v1)",
    notes: "CMMS work orders linked to equipment via mainAsset relation.",
  },
  {
    localType: "Document / SOP",
    cdfConcept: "CogniteFile",
    cdfView: "cdf_cdm:CogniteFile(v1)",
    notes:
      "Markdown/PDF SOPs and batch records. Linked to assets via assets property.",
  },
  {
    localType: "Source system tag",
    cdfConcept: "CogniteSourceSystem",
    notes: "MES, Historian, CMMS provenance on sourceable entities.",
  },
  {
    localType: "Relationship",
    cdfConcept: "Direct relations / edges",
    notes:
      "Batch→Equipment, Equipment→TimeSeries, Deviation→Document via data model edges.",
  },
  {
    localType: "AI Copilot",
    cdfConcept: "Atlas AI Agent",
    notes:
      "Scoped agent with tools: queryKnowledgeGraph, queryTimeSeriesDatapoints, askDocument.",
  },
  {
    localType: "React web app",
    cdfConcept: "Flows custom app",
    notes:
      "Hosted in CDF iframe; auth via connectToHostApp() from @cognite/app-sdk.",
  },
];
