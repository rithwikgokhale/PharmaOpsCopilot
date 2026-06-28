/**
 * Deterministic agent tools. The backend calls these to assemble a structured
 * evidence packet BEFORE any LLM reasoning — the model never queries raw data
 * blindly. Mirrors the tool list a future Atlas AI agent would expose
 * (queryKnowledgeGraph, queryTimeSeriesDatapoints, askDocument, etc.).
 */

import { getData } from "../data/localDataAccess";
import { retrieveDocuments } from "../retrieval/simpleRetriever";
import type {
  AnomalyWindow,
  Batch,
  Deviation,
  Equipment,
  OperatorNote,
  ProcessEvent,
  TimeWindow,
  WorkOrder,
} from "../../app/src/types/domain";

export interface TimeSeriesStat {
  signalId: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  mean: number;
  target: number;
  rangeMin: number;
  rangeMax: number;
  excursionCount: number;
}

export function getBatchSummary(batchId: string): Batch | undefined {
  return getData().batches.find((b) => b.id === batchId);
}

export function getEvents(batchId: string, timeWindow?: TimeWindow): ProcessEvent[] {
  const events = getData().events.filter((e) => e.batchId === batchId);
  const filtered = timeWindow
    ? events.filter((e) => e.timestamp >= timeWindow.start && e.timestamp <= timeWindow.end)
    : events;
  return filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getDeviation(batchId: string): Deviation | undefined {
  return getData().deviations.find((d) => d.batchId === batchId);
}

export function getTimeSeriesStats(batchId: string, signalIds?: string[]): TimeSeriesStat[] {
  const { timeSeries, signals } = getData();
  const series = timeSeries.filter(
    (ts) => ts.batchId === batchId && (!signalIds || signalIds.includes(ts.signalId))
  );

  return series.map((s) => {
    const signal = signals.find((sig) => sig.id === s.signalId)!;
    const values = s.points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const excursionCount = values.filter(
      (v) => v < signal.range.min || v > signal.range.max
    ).length;
    return {
      signalId: s.signalId,
      name: signal.name,
      unit: signal.unit,
      min: round(min),
      max: round(max),
      mean: round(mean),
      target: signal.range.target,
      rangeMin: signal.range.min,
      rangeMax: signal.range.max,
      excursionCount,
    };
  });
}

export function detectAnomalies(batchId: string): AnomalyWindow[] {
  return getData().anomalyWindows.filter((a) => a.batchId === batchId);
}

export function getRelatedWorkOrders(batchId: string): WorkOrder[] {
  const data = getData();
  const batch = data.batches.find((b) => b.id === batchId);
  if (!batch) return [];

  // Equipment associated with the batch's primary asset + deviation equipment
  const deviation = data.deviations.find((d) => d.batchId === batchId);
  const equipmentIds = new Set<string>([batch.primaryEquipmentId]);
  data.equipment
    .filter((e) => e.assetId === batch.primaryAssetId)
    .forEach((e) => equipmentIds.add(e.id));
  deviation?.equipmentIds.forEach((id) => equipmentIds.add(id));

  // Include CIP-related equipment via relationships (supports_cleaning)
  data.relationships
    .filter((r) => r.relationshipType === "supports_cleaning")
    .forEach((r) => equipmentIds.add(r.sourceId));

  return data.workOrders.filter((wo) => equipmentIds.has(wo.equipmentId));
}

export function getOperatorNotes(batchId: string): OperatorNote[] {
  return getData()
    .operatorNotes.filter((n) => n.batchId === batchId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function retrieveRelevantDocs(
  query: string,
  batchId: string,
  equipmentIds: string[]
) {
  return retrieveDocuments(query, { batchId, equipmentIds, topK: 5 });
}

export interface DataQualityFlag {
  id: string;
  category:
    | "missing_value"
    | "stale_data"
    | "calibration_due"
    | "sensor_reliability"
    | "incomplete_note"
    | "qa_pending";
  message: string;
  severity: "info" | "warning";
  evidenceIds: string[];
}

export function assessDataQuality(batchId: string): DataQualityFlag[] {
  const data = getData();
  const flags: DataQualityFlag[] = [];
  const batch = data.batches.find((b) => b.id === batchId);
  if (!batch) return flags;

  const deviation = data.deviations.find((d) => d.batchId === batchId);
  const notes = getOperatorNotes(batchId);
  const workOrders = getRelatedWorkOrders(batchId);

  // Calibration due warning (e.g. pH probe)
  const calWo = workOrders.find((wo) => /calibrat/i.test(wo.title));
  if (calWo) {
    flags.push({
      id: "DQ-CAL",
      category: "calibration_due",
      message: `Calibration not verified: ${calWo.title} (${calWo.id}). Confirm ${calWo.equipmentId} calibration status before relying on its readings.`,
      severity: "warning",
      evidenceIds: [calWo.id],
    });
  }

  // Sensor reliability — any open/scheduled WO on a sensor or CIP sensor
  const sensorWo = workOrders.find((wo) => /sensor|conductivity|probe/i.test(wo.title));
  if (sensorWo) {
    flags.push({
      id: "DQ-SENSOR",
      category: "sensor_reliability",
      message: `Confirm sensor reliability: ${sensorWo.title} (${sensorWo.id}) is open. Readings from ${sensorWo.equipmentId} may be questionable.`,
      severity: "warning",
      evidenceIds: [sensorWo.id],
    });
  }

  // Incomplete operator notes
  const incomplete = notes.filter((n) => n.completeness !== "complete");
  for (const note of incomplete) {
    flags.push({
      id: `DQ-NOTE-${note.id}`,
      category: "incomplete_note",
      message: `Manual intervention details incomplete in operator note ${note.id} (${note.author}). Recommend completing the record.`,
      severity: "warning",
      evidenceIds: [note.id],
    });
  }

  // QA disposition pending
  if (deviation && deviation.status !== "closed") {
    flags.push({
      id: "DQ-QA",
      category: "qa_pending",
      message: `QA disposition pending: deviation ${deviation.id} is ${deviation.status.replace("_", " ")}. Batch disposition not complete.`,
      severity: "warning",
      evidenceIds: [deviation.id],
    });
  }

  return flags;
}

export function getRelatedEquipment(batchId: string): Equipment[] {
  const data = getData();
  const batch = data.batches.find((b) => b.id === batchId);
  if (!batch) return [];
  const deviation = data.deviations.find((d) => d.batchId === batchId);
  const ids = new Set<string>(deviation?.equipmentIds ?? []);
  data.equipment
    .filter((e) => e.assetId === batch.primaryAssetId)
    .forEach((e) => ids.add(e.id));
  return data.equipment.filter((e) => ids.has(e.id));
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
