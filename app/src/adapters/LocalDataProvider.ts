import type { IDataProvider } from "./IDataProvider";
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

const DATA_BASE = "/data/generated";

async function fetchJson<T>(filename: string): Promise<T> {
  const res = await fetch(`${DATA_BASE}/${filename}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${filename}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function inTimeWindow(timestamp: string, window?: TimeWindow): boolean {
  if (!window) return true;
  return timestamp >= window.start && timestamp <= window.end;
}

export class LocalDataProvider implements IDataProvider {
  private bundle: DataBundle | null = null;

  async initialize(): Promise<void> {
    const [
      site,
      areas,
      assets,
      equipment,
      batches,
      deviations,
      events,
      signals,
      timeSeries,
      anomalyWindows,
      workOrders,
      operatorNotes,
      documents,
      relationships,
    ] = await Promise.all([
      fetchJson<DataBundle["site"]>("site.json"),
      fetchJson<DataBundle["areas"]>("areas.json"),
      fetchJson<DataBundle["assets"]>("assets.json"),
      fetchJson<DataBundle["equipment"]>("equipment.json"),
      fetchJson<DataBundle["batches"]>("batches.json"),
      fetchJson<DataBundle["deviations"]>("deviations.json"),
      fetchJson<DataBundle["events"]>("events.json"),
      fetchJson<DataBundle["signals"]>("signals.json"),
      fetchJson<DataBundle["timeSeries"]>("timeSeries.json"),
      fetchJson<DataBundle["anomalyWindows"]>("anomalyWindows.json"),
      fetchJson<DataBundle["workOrders"]>("workOrders.json"),
      fetchJson<DataBundle["operatorNotes"]>("operatorNotes.json"),
      fetchJson<DataBundle["documents"]>("documents.json"),
      fetchJson<DataBundle["relationships"]>("relationships.json"),
    ]);

    this.bundle = {
      site,
      areas,
      assets,
      equipment,
      batches,
      deviations,
      events,
      signals,
      timeSeries,
      anomalyWindows,
      workOrders,
      operatorNotes,
      documents,
      relationships,
    };
  }

  isReady(): boolean {
    return this.bundle !== null;
  }

  private requireBundle(): DataBundle {
    if (!this.bundle) {
      throw new Error("LocalDataProvider not initialized. Call initialize() first.");
    }
    return this.bundle;
  }

  async listAssets(): Promise<Asset[]> {
    return this.requireBundle().assets;
  }

  async getAsset(assetId: string): Promise<Asset | undefined> {
    return this.requireBundle().assets.find((a) => a.id === assetId);
  }

  async listEquipment(assetId?: string): Promise<Equipment[]> {
    const equipment = this.requireBundle().equipment;
    if (!assetId) return equipment;
    return equipment.filter((e) => e.assetId === assetId);
  }

  async getEquipment(equipmentId: string): Promise<Equipment | undefined> {
    return this.requireBundle().equipment.find((e) => e.id === equipmentId);
  }

  async listBatches(): Promise<Batch[]> {
    return this.requireBundle().batches;
  }

  async getBatch(batchId: string): Promise<Batch | undefined> {
    return this.requireBundle().batches.find((b) => b.id === batchId);
  }

  async getTimeSeries(
    batchId: string,
    signalIds: string[],
    timeWindow?: TimeWindow
  ): Promise<Record<string, TimeSeriesPoint[]>> {
    const bundle = this.requireBundle();
    const result: Record<string, TimeSeriesPoint[]> = {};

    for (const signalId of signalIds) {
      const series = bundle.timeSeries.find(
        (ts) => ts.batchId === batchId && ts.signalId === signalId
      );
      if (!series) {
        result[signalId] = [];
        continue;
      }
      result[signalId] = series.points.filter((p) =>
        inTimeWindow(p.timestamp, timeWindow)
      );
    }

    return result;
  }

  async listEvents(
    batchId: string,
    filters?: EventFilters
  ): Promise<ProcessEvent[]> {
    let events = this.requireBundle().events.filter((e) => e.batchId === batchId);

    if (filters?.category) {
      events = events.filter((e) => e.category === filters.category);
    }
    if (filters?.equipmentId) {
      events = events.filter((e) => e.equipmentId === filters.equipmentId);
    }
    if (filters?.timeWindow) {
      events = events.filter((e) =>
        inTimeWindow(e.timestamp, filters.timeWindow)
      );
    }

    return events.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async listWorkOrders(equipmentOrAssetId?: string): Promise<WorkOrder[]> {
    const bundle = this.requireBundle();
    if (!equipmentOrAssetId) return bundle.workOrders;

    const equipmentIds = new Set(
      bundle.equipment
        .filter(
          (e) =>
            e.id === equipmentOrAssetId || e.assetId === equipmentOrAssetId
        )
        .map((e) => e.id)
    );

    return bundle.workOrders.filter((wo) => equipmentIds.has(wo.equipmentId));
  }

  async listDocuments(filters?: DocumentFilters): Promise<Document[]> {
    let docs = this.requireBundle().documents;

    if (filters?.documentType) {
      docs = docs.filter((d) => d.documentType === filters.documentType);
    }
    if (filters?.batchId) {
      docs = docs.filter((d) => d.relatedBatchId === filters.batchId);
    }
    if (filters?.equipmentId) {
      docs = docs.filter((d) =>
        d.relatedEquipmentIds?.includes(filters.equipmentId!)
      );
    }

    return docs;
  }

  async getDocument(documentId: string): Promise<Document | undefined> {
    return this.requireBundle().documents.find((d) => d.id === documentId);
  }

  async searchDocuments(query: string): Promise<Document[]> {
    const q = query.toLowerCase();
    return this.requireBundle().documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q)) ||
        doc.sections.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.content.toLowerCase().includes(q)
        )
    );
  }

  async getRelationships(entityId: string): Promise<Relationship[]> {
    const rels = this.requireBundle().relationships;
    return rels.filter(
      (r) => r.sourceId === entityId || r.targetId === entityId
    );
  }

  async getAnomalyWindows(batchId: string) {
    return this.requireBundle().anomalyWindows.filter(
      (a) => a.batchId === batchId
    );
  }

  async getDeviations(batchId?: string) {
    const deviations = this.requireBundle().deviations;
    if (!batchId) return deviations;
    return deviations.filter((d) => d.batchId === batchId);
  }

  async getOperatorNotes(batchId: string) {
    return this.requireBundle().operatorNotes.filter(
      (n) => n.batchId === batchId
    );
  }

  async getSignals(equipmentId?: string) {
    const signals = this.requireBundle().signals;
    if (!equipmentId) return signals;
    return signals.filter((s) => s.equipmentId === equipmentId);
  }
}

export const localDataProvider = new LocalDataProvider();
