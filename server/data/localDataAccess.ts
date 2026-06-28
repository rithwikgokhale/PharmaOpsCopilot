import { readFileSync } from "fs";
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

function load<T>(filename: string): T {
  const raw = readFileSync(join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
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

export function getData(): ServerDataBundle {
  if (cache) return cache;
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
  return cache;
}

export function reloadData(): void {
  cache = null;
  getData();
}
