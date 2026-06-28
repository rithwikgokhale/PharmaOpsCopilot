/**
 * Builds a structured evidence packet for a batch. This is the heart of the
 * grounding strategy: deterministic tools gather all facts and citations first,
 * then the LLM reasons ONLY over this packet. Evidence IDs come from data, never
 * from the model — so citations cannot be hallucinated.
 */

import {
  assessDataQuality,
  detectAnomalies,
  getBatchSummary,
  getDeviation,
  getEvents,
  getOperatorNotes,
  getRelatedEquipment,
  getRelatedWorkOrders,
  getTimeSeriesStats,
  retrieveRelevantDocs,
  type DataQualityFlag,
  type TimeSeriesStat,
} from "./tools";
import type {
  AnomalyWindow,
  Batch,
  Deviation,
  Equipment,
  OperatorNote,
  ProcessEvent,
  WorkOrder,
} from "../../app/src/types/domain";
import type { EvidenceRef } from "../../app/src/types/agent";

export interface EvidencePacket {
  batch: Batch;
  deviation?: Deviation;
  events: ProcessEvent[];
  anomalies: AnomalyWindow[];
  timeSeriesStats: TimeSeriesStat[];
  workOrders: WorkOrder[];
  operatorNotes: OperatorNote[];
  relatedEquipment: Equipment[];
  docHits: { sectionId: string; documentTitle: string; title: string; content: string }[];
  dataQuality: DataQualityFlag[];
  evidence: EvidenceRef[];
}

export function buildEvidencePacket(batchId: string, question: string): EvidencePacket | null {
  const batch = getBatchSummary(batchId);
  if (!batch) return null;

  const deviation = getDeviation(batchId);
  const events = getEvents(batchId);
  const anomalies = detectAnomalies(batchId);
  const timeSeriesStats = getTimeSeriesStats(batchId);
  const workOrders = getRelatedWorkOrders(batchId);
  const operatorNotes = getOperatorNotes(batchId);
  const relatedEquipment = getRelatedEquipment(batchId);
  const equipmentIds = relatedEquipment.map((e) => e.id);
  const dataQuality = assessDataQuality(batchId);

  const docHits = retrieveRelevantDocs(question, batchId, equipmentIds).map((h) => ({
    sectionId: h.section.sectionId,
    documentTitle: h.section.documentTitle,
    title: h.section.title,
    content: h.section.content,
  }));

  const evidence = collectEvidence({
    events,
    anomalies,
    workOrders,
    operatorNotes,
    deviation,
    timeSeriesStats,
    docHits,
  });

  return {
    batch,
    deviation,
    events,
    anomalies,
    timeSeriesStats,
    workOrders,
    operatorNotes,
    relatedEquipment,
    docHits,
    dataQuality,
    evidence,
  };
}

function collectEvidence(parts: {
  events: ProcessEvent[];
  anomalies: AnomalyWindow[];
  workOrders: WorkOrder[];
  operatorNotes: OperatorNote[];
  deviation?: Deviation;
  timeSeriesStats: TimeSeriesStat[];
  docHits: { sectionId: string; documentTitle: string; title: string }[];
}): EvidenceRef[] {
  const refs: EvidenceRef[] = [];

  for (const e of parts.events) {
    refs.push({ id: e.id, type: "event", label: e.title, timestamp: e.timestamp, detail: e.description });
  }
  for (const a of parts.anomalies) {
    refs.push({ id: a.id, type: "anomaly", label: a.label, timestamp: a.start, detail: `${a.start} → ${a.end}` });
  }
  for (const wo of parts.workOrders) {
    refs.push({ id: wo.id, type: "workOrder", label: wo.title, detail: `${wo.status} · ${wo.equipmentId}` });
  }
  for (const n of parts.operatorNotes) {
    refs.push({ id: n.id, type: "operator_note", label: `Note by ${n.author}`, timestamp: n.timestamp, detail: n.content });
  }
  if (parts.deviation) {
    refs.push({ id: parts.deviation.id, type: "deviation", label: parts.deviation.title, timestamp: parts.deviation.openedAt });
  }
  for (const s of parts.timeSeriesStats) {
    refs.push({ id: s.signalId, type: "signal", label: `${s.name} (${s.unit})`, detail: `min ${s.min} / max ${s.max} / ${s.excursionCount} OOS pts` });
  }
  for (const d of parts.docHits) {
    refs.push({ id: d.sectionId, type: "document_section", label: `${d.title}`, detail: d.documentTitle });
  }

  return refs;
}

/** Compact, token-efficient serialization of the packet for the LLM prompt. */
export function serializePacketForPrompt(packet: EvidencePacket): string {
  const lines: string[] = [];
  lines.push(`BATCH: ${packet.batch.id} (${packet.batch.name}) — status ${packet.batch.status}, phase ${packet.batch.currentPhase}`);
  lines.push(`Planned start ${packet.batch.plannedStart}; actual start ${packet.batch.actualStart ?? "n/a"}`);
  if (packet.deviation) {
    lines.push(`DEVIATION ${packet.deviation.id}: ${packet.deviation.title} — ${packet.deviation.description} [status: ${packet.deviation.status}, severity: ${packet.deviation.severity}]`);
  }

  lines.push("\nEVENTS:");
  packet.events.forEach((e) =>
    lines.push(`- [${e.id}] ${e.timestamp} (${e.category}/${e.severity ?? "info"}) ${e.title}: ${e.description ?? ""}`)
  );

  lines.push("\nANOMALY WINDOWS:");
  packet.anomalies.forEach((a) =>
    lines.push(`- [${a.id}] ${a.label} ${a.start}→${a.end} (${a.severity})`)
  );

  lines.push("\nTIME-SERIES STATS:");
  packet.timeSeriesStats.forEach((s) =>
    lines.push(`- [${s.signalId}] ${s.name}: min ${s.min}, max ${s.max}, mean ${s.mean}, target ${s.target}, range ${s.rangeMin}-${s.rangeMax}, OOS points ${s.excursionCount}`)
  );

  lines.push("\nWORK ORDERS:");
  packet.workOrders.forEach((wo) =>
    lines.push(`- [${wo.id}] ${wo.title} (${wo.status}, ${wo.priority}) on ${wo.equipmentId}`)
  );

  lines.push("\nOPERATOR NOTES:");
  packet.operatorNotes.forEach((n) =>
    lines.push(`- [${n.id}] ${n.timestamp} ${n.author} (${n.completeness}): ${n.content}`)
  );

  lines.push("\nRELATED EQUIPMENT:");
  packet.relatedEquipment.forEach((e) =>
    lines.push(`- ${e.id} (${e.tag}) ${e.name} — ${e.equipmentType}`)
  );

  lines.push("\nRELEVANT DOCUMENT SECTIONS:");
  packet.docHits.forEach((d) =>
    lines.push(`- [${d.sectionId}] ${d.documentTitle} — ${d.title}: ${d.content}`)
  );

  lines.push("\nDATA QUALITY FLAGS:");
  packet.dataQuality.forEach((f) =>
    lines.push(`- [${f.id}] (${f.category}) ${f.message}`)
  );

  return lines.join("\n");
}
