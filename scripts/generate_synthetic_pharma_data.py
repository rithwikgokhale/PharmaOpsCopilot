#!/usr/bin/env python3
"""Generate synthetic pharma batch data for PharmaOps Copilot prototype."""

from __future__ import annotations

import json
import math
import random
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "generated"

# B-104 anchor date
B104_DATE = datetime(2025, 6, 15)

SIGNAL_RANGES = {
    "BIO-101.temperature_c": {"target": 37.0, "min": 36.5, "max": 37.5, "unit": "°C"},
    "BIO-101.ph": {"target": 7.10, "min": 6.95, "max": 7.25, "unit": "pH"},
    "BIO-101.agitation_rpm": {"target": 180, "min": 170, "max": 190, "unit": "rpm"},
    "BIO-101.pressure_bar": {"target": 1.2, "min": 1.0, "max": 1.4, "unit": "bar"},
    "BIO-101.dissolved_oxygen_pct": {"target": 50, "min": 40, "max": 60, "unit": "%"},
    "CIP-201.conductivity_ms_cm": {"target": 0.05, "min": 0.0, "max": 0.10, "unit": "mS/cm"},
    "CIP-201.return_temperature_c": {"target": 75.0, "min": 70.0, "max": 80.0, "unit": "°C"},
    "PUMP-205.flow_lpm": {"target": 12.0, "min": 10.0, "max": 14.0, "unit": "L/min"},
}

SIGNAL_META = [
    ("SIG-TEMP-101", "BIO-101", "BIO-101.temperature_c", "Temperature"),
    ("SIG-PH-101", "BIO-101", "BIO-101.ph", "pH"),
    ("SIG-AG-101", "BIO-101", "BIO-101.agitation_rpm", "Agitation"),
    ("SIG-PRES-101", "BIO-101", "BIO-101.pressure_bar", "Pressure"),
    ("SIG-DO-101", "BIO-101", "BIO-101.dissolved_oxygen_pct", "Dissolved Oxygen"),
    ("SIG-COND-201", "CIP-201", "CIP-201.conductivity_ms_cm", "CIP Conductivity"),
    ("SIG-RT-201", "CIP-201", "CIP-201.return_temperature_c", "CIP Return Temp"),
    ("SIG-FLOW-205", "PUMP-205", "PUMP-205.flow_lpm", "Transfer Flow"),
]


def ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def write_json(name: str, data: object) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"  wrote {path.relative_to(ROOT)}")


def base_entities() -> dict:
    site = {
        "id": "SITE-CHI-PILOT",
        "name": "Chicago Pharma Pilot Plant",
        "description": "Synthetic pilot plant for batch deviation triage demo",
    }
    areas = [
        {"id": "AREA-FERM", "siteId": "SITE-CHI-PILOT", "name": "Fermentation Suite"},
        {"id": "AREA-UTIL", "siteId": "SITE-CHI-PILOT", "name": "Utilities/CIP Area"},
        {"id": "AREA-FILL", "siteId": "SITE-CHI-PILOT", "name": "Fill/Finish Line"},
        {"id": "AREA-QA", "siteId": "SITE-CHI-PILOT", "name": "QA Review"},
    ]
    assets = [
        {"id": "FERMENTATION-SUITE", "areaId": "AREA-FERM", "name": "Fermentation Suite", "assetType": "production_area"},
        {"id": "BIOREACTOR-TRAIN-A", "areaId": "AREA-FERM", "parentAssetId": "FERMENTATION-SUITE", "name": "Bioreactor Train A", "assetType": "train"},
        {"id": "CIP-SKID-201", "areaId": "AREA-UTIL", "name": "CIP Skid 201", "assetType": "utility"},
        {"id": "UTILITIES-WFI", "areaId": "AREA-UTIL", "name": "WFI Utilities", "assetType": "utility"},
        {"id": "FILL-LINE-401", "areaId": "AREA-FILL", "name": "Fill Line 401", "assetType": "packaging"},
    ]
    equipment = [
        {"id": "BIO-101", "assetId": "BIOREACTOR-TRAIN-A", "name": "Bioreactor", "tag": "BIO-101", "equipmentType": "bioreactor", "manufacturer": "SynthBio", "serialNumber": "SB-101-2022", "status": "operational"},
        {"id": "PH-101", "assetId": "BIOREACTOR-TRAIN-A", "name": "pH Probe", "tag": "PH-101", "equipmentType": "sensor", "manufacturer": "MeasureTech", "serialNumber": "MT-PH-8841", "status": "operational"},
        {"id": "TT-101", "assetId": "BIOREACTOR-TRAIN-A", "name": "Temperature Sensor", "tag": "TT-101", "equipmentType": "sensor", "status": "operational"},
        {"id": "AG-101", "assetId": "BIOREACTOR-TRAIN-A", "name": "Agitator", "tag": "AG-101", "equipmentType": "agitator", "status": "operational"},
        {"id": "CIP-201", "assetId": "CIP-SKID-201", "name": "CIP Skid", "tag": "CIP-201", "equipmentType": "cip_skid", "status": "operational"},
        {"id": "VLV-203", "assetId": "BIOREACTOR-TRAIN-A", "name": "Transfer Valve", "tag": "VLV-203", "equipmentType": "valve", "status": "operational"},
        {"id": "PUMP-205", "assetId": "BIOREACTOR-TRAIN-A", "name": "Transfer Pump", "tag": "PUMP-205", "equipmentType": "pump", "status": "operational"},
    ]
    return {"site": site, "areas": areas, "assets": assets, "equipment": equipment}


def batch_schedule() -> list[dict]:
    def day(offset: int) -> datetime:
        return B104_DATE + timedelta(days=offset)

    return [
        {"id": "B-101", "name": "Batch B-101", "productCode": "MAB-001", "status": "complete", "currentPhase": "complete", "plannedStart": ts(day(-4).replace(hour=8, minute=0)), "actualStart": ts(day(-4).replace(hour=8, minute=5)), "plannedEnd": ts(day(-4).replace(hour=20, minute=0)), "actualEnd": ts(day(-4).replace(hour=19, minute=50)), "primaryEquipmentId": "BIO-101", "primaryAssetId": "BIOREACTOR-TRAIN-A"},
        {"id": "B-102", "name": "Batch B-102", "productCode": "MAB-001", "status": "complete", "currentPhase": "complete", "plannedStart": ts(day(-2).replace(hour=8, minute=0)), "actualStart": ts(day(-2).replace(hour=8, minute=25)), "plannedEnd": ts(day(-2).replace(hour=20, minute=0)), "actualEnd": ts(day(-2).replace(hour=20, minute=40)), "primaryEquipmentId": "BIO-101", "primaryAssetId": "BIOREACTOR-TRAIN-A", "notes": "Minor delay at batch start"},
        {"id": "B-103", "name": "Batch B-103", "productCode": "MAB-001", "status": "complete", "currentPhase": "complete", "plannedStart": ts(day(-1).replace(hour=8, minute=0)), "actualStart": ts(day(-1).replace(hour=8, minute=0)), "plannedEnd": ts(day(-1).replace(hour=20, minute=0)), "actualEnd": ts(day(-1).replace(hour=19, minute=55)), "primaryEquipmentId": "BIO-101", "primaryAssetId": "BIOREACTOR-TRAIN-A"},
        {"id": "B-104", "name": "Batch B-104", "productCode": "MAB-001", "status": "deviation", "currentPhase": "fermentation", "plannedStart": ts(day(0).replace(hour=8, minute=0)), "actualStart": ts(day(0).replace(hour=8, minute=22)), "plannedEnd": ts(day(0).replace(hour=20, minute=0)), "primaryEquipmentId": "BIO-101", "primaryAssetId": "BIOREACTOR-TRAIN-A", "deviationId": "DEV-104", "notes": "Delayed start; temperature excursion and pH correction during fermentation"},
        {"id": "B-105", "name": "Batch B-105", "productCode": "MAB-001", "status": "planned", "currentPhase": "planned", "plannedStart": ts(day(1).replace(hour=8, minute=0)), "primaryEquipmentId": "BIO-101", "primaryAssetId": "BIOREACTOR-TRAIN-A"},
    ]


def b104_events() -> list[dict]:
    d = B104_DATE
    return [
        {"id": "EVT-B104-001", "batchId": "B-104", "timestamp": ts(d.replace(hour=7, minute=0)), "title": "CIP cycle started", "description": "Pre-batch CIP initiated on BIO-101 train", "category": "process", "equipmentId": "CIP-201", "assetId": "CIP-SKID-201", "severity": "info", "sourceSystem": "MES"},
        {"id": "EVT-B104-002", "batchId": "B-104", "timestamp": ts(d.replace(hour=7, minute=30)), "title": "CIP hold — conductivity threshold not met", "description": "Conductivity above rinse threshold; hold extended", "category": "process", "equipmentId": "CIP-201", "severity": "warning", "sourceSystem": "Historian"},
        {"id": "EVT-B104-003", "batchId": "B-104", "timestamp": ts(d.replace(hour=8, minute=5)), "title": "CIP cycle complete", "description": "Conductivity threshold achieved after extended hold", "category": "process", "equipmentId": "CIP-201", "severity": "info"},
        {"id": "EVT-B104-004", "batchId": "B-104", "timestamp": ts(d.replace(hour=8, minute=22)), "title": "Batch started", "description": "Fermentation phase initiated — 22 min late vs plan", "category": "process", "equipmentId": "BIO-101", "assetId": "BIOREACTOR-TRAIN-A", "severity": "info", "sourceSystem": "MES"},
        {"id": "EVT-B104-005", "batchId": "B-104", "timestamp": ts(d.replace(hour=9, minute=40)), "title": "pH drift detected", "description": "pH trending below target range", "category": "alarm", "equipmentId": "PH-101", "severity": "warning", "sourceSystem": "Historian"},
        {"id": "EVT-B104-006", "batchId": "B-104", "timestamp": ts(d.replace(hour=10, minute=5)), "title": "pH low alarm", "description": "pH below acceptable lower limit (6.95)", "category": "alarm", "equipmentId": "PH-101", "severity": "alarm", "sourceSystem": "Historian"},
        {"id": "EVT-B104-007", "batchId": "B-104", "timestamp": ts(d.replace(hour=10, minute=12)), "title": "Temperature excursion", "description": "Temperature above upper acceptable limit", "category": "alarm", "equipmentId": "TT-101", "severity": "alarm", "sourceSystem": "Historian"},
        {"id": "EVT-B104-008", "batchId": "B-104", "timestamp": ts(d.replace(hour=10, minute=14)), "title": "Agitator speed dip", "description": "Agitation briefly below minimum setpoint", "category": "alarm", "equipmentId": "AG-101", "severity": "warning"},
        {"id": "EVT-B104-009", "batchId": "B-104", "timestamp": ts(d.replace(hour=10, minute=18)), "title": "Operator buffer addition", "description": "Manual buffer added per SOP after pH alarm", "category": "operator_action", "equipmentId": "BIO-101", "severity": "info", "sourceSystem": "MES"},
        {"id": "EVT-B104-010", "batchId": "B-104", "timestamp": ts(d.replace(hour=10, minute=30)), "title": "Temperature returned to range", "description": "Temperature within acceptable limits", "category": "process", "equipmentId": "TT-101", "severity": "info"},
        {"id": "EVT-B104-011", "batchId": "B-104", "timestamp": ts(d.replace(hour=11, minute=15)), "title": "Deviation DEV-104 opened", "description": "Temperature excursion and delayed pH correction", "category": "quality", "equipmentId": "BIO-101", "severity": "alarm", "sourceSystem": "QMS"},
        {"id": "EVT-B104-012", "batchId": "B-104", "timestamp": ts(d.replace(hour=11, minute=20)), "title": "QA review pending", "description": "Batch record and deviation under QA review", "category": "quality", "severity": "warning", "sourceSystem": "QMS"},
    ]


def generic_batch_events(batch_id: str, start: datetime, normal: bool = True) -> list[dict]:
    events = [
        {"id": f"EVT-{batch_id}-001", "batchId": batch_id, "timestamp": ts(start - timedelta(hours=1)), "title": "CIP cycle complete", "category": "process", "equipmentId": "CIP-201", "severity": "info"},
        {"id": f"EVT-{batch_id}-002", "batchId": batch_id, "timestamp": ts(start), "title": "Batch started", "category": "process", "equipmentId": "BIO-101", "assetId": "BIOREACTOR-TRAIN-A", "severity": "info"},
        {"id": f"EVT-{batch_id}-003", "batchId": batch_id, "timestamp": ts(start + timedelta(hours=2)), "title": "Fermentation phase stable", "category": "process", "equipmentId": "BIO-101", "severity": "info"},
    ]
    if not normal:
        events.append({"id": f"EVT-{batch_id}-004", "batchId": batch_id, "timestamp": ts(start + timedelta(minutes=25)), "title": "Minor start delay logged", "category": "process", "equipmentId": "BIO-101", "severity": "warning"})
    events.append({"id": f"EVT-{batch_id}-END", "batchId": batch_id, "timestamp": ts(start + timedelta(hours=11)), "title": "Batch complete", "category": "process", "equipmentId": "BIO-101", "severity": "info"})
    return events


def all_events(batches: list[dict]) -> list[dict]:
    events = b104_events()
    for b in batches:
        if b["id"] == "B-104":
            continue
        if b["id"] == "B-105":
            continue
        start = datetime.fromisoformat(b.get("actualStart") or b["plannedStart"])
        events.extend(generic_batch_events(b["id"], start, normal=b["id"] != "B-102"))
    return events


def generate_signal_points(
    external_id: str,
    batch_id: str,
    start: datetime,
    duration_minutes: int,
    *,
    is_b104: bool = False,
) -> list[dict]:
    rng = SIGNAL_RANGES[external_id]
    target = rng["target"]
    points = []
    for minute in range(duration_minutes + 1):
        t = start + timedelta(minutes=minute)
        clock = t.time()
        value = target

        if external_id == "BIO-101.temperature_c":
            value = target + math.sin(minute / 30) * 0.08 + random.uniform(-0.03, 0.03)
            if is_b104 and t >= B104_DATE.replace(hour=10, minute=12) and t <= B104_DATE.replace(hour=10, minute=30):
                value = 37.8 + random.uniform(-0.05, 0.1)
        elif external_id == "BIO-101.ph":
            value = target + random.uniform(-0.02, 0.02)
            if is_b104 and t >= B104_DATE.replace(hour=9, minute=40):
                drift = (minute - (9 * 60 + 40 - start.hour * 60 - start.minute)) * 0.003
                value = max(6.85, target - 0.05 - drift * 0.01)
            if is_b104 and t >= B104_DATE.replace(hour=10, minute=18):
                value = min(7.15, value + 0.15)
        elif external_id == "BIO-101.agitation_rpm":
            value = target + random.uniform(-3, 3)
            if is_b104 and t >= B104_DATE.replace(hour=10, minute=14) and t <= B104_DATE.replace(hour=10, minute=20):
                value = 162 + random.uniform(-2, 2)
        elif external_id == "BIO-101.pressure_bar":
            value = target + random.uniform(-0.05, 0.05)
        elif external_id == "BIO-101.dissolved_oxygen_pct":
            value = target + random.uniform(-4, 4)
        elif external_id == "CIP-201.conductivity_ms_cm":
            value = 0.08 * math.exp(-minute / 15) + random.uniform(0, 0.01)
            if is_b104 and t >= B104_DATE.replace(hour=7, minute=30) and t <= B104_DATE.replace(hour=8, minute=5):
                value = 0.12 + random.uniform(0, 0.02)
        elif external_id == "CIP-201.return_temperature_c":
            value = 72 + min(minute, 20) * 0.15 + random.uniform(-0.5, 0.5)
        elif external_id == "PUMP-205.flow_lpm":
            value = target + random.uniform(-0.5, 0.5)

        points.append({"timestamp": ts(t), "value": round(value, 3)})

    return points


def all_time_series(batches: list[dict]) -> list[dict]:
    series = []
    for batch in batches:
        if batch["id"] == "B-105":
            continue
        is_b104 = batch["id"] == "B-104"
        if is_b104:
            start = B104_DATE.replace(hour=7, minute=0)
            duration = 270  # 07:00 - 11:30
        else:
            start = datetime.fromisoformat(batch.get("actualStart") or batch["plannedStart"]) - timedelta(hours=1)
            duration = 180

        for sig_id, equip_id, ext_id, _ in SIGNAL_META:
            if not is_b104 and ext_id.startswith("CIP-201") and batch["id"] != "B-104":
                if ext_id.startswith("CIP-201"):
                    continue
            if ext_id.startswith("CIP-201") and not is_b104:
                continue
            points = generate_signal_points(ext_id, batch["id"], start, duration, is_b104=is_b104)
            series.append({"signalId": sig_id, "batchId": batch["id"], "points": points})
    return series


def anomaly_windows() -> list[dict]:
    d = B104_DATE
    return [
        {"id": "ANOM-B104-CIP", "batchId": "B-104", "signalId": "SIG-COND-201", "start": ts(d.replace(hour=7, minute=30)), "end": ts(d.replace(hour=8, minute=5)), "label": "CIP conductivity delay", "severity": "warning"},
        {"id": "ANOM-B104-PH", "batchId": "B-104", "signalId": "SIG-PH-101", "start": ts(d.replace(hour=9, minute=40)), "end": ts(d.replace(hour=10, minute=18)), "label": "pH drift below target", "severity": "warning"},
        {"id": "ANOM-B104-TEMP", "batchId": "B-104", "signalId": "SIG-TEMP-101", "start": ts(d.replace(hour=10, minute=12)), "end": ts(d.replace(hour=10, minute=30)), "label": "Temperature excursion", "severity": "alarm"},
        {"id": "ANOM-B104-AG", "batchId": "B-104", "signalId": "SIG-AG-101", "start": ts(d.replace(hour=10, minute=14)), "end": ts(d.replace(hour=10, minute=20)), "label": "Agitator speed dip", "severity": "warning"},
    ]


def work_orders() -> list[dict]:
    return [
        {"id": "WO-731", "title": "pH probe calibration due", "description": "PH-101 calibration due within 7 days per PM schedule", "status": "scheduled", "priority": "medium", "equipmentId": "PH-101", "dueDate": "2025-06-22", "createdAt": "2025-06-01T08:00:00", "sourceSystem": "CMMS"},
        {"id": "WO-744", "title": "Transfer valve inspection", "description": "Inspect VLV-203 for sticking; lubricate stem per PM", "status": "open", "priority": "high", "equipmentId": "VLV-203", "dueDate": "2025-06-18", "createdAt": "2025-06-10T10:00:00", "sourceSystem": "CMMS"},
        {"id": "WO-752", "title": "CIP conductivity sensor check", "description": "Verify CIP-201 conductivity sensor response time", "status": "open", "priority": "medium", "equipmentId": "CIP-201", "dueDate": "2025-06-20", "createdAt": "2025-06-12T14:00:00", "sourceSystem": "CMMS"},
    ]


def deviations() -> list[dict]:
    d = B104_DATE
    return [
        {
            "id": "DEV-104",
            "batchId": "B-104",
            "title": "Temperature excursion and delayed pH correction",
            "description": "During fermentation, temperature exceeded upper limit for 18 minutes. pH drifted below range; manual buffer addition required.",
            "status": "under_review",
            "severity": "major",
            "openedAt": ts(d.replace(hour=11, minute=15)),
            "equipmentIds": ["BIO-101", "PH-101", "TT-101", "AG-101"],
            "relatedEventIds": ["EVT-B104-005", "EVT-B104-006", "EVT-B104-007", "EVT-B104-008", "EVT-B104-009", "EVT-B104-011"],
        }
    ]


def operator_notes() -> list[dict]:
    d = B104_DATE
    return [
        {"id": "NOTE-B104-001", "batchId": "B-104", "timestamp": ts(d.replace(hour=10, minute=20)), "author": "J. Martinez", "content": "Manual valve position checked on VLV-203 — slight sticking observed during transfer line check.", "equipmentId": "VLV-203", "completeness": "partial"},
        {"id": "NOTE-B104-002", "batchId": "B-104", "timestamp": ts(d.replace(hour=10, minute=19)), "author": "J. Martinez", "content": "Added buffer per SOP-BIO-OPS section 4.2 after pH low alarm. Volume logged in batch record.", "equipmentId": "BIO-101", "completeness": "complete"},
        {"id": "NOTE-B104-003", "batchId": "B-104", "timestamp": ts(d.replace(hour=8, minute=25)), "author": "S. Chen", "content": "Batch start delayed due to extended CIP hold. Conductivity finally met threshold at 08:05.", "equipmentId": "CIP-201", "completeness": "complete"},
    ]


def load_doc_sections() -> list[dict]:
    docs_dir = ROOT / "data" / "documents"
    documents = []

    doc_defs = [
        ("DOC-SOP-DEV", "SOP: Batch Deviation Procedure", "sop", None, "DEV-104", [], "SOP-BATCH-DEVIATION.md", ["deviation", "qa", "escalation"]),
        ("DOC-SOP-CIP", "SOP: CIP Cleaning Procedure", "sop", None, None, ["CIP-201"], "SOP-CIP-CLEANING.md", ["cip", "cleaning"]),
        ("DOC-SOP-BIO", "SOP: Bioreactor Operations", "sop", None, None, ["BIO-101"], "SOP-BIOREACTOR-OPERATIONS.md", ["bioreactor", "fermentation"]),
        ("DOC-BMR-B104", "Batch Record Excerpt: B-104", "batch_record", "B-104", "DEV-104", ["BIO-101"], "BATCH-RECORD-B-104.md", ["batch", "B-104"]),
        ("DOC-SHIFT-B104", "Shift Handover: B-104", "shift_note", "B-104", "DEV-104", ["BIO-101", "VLV-203"], "SHIFT-HANDOVER-B-104.md", ["shift", "handover"]),
    ]

    for doc_id, title, doc_type, batch_id, dev_id, equip_ids, filename, tags in doc_defs:
        path = docs_dir / filename
        sections = []
        if path.exists():
            content = path.read_text(encoding="utf-8")
            current_id = None
            current_title = None
            current_lines: list[str] = []
            for line in content.splitlines():
                if line.startswith("## "):
                    if current_id:
                        sections.append({"id": current_id, "title": current_title or "", "content": "\n".join(current_lines).strip()})
                    header = line[3:].strip()
                    if " — " in header:
                        current_id, current_title = header.split(" — ", 1)
                    else:
                        current_id = header.replace(" ", "-").upper()[:20]
                        current_title = header
                    current_lines = []
                elif current_id:
                    current_lines.append(line)
            if current_id:
                sections.append({"id": current_id, "title": current_title or "", "content": "\n".join(current_lines).strip()})
        documents.append({
            "id": doc_id,
            "title": title,
            "documentType": doc_type,
            "filePath": f"data/documents/{filename}",
            "relatedBatchId": batch_id,
            "relatedDeviationId": dev_id,
            "relatedEquipmentIds": equip_ids or None,
            "sections": sections,
            "tags": tags,
        })
    return documents


def relationships() -> list[dict]:
    rels = [
        ("REL-001", "batch", "B-104", "equipment", "BIO-101", "uses"),
        ("REL-002", "equipment", "BIO-101", "equipment", "PH-101", "has_component"),
        ("REL-003", "equipment", "BIO-101", "equipment", "TT-101", "has_component"),
        ("REL-004", "equipment", "BIO-101", "equipment", "AG-101", "has_component"),
        ("REL-005", "equipment", "CIP-201", "equipment", "BIO-101", "supports_cleaning"),
        ("REL-006", "workOrder", "WO-731", "equipment", "PH-101", "maintains"),
        ("REL-007", "workOrder", "WO-744", "equipment", "VLV-203", "maintains"),
        ("REL-008", "workOrder", "WO-752", "equipment", "CIP-201", "maintains"),
        ("REL-009", "deviation", "DEV-104", "batch", "B-104", "affects"),
        ("REL-010", "deviation", "DEV-104", "equipment", "BIO-101", "affects"),
        ("REL-011", "document", "DOC-SOP-DEV", "deviation", "DEV-104", "references"),
        ("REL-012", "document", "DOC-SHIFT-B104", "batch", "B-104", "references"),
    ]
    return [{"id": r[0], "sourceType": r[1], "sourceId": r[2], "targetType": r[3], "targetId": r[4], "relationshipType": r[5]} for r in rels]


def signals() -> list[dict]:
    result = []
    for sig_id, equip_id, ext_id, name in SIGNAL_META:
        rng = SIGNAL_RANGES[ext_id]
        result.append({
            "id": sig_id,
            "equipmentId": equip_id,
            "name": name,
            "externalId": ext_id,
            "unit": rng["unit"],
            "range": {"target": rng["target"], "min": rng["min"], "max": rng["max"], "unit": rng["unit"]},
        })
    return result


def main() -> None:
    print("Generating synthetic pharma data...")
    entities = base_entities()
    batches = batch_schedule()

    write_json("site.json", entities["site"])
    write_json("areas.json", entities["areas"])
    write_json("assets.json", entities["assets"])
    write_json("equipment.json", entities["equipment"])
    write_json("batches.json", batches)
    write_json("deviations.json", deviations())
    write_json("events.json", all_events(batches))
    write_json("signals.json", signals())
    write_json("timeSeries.json", all_time_series(batches))
    write_json("anomalyWindows.json", anomaly_windows())
    write_json("workOrders.json", work_orders())
    write_json("operatorNotes.json", operator_notes())
    write_json("relationships.json", relationships())
    write_json("documents.json", load_doc_sections())
    print("Done.")


if __name__ == "__main__":
    main()
