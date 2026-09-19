#!/usr/bin/env python3
"""Generate synthetic pharma batch data for PharmaOps Copilot prototype.

This script produces the *source-system view* of the plant: siloed, messy files
under data/raw/ that look like exports from the systems a real site runs —

  IT  MES (batch records, batch events, electronic logbook)
  IT  CMMS (SAP-style equipment master + work orders)
  IT  QMS (deviation records, quality events, document register)
  OT  Historian (tag list, datapoints as UTC epoch ms, alarms, batch event frames)
  ET  Engineering register (asset hierarchy, equipment register, instrument index,
      operating limits)
      Analytics (anomaly-detection output)

The same underlying "truth" is written into every silo, but each system uses its
own identifiers, naming conventions, units, timestamp formats, and status
vocabularies — plus a few duplicates, gaps, and orphan records. Resolving that
into the unified model the dashboard and copilot consume is the job of
scripts/contextualize.py, which is what a CDF contextualization pipeline does
for real. Run both with `npm run generate-data`.
"""

from __future__ import annotations

import csv
import json
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"

# B-104 anchor date
B104_DATE = datetime(2025, 6, 15)

# Plant clocks (MES, CMMS, QMS) run in local time with no zone marker. The
# historian exports UTC epoch milliseconds. Chicago in June is UTC-05:00.
PLANT_UTC_OFFSET_HOURS = -5

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


def write_json(rel: str, data: object) -> None:
    path = RAW_DIR / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"  wrote {path.relative_to(ROOT)}")


def write_csv(rel: str, header: list[str], rows: list[list[object]]) -> None:
    path = RAW_DIR / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  wrote {path.relative_to(ROOT)} ({len(rows)} rows)")


# --- source-system formatting helpers -------------------------------------------

def mes_ts(iso: str | None) -> str:
    """MES exports DD-MON-YYYY HH:MM:SS in plant local time."""
    if not iso:
        return ""
    return datetime.fromisoformat(iso).strftime("%d-%b-%Y %H:%M:%S").upper()


def epoch_ms(iso: str) -> int:
    """Historian stores UTC epoch ms; convert from naive plant-local time."""
    local = datetime.fromisoformat(iso)
    utc = local - timedelta(hours=PLANT_UTC_OFFSET_HOURS)
    return int(utc.replace(tzinfo=timezone.utc).timestamp() * 1000)


def mes_batch_no(batch_id: str) -> str:
    """MES and QMS drop the hyphen: B-104 -> B104."""
    return batch_id.replace("-", "")


MES_STATUS = {"complete": "COMP", "deviation": "DEVN", "planned": "PLND", "running": "RUN", "delayed": "DLYD"}
MES_PHASE = {"complete": "COMP", "fermentation": "FERM", "planned": "PLND", "cip": "CIP", "inoculation": "INOC", "harvest": "HARV", "hold": "HOLD"}
MES_EVENT_TYPE = {"process": "PROC", "operator_action": "OPER", "quality": "QUAL", "alarm": "ALRM", "maintenance": "MAINT", "document": "DOC"}
MES_SEVERITY = {"info": "I", "warning": "W", "alarm": "A"}
# MES names units its own way.
MES_UNIT_ALIAS = {"BIO-101": "BR-101", "CIP-201": "CIP201", "TT-101": "BR-101-TT", "PH-101": "BR-101-PH", "AG-101": "BR-101-AGIT", "VLV-203": "VLV203", "PUMP-205": "PMP205"}
MES_COMPLETE_FLAG = {"complete": "Y", "partial": "P", "incomplete": "N"}

# Historian tag per instrument/loop. Units use historian spelling; the CIP
# return-temperature tag is configured in Fahrenheit.
HISTORIAN_TAGS = {
    "BIO-101.temperature_c": ("CHI.BR101.TT101.PV", "DEGC"),
    "BIO-101.ph": ("CHI.BR101.PH101.PV", "PH"),
    "BIO-101.agitation_rpm": ("CHI.BR101.AG101.SPD.PV", "RPM"),
    "BIO-101.pressure_bar": ("CHI.BR101.PT101.PV", "BARG"),
    "BIO-101.dissolved_oxygen_pct": ("CHI.BR101.DO101.PV", "PCT"),
    "CIP-201.conductivity_ms_cm": ("CHI.CIP201.CT201.PV", "MS/CM"),
    "CIP-201.return_temperature_c": ("CHI.CIP201.TT202.RET.PV", "DEGF"),
    "PUMP-205.flow_lpm": ("CHI.BR101.FT205.PV", "LPM"),
}
# Representative historian tag for equipment that raises alarms.
HISTORIAN_ALARM_TAG = {
    "PH-101": "CHI.BR101.PH101.PV",
    "TT-101": "CHI.BR101.TT101.PV",
    "AG-101": "CHI.BR101.AG101.SPD.PV",
    "CIP-201": "CHI.CIP201.CT201.PV",
    "BIO-101": "CHI.BR101.TT101.PV",
}
HISTORIAN_PRIORITY = {"alarm": 1, "warning": 2, "info": 3}

# CMMS (SAP-style) equipment numbers and functional locations. Note the stray
# space in the pH probe location and the "PMP" abbreviation for the pump — the
# kind of drift that accumulates in a real equipment master.
CMMS_EQUIPMENT = {
    "BIO-101": ("10004401", "CHI-FERM-TRA-BIO101"),
    "PH-101": ("10004402", "CHI-FERM-TRA-PH 101"),
    "TT-101": ("10004403", "CHI-FERM-TRA-TT101"),
    "AG-101": ("10004404", "CHI-FERM-TRA-AG101"),
    "CIP-201": ("10004410", "CHI-UTIL-CIP-CIP201"),
    "VLV-203": ("10004411", "CHI-FERM-TRA-VLV203"),
    "PUMP-205": ("10004412", "CHI-FERM-TRA-PMP205"),
}
CMMS_STATUS = {"scheduled": "CRTD", "open": "REL", "in_progress": "INPR", "closed": "TECO"}
CMMS_PRIORITY = {"high": "1", "medium": "2", "low": "3"}
QMS_SEVERITY = {"alarm": "High", "warning": "Medium", "info": "Low"}
QMS_CLASSIFICATION = {"minor": "Minor", "major": "Major", "critical": "Critical"}
QMS_STATE = {"open": "Open", "under_review": "Under Review", "closed": "Closed"}


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
    tag = batch_id.replace("-", "")
    events = [
        {"id": f"EVT-{tag}-001", "batchId": batch_id, "timestamp": ts(start - timedelta(hours=1)), "title": "CIP cycle complete", "category": "process", "equipmentId": "CIP-201", "severity": "info"},
        {"id": f"EVT-{tag}-002", "batchId": batch_id, "timestamp": ts(start), "title": "Batch started", "category": "process", "equipmentId": "BIO-101", "assetId": "BIOREACTOR-TRAIN-A", "severity": "info"},
        {"id": f"EVT-{tag}-003", "batchId": batch_id, "timestamp": ts(start + timedelta(hours=2)), "title": "Fermentation phase stable", "category": "process", "equipmentId": "BIO-101", "severity": "info"},
    ]
    if not normal:
        events.append({"id": f"EVT-{tag}-004", "batchId": batch_id, "timestamp": ts(start + timedelta(minutes=25)), "title": "Minor start delay logged", "category": "process", "equipmentId": "BIO-101", "severity": "warning"})
    events.append({"id": f"EVT-{tag}-END", "batchId": batch_id, "timestamp": ts(start + timedelta(hours=11)), "title": "Batch complete", "category": "process", "equipmentId": "BIO-101", "severity": "info"})
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


def document_register() -> list[dict]:
    """QMS document control register. Section parsing happens in contextualize."""
    return [
        {"doc_no": "DOC-SOP-DEV", "title": "SOP: Batch Deviation Procedure", "doc_type": "SOP", "file": "SOP-BATCH-DEVIATION.md", "batch_ref": None, "deviation_ref": "DEV-104", "equipment_refs": "", "keywords": "deviation; qa; escalation"},
        {"doc_no": "DOC-SOP-CIP", "title": "SOP: CIP Cleaning Procedure", "doc_type": "SOP", "file": "SOP-CIP-CLEANING.md", "batch_ref": None, "deviation_ref": None, "equipment_refs": "CIP-201", "keywords": "cip; cleaning"},
        {"doc_no": "DOC-SOP-BIO", "title": "SOP: Bioreactor Operations", "doc_type": "SOP", "file": "SOP-BIOREACTOR-OPERATIONS.md", "batch_ref": None, "deviation_ref": None, "equipment_refs": "BIO-101", "keywords": "bioreactor; fermentation"},
        {"doc_no": "DOC-BMR-B104", "title": "Batch Record Excerpt: B-104", "doc_type": "BMR", "file": "BATCH-RECORD-B-104.md", "batch_ref": "B104", "deviation_ref": "DEV-104", "equipment_refs": "BIO-101", "keywords": "batch; B-104"},
        {"doc_no": "DOC-SHIFT-B104", "title": "Shift Handover: B-104", "doc_type": "SHIFT", "file": "SHIFT-HANDOVER-B-104.md", "batch_ref": "B104", "deviation_ref": "DEV-104", "equipment_refs": "BIO-101; VLV-203", "keywords": "shift; handover"},
    ]


def with_source_systems(events: list[dict]) -> list[dict]:
    """Every event originates somewhere. Fill the few that were left blank."""
    default = {"alarm": "Historian", "process": "MES", "operator_action": "MES", "quality": "QMS", "maintenance": "CMMS", "document": "QMS"}
    for e in events:
        e.setdefault("sourceSystem", default[e["category"]])
    return events


# --- silo writers ---------------------------------------------------------------

def write_engineering_register(entities: dict) -> None:
    """ET: the engineering asset register and instrument index."""
    site, areas, assets, equipment = entities["site"], entities["areas"], entities["assets"], entities["equipment"]
    rows: list[list[object]] = [[site["id"], "", "SITE", site["name"], "site", site["description"]]]
    for a in areas:
        rows.append([a["id"], a["siteId"], "AREA", a["name"], "area", ""])
    for a in assets:
        rows.append([a["id"], a.get("parentAssetId") or a["areaId"], "ASSET", a["name"], a["assetType"], ""])
    write_csv("engineering/asset_register.csv", ["ASSET_ID", "PARENT_ID", "LEVEL", "NAME", "TYPE", "DESCRIPTION"], rows)

    parent_equip = {"PH-101": "BIO-101", "TT-101": "BIO-101", "AG-101": "BIO-101"}
    serves = {"CIP-201": "BIO-101"}
    rows = []
    for e in equipment:
        rows.append([e["tag"], e["name"], e["equipmentType"], e["assetId"], parent_equip.get(e["id"], ""), serves.get(e["id"], ""), e.get("manufacturer", ""), e.get("serialNumber", ""), e["status"].upper()])
    write_csv("engineering/equipment_register.csv", ["TAG", "NAME", "TYPE", "PARENT_ASSET", "PARENT_EQUIP", "SERVES", "MANUFACTURER", "SERIAL_NO", "STATUS"], rows)

    # Instrument index: the loop id, the P&ID instrument tag, the historian tag
    # the loop is *supposed* to be logged to, and the target CDF external id.
    # The pH loop's historian tag was entered with a hyphen the historian does
    # not use — a classic index/historian mismatch.
    instrument_tag = {"BIO-101.temperature_c": "TT-101", "BIO-101.ph": "PH-101", "BIO-101.agitation_rpm": "AG-101", "BIO-101.pressure_bar": "PT-101", "BIO-101.dissolved_oxygen_pct": "DO-101", "CIP-201.conductivity_ms_cm": "CT-201", "CIP-201.return_temperature_c": "TT-202", "PUMP-205.flow_lpm": "FT-205"}
    rows = []
    for sig_id, equip_id, ext_id, name in SIGNAL_META:
        hist_tag, _ = HISTORIAN_TAGS[ext_id]
        if ext_id == "BIO-101.ph":
            hist_tag = "CHI.BR101.PH-101.PV"
        rows.append([sig_id, instrument_tag[ext_id], name, equip_id, hist_tag, ext_id, SIGNAL_RANGES[ext_id]["unit"]])
    write_csv("engineering/instrument_index.csv", ["LOOP_ID", "INSTRUMENT_TAG", "SERVICE", "EQUIPMENT", "HISTORIAN_TAG", "CDF_EXTERNAL_ID", "ENG_UNITS"], rows)

    rows = []
    for sig_id, _, ext_id, _ in SIGNAL_META:
        r = SIGNAL_RANGES[ext_id]
        rows.append([sig_id, r["target"], r["min"], r["max"], r["unit"]])
    write_csv("engineering/operating_limits.csv", ["LOOP_ID", "TARGET", "LO", "HI", "UNITS"], rows)


def write_mes(batches: list[dict], events: list[dict], notes: list[dict]) -> None:
    """IT: MES batch records, batch events, and the electronic logbook."""
    rows: list[list[object]] = []
    for b in batches:
        rows.append([mes_batch_no(b["id"]), b["productCode"], MES_STATUS[b["status"]], MES_PHASE[b["currentPhase"]], MES_UNIT_ALIAS[b["primaryEquipmentId"]], mes_ts(b["plannedStart"]), mes_ts(b.get("actualStart")), mes_ts(b.get("plannedEnd")), mes_ts(b.get("actualEnd")), b.get("notes", "")])
    write_csv("mes/batch_records.csv", ["BATCH_NO", "PROD_CODE", "STATUS", "PHASE", "UNIT", "PLAN_START", "ACT_START", "PLAN_END", "ACT_END", "REMARKS"], rows)

    rows = []
    for e in events:
        if e["sourceSystem"] != "MES":
            continue
        # One event was left without a severity by the operator.
        sev = "" if e["id"] == "EVT-B104-003" else MES_SEVERITY[e.get("severity", "info")]
        row = [e["id"], mes_batch_no(e["batchId"]), mes_ts(e["timestamp"]), MES_EVENT_TYPE[e["category"]], MES_UNIT_ALIAS.get(e.get("equipmentId", ""), ""), sev, e["title"], e.get("description", "")]
        rows.append(row)
        # MES double-posted the batch-start event.
        if e["id"] == "EVT-B104-004":
            rows.append(list(row))
    write_csv("mes/batch_events.csv", ["EVENT_ID", "BATCH_NO", "EVENT_TS", "EVENT_TYPE", "UNIT", "SEVERITY", "EVENT_TEXT", "EVENT_DETAIL"], rows)

    rows = []
    for n in notes:
        num = n["batchId"].split("-")[1]
        seq = n["id"].rsplit("-", 1)[1]
        surname, initial = n["author"].split(". ")[1], n["author"].split(".")[0]
        # The first logbook entry only has a time — the operator did not fill the date.
        entry_ts = datetime.fromisoformat(n["timestamp"]).strftime("%H:%M") if n["id"] == "NOTE-B104-001" else mes_ts(n["timestamp"])
        rows.append([f"LOG-{num}-{seq}", mes_batch_no(n["batchId"]), entry_ts, f"{surname.upper()}, {initial}", MES_UNIT_ALIAS.get(n.get("equipmentId", ""), ""), MES_COMPLETE_FLAG[n["completeness"]], n["content"]])
    write_csv("mes/operator_log.csv", ["ENTRY_ID", "BATCH_NO", "ENTRY_TS", "OPERATOR", "EQUIP", "COMPLETE_FLAG", "ENTRY_TEXT"], rows)


def write_historian(batches: list[dict], events: list[dict], series: list[dict]) -> None:
    """OT: historian tag list, datapoints (UTC epoch ms), alarms, batch event frames."""
    rows: list[list[object]] = []
    for _, _, ext_id, name in SIGNAL_META:
        tag, units = HISTORIAN_TAGS[ext_id]
        rows.append([tag, name, units, "Float32"])
    # A WFI flow tag that nobody has added to the instrument index yet.
    rows.append(["CHI.WFI.FT301.PV", "WFI supply flow", "LPM", "Float32"])
    write_csv("historian/tags.csv", ["TAG", "DESCRIPTION", "ENG_UNITS", "POINT_TYPE"], rows)

    ext_by_sig = {sig_id: ext_id for sig_id, _, ext_id, _ in SIGNAL_META}
    rows = []
    for s in series:
        tag, units = HISTORIAN_TAGS[ext_by_sig[s["signalId"]]]
        for p in s["points"]:
            value = p["value"]
            if units == "DEGF":
                value = value * 9 / 5 + 32
            rows.append([tag, epoch_ms(p["timestamp"]), repr(float(value))])
    write_csv("historian/datapoints.csv", ["TAG", "TS_EPOCH_MS", "VALUE"], rows)

    rows = []
    for e in events:
        if e["sourceSystem"] != "Historian":
            continue
        rows.append([e["id"], HISTORIAN_ALARM_TAG[e["equipmentId"]], epoch_ms(e["timestamp"]), MES_EVENT_TYPE[e["category"]], HISTORIAN_PRIORITY[e.get("severity", "warning")], e["title"], e.get("description", ""), e["batchId"]])
    write_csv("historian/alarms.csv", ["ALARM_ID", "TAG", "TS_EPOCH_MS", "CLASS", "PRIORITY", "ALARM_TEXT", "ALARM_DETAIL", "BATCH_CTX"], rows)

    # Event frames: the historian's own notion of a batch window (PI EventFrame style).
    rows = []
    for b in batches:
        matching = [s for s in series if s["batchId"] == b["id"]]
        if not matching:
            continue
        start = min(s["points"][0]["timestamp"] for s in matching)
        end = max(s["points"][-1]["timestamp"] for s in matching)
        rows.append([f"EF-{b['id']}", b["id"], epoch_ms(start), epoch_ms(end)])
    write_csv("historian/batch_event_frames.csv", ["EF_ID", "BATCH_NO", "START_EPOCH_MS", "END_EPOCH_MS"], rows)


def write_cmms(entities: dict, wos: list[dict]) -> None:
    """IT: SAP-style CMMS equipment master and work orders."""
    rows: list[list[object]] = []
    for e in entities["equipment"]:
        eq_no, func_loc = CMMS_EQUIPMENT[e["id"]]
        rows.append([eq_no, func_loc, e["name"].upper(), e["equipmentType"].upper(), e.get("manufacturer", ""), e.get("serialNumber", ""), "INST"])
    # An orphan: a WFI pump that exists in the CMMS but not in the engineering register.
    rows.append(["10009999", "CHI-UTIL-WFI-PMP301", "WFI DISTRIBUTION PUMP", "PUMP", "", "", "INST"])
    write_csv("cmms/equipment_master.csv", ["EQUIPMENT_NO", "FUNC_LOC", "DESCRIPTION", "OBJECT_TYPE", "MANUFACTURER", "SERIAL_NO", "SYS_STATUS"], rows)

    records = []
    for wo in wos:
        eq_no, func_loc = CMMS_EQUIPMENT[wo["equipmentId"]]
        created = datetime.fromisoformat(wo["createdAt"])
        rec = {
            "order_no": wo["id"].split("-")[1].zfill(7),
            "order_type": "PM02",
            "equipment_no": eq_no,
            "func_loc": func_loc,
            "short_text": wo["title"],
            "long_text": wo["description"],
            "sys_status": CMMS_STATUS[wo["status"]],
            "priority": CMMS_PRIORITY[wo["priority"]],
            "basic_finish": wo["dueDate"].replace("-", "") if wo.get("dueDate") else "",
            "created_on": created.strftime("%Y%m%d"),
            "created_at": created.strftime("%H%M%S"),
            "revision": 1,
        }
        records.append(rec)
        # The valve inspection order was re-released; the export carries both revisions.
        if wo["id"] == "WO-744":
            rev2 = dict(rec)
            rev2["revision"] = 2
            rev2["long_text"] = rec["long_text"] + " Re-released after scheduling conflict."
            records.append(rev2)
    # An order on the orphan WFI pump — nothing in the plant model to attach it to.
    records.append({"order_no": "0000760", "order_type": "PM01", "equipment_no": "10009999", "func_loc": "CHI-UTIL-WFI-PMP301", "short_text": "WFI pump seal replacement", "long_text": "Replace mechanical seal on WFI distribution pump", "sys_status": "REL", "priority": "2", "basic_finish": "20250625", "created_on": "20250613", "created_at": "091500", "revision": 1})
    write_json("cmms/work_orders.json", records)


def write_qms(devs: list[dict], events: list[dict]) -> None:
    """IT: QMS deviation records, quality events, and document register."""
    records = []
    for d in devs:
        num = d["id"].split("-")[1]
        records.append({
            "record_id": f"DR-2025-{num.zfill(4)}",
            "deviation_no": d["id"],
            "batch_ref": mes_batch_no(d["batchId"]),
            "title": d["title"],
            "description": d["description"],
            "classification": QMS_CLASSIFICATION[d["severity"]],
            "state": QMS_STATE[d["status"]],
            "opened": d["openedAt"] + ".000",
            "impacted_equipment": "; ".join(d["equipmentIds"]),
            "linked_events": ", ".join(d["relatedEventIds"]),
        })
    write_json("qms/deviations.json", records)

    qevents = []
    for e in events:
        if e["sourceSystem"] != "QMS":
            continue
        qevents.append({
            "event_ref": e["id"],
            "batch_ref": mes_batch_no(e["batchId"]),
            "occurred": e["timestamp"] + ".000",
            "type": "Quality",
            "severity": QMS_SEVERITY[e.get("severity", "info")],
            "summary": e["title"],
            "detail": e.get("description", ""),
            "equipment": e.get("equipmentId"),
        })
    write_json("qms/quality_events.json", qevents)
    write_json("qms/document_register.json", document_register())


def main() -> None:
    # Seeded so regeneration is reproducible — demo visuals and any future
    # snapshot tests stay stable across runs.
    random.seed(42)
    print("Generating synthetic source-system data into data/raw/ ...")
    entities = base_entities()
    batches = batch_schedule()
    events = with_source_systems(all_events(batches))
    series = all_time_series(batches)

    write_engineering_register(entities)
    write_mes(batches, events, operator_notes())
    write_historian(batches, events, series)
    write_cmms(entities, work_orders())
    write_qms(deviations(), events)
    write_json("analytics/anomaly_windows.json", anomaly_windows())
    print("Done. Next: python3 scripts/contextualize.py")


if __name__ == "__main__":
    main()
