/** Domain types for PharmaOps Copilot — maps to future CDF/CDM concepts */

export type EntityType =
  | "site"
  | "area"
  | "asset"
  | "equipment"
  | "batch"
  | "deviation"
  | "workOrder"
  | "document"
  | "event"
  | "operatorNote";

export type EventCategory =
  | "process"
  | "alarm"
  | "operator_action"
  | "maintenance"
  | "quality"
  | "document";

export type BatchPhase =
  | "planned"
  | "cip"
  | "inoculation"
  | "fermentation"
  | "harvest"
  | "hold"
  | "complete";

export type DeviationStatus = "open" | "under_review" | "closed";

export interface Site {
  id: string;
  name: string;
  description?: string;
}

export interface Area {
  id: string;
  siteId: string;
  name: string;
  description?: string;
}

export interface Asset {
  id: string;
  areaId: string;
  parentAssetId?: string;
  name: string;
  description?: string;
  assetType: string;
}

export interface Equipment {
  id: string;
  assetId: string;
  name: string;
  tag: string;
  equipmentType: string;
  manufacturer?: string;
  serialNumber?: string;
  status: "operational" | "maintenance" | "offline";
}

export interface Batch {
  id: string;
  name: string;
  productCode: string;
  status: "planned" | "running" | "delayed" | "complete" | "deviation";
  currentPhase: BatchPhase;
  plannedStart: string;
  actualStart?: string;
  plannedEnd?: string;
  actualEnd?: string;
  primaryEquipmentId: string;
  primaryAssetId: string;
  deviationId?: string;
  notes?: string;
}

export interface Deviation {
  id: string;
  batchId: string;
  title: string;
  description: string;
  status: DeviationStatus;
  severity: "minor" | "major" | "critical";
  openedAt: string;
  equipmentIds: string[];
  relatedEventIds: string[];
}

export interface ProcessEvent {
  id: string;
  batchId: string;
  timestamp: string;
  title: string;
  description?: string;
  category: EventCategory;
  equipmentId?: string;
  assetId?: string;
  severity?: "info" | "warning" | "alarm";
  sourceSystem?: string;
}

export interface SignalRange {
  target: number;
  min: number;
  max: number;
  unit: string;
}

export interface TimeSeriesSignal {
  id: string;
  equipmentId: string;
  name: string;
  externalId: string;
  unit: string;
  range: SignalRange;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface TimeSeriesSeries {
  signalId: string;
  batchId: string;
  points: TimeSeriesPoint[];
}

export interface AnomalyWindow {
  id: string;
  batchId: string;
  signalId: string;
  start: string;
  end: string;
  label: string;
  severity: "warning" | "alarm";
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "scheduled" | "closed";
  priority: "low" | "medium" | "high";
  equipmentId: string;
  dueDate?: string;
  createdAt: string;
  sourceSystem?: string;
}

export interface OperatorNote {
  id: string;
  batchId: string;
  timestamp: string;
  author: string;
  content: string;
  equipmentId?: string;
  completeness: "complete" | "partial" | "incomplete";
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
}

export interface Document {
  id: string;
  title: string;
  documentType: "sop" | "batch_record" | "shift_note" | "qa_checklist";
  filePath: string;
  relatedBatchId?: string;
  relatedDeviationId?: string;
  relatedEquipmentIds?: string[];
  sections: DocumentSection[];
  tags: string[];
}

export interface Relationship {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationshipType: string;
}

export interface TimeWindow {
  start: string;
  end: string;
}

export interface EventFilters {
  category?: EventCategory;
  equipmentId?: string;
  timeWindow?: TimeWindow;
}

export interface DocumentFilters {
  documentType?: Document["documentType"];
  batchId?: string;
  equipmentId?: string;
}

export interface DataBundle {
  site: Site;
  areas: Area[];
  assets: Asset[];
  equipment: Equipment[];
  batches: Batch[];
  deviations: Deviation[];
  events: ProcessEvent[];
  signals: TimeSeriesSignal[];
  timeSeries: TimeSeriesSeries[];
  anomalyWindows: AnomalyWindow[];
  workOrders: WorkOrder[];
  operatorNotes: OperatorNote[];
  documents: Document[];
  relationships: Relationship[];
}
