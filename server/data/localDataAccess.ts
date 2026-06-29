import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type {
  AnomalyWindow,
  Area,
  Asset,
  Batch,
  Deviation,
  Document,
  Equipment,
  OperatorNote,
  ProcessEvent,
  Relationship,
  Site,
  TimeSeriesSeries,
  TimeSeriesSignal,
  WorkOrder,
} from "../../app/src/types/domain";

const DATA_DIR = join(process.cwd(), "data", "generated");

export class DataLoadError extends Error {
  constructor(filename: string, cause?: unknown) {
    const path = join(DATA_DIR, filename);
    const hint = "Run `npm run generate-data` first.";
    if (!existsSync(path)) {
      super(`Data file ${filename} not found in data/generated. ${hint}`);
    } else {
      super(`Failed to load ${filename} from data/generated. ${hint}`, { cause });
    }
    this.name = "DataLoadError";
  }
}

function load<T>(filename: string): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) {
    throw new DataLoadError(filename);
  }
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new DataLoadError(filename, err);
  }
}

export interface ServerDataBundle {
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

let cache: ServerDataBundle | null = null;
let loadError: DataLoadError | null = null;

export function getDataLoadError(): DataLoadError | null {
  return loadError;
}

export function isDataReady(): boolean {
  if (cache) return true;
  try {
    getData();
    return true;
  } catch {
    return false;
  }
}

export function getData(): ServerDataBundle {
  if (cache) return cache;
  try {
    cache = {
      site: load<Site>("site.json"),
      areas: load<Area[]>("areas.json"),
      assets: load<Asset[]>("assets.json"),
      equipment: load<Equipment[]>("equipment.json"),
      batches: load<Batch[]>("batches.json"),
      deviations: load<Deviation[]>("deviations.json"),
      events: load<ProcessEvent[]>("events.json"),
      signals: load<TimeSeriesSignal[]>("signals.json"),
      timeSeries: load<TimeSeriesSeries[]>("timeSeries.json"),
      anomalyWindows: load<AnomalyWindow[]>("anomalyWindows.json"),
      workOrders: load<WorkOrder[]>("workOrders.json"),
      operatorNotes: load<OperatorNote[]>("operatorNotes.json"),
      documents: load<Document[]>("documents.json"),
      relationships: load<Relationship[]>("relationships.json"),
    };
    loadError = null;
    return cache;
  } catch (err) {
    if (err instanceof DataLoadError) {
      loadError = err;
      throw err;
    }
    const wrapped = new DataLoadError("data bundle", err);
    loadError = wrapped;
    throw wrapped;
  }
}

export function reloadData(): void {
  cache = null;
  loadError = null;
  getData();
}
