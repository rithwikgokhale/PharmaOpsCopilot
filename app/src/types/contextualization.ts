/** Shape of data/generated/contextualization_report.json (written by scripts/contextualize.py). */

export interface ContextualizationSource {
  system: string;
  layer: "IT" | "OT" | "ET" | "derived";
  files: string[];
  records: number;
  description: string;
}

export interface ContextualizationMatch {
  entity: string;
  source: string;
  sourceKey: string;
  resolvedId: string;
  method: "exact" | "alias" | "normalized" | "master_data_join" | "fuzzy";
  confidence: number;
  note: string;
}

export interface ContextualizationUnresolved {
  entity: string;
  source: string;
  sourceKey: string;
  reason: string;
}

export interface ContextualizationConversion {
  kind: "timestamp" | "unit" | "dropped";
  source: string;
  key: string;
  detail: string;
  records: number;
}

export interface ContextualizationDuplicate {
  entity: string;
  source: string;
  key: string;
  kept: string;
  dropped: number;
}

export interface ContextualizationRepair {
  entity: string;
  source: string;
  key: string;
  field: string;
  action: string;
}

export interface ContextualizationReport {
  pipeline: string;
  plantUtcOffsetHours: number;
  summary: {
    sources: number;
    sourceRecords: number;
    matches: number;
    matchesByMethod: Record<string, number>;
    lowConfidenceMatches: number;
    unresolved: number;
    conversions: number;
    duplicatesRemoved: number;
    repairs: number;
  };
  entities: Record<string, number>;
  sources: ContextualizationSource[];
  matches: ContextualizationMatch[];
  lowConfidenceMatches: ContextualizationMatch[];
  unresolved: ContextualizationUnresolved[];
  conversions: ContextualizationConversion[];
  duplicatesRemoved: ContextualizationDuplicate[];
  repairs: ContextualizationRepair[];
}
