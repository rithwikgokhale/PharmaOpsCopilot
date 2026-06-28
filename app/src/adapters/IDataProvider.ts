import type {
  Asset,
  Batch,
  DataBundle,
  Document,
  DocumentFilters,
  Equipment,
  EventFilters,
  ProcessEvent,
  Relationship,
  TimeSeriesPoint,
  TimeWindow,
  WorkOrder,
} from "../types/domain";

export interface IDataProvider {
  initialize(): Promise<void>;
  isReady(): boolean;

  listAssets(): Promise<Asset[]>;
  getAsset(assetId: string): Promise<Asset | undefined>;

  listEquipment(assetId?: string): Promise<Equipment[]>;
  getEquipment(equipmentId: string): Promise<Equipment | undefined>;

  listBatches(): Promise<Batch[]>;
  getBatch(batchId: string): Promise<Batch | undefined>;

  getTimeSeries(
    batchId: string,
    signalIds: string[],
    timeWindow?: TimeWindow
  ): Promise<Record<string, TimeSeriesPoint[]>>;

  listEvents(batchId: string, filters?: EventFilters): Promise<ProcessEvent[]>;

  listWorkOrders(equipmentOrAssetId?: string): Promise<WorkOrder[]>;

  listDocuments(filters?: DocumentFilters): Promise<Document[]>;
  getDocument(documentId: string): Promise<Document | undefined>;
  searchDocuments(query: string): Promise<Document[]>;

  getRelationships(entityId: string): Promise<Relationship[]>;

  getAnomalyWindows(batchId: string): Promise<DataBundle["anomalyWindows"]>;
  getDeviations(batchId?: string): Promise<DataBundle["deviations"]>;
  getOperatorNotes(batchId: string): Promise<DataBundle["operatorNotes"]>;
  getSignals(equipmentId?: string): Promise<DataBundle["signals"]>;
}
