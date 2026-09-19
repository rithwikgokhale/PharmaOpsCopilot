#!/usr/bin/env python3
"""Contextualize siloed IT/OT/ET source data into the unified PharmaOps model.

Reads the per-system exports under data/raw/ (produced by
generate_synthetic_pharma_data.py) and resolves them into the single, linked
model under data/generated/ that the dashboard and copilot consume:

  MES batch records + QMS deviations          -> batches.json, deviations.json
  MES events + historian alarms + QMS events  -> events.json (deduplicated)
  MES electronic logbook                      -> operatorNotes.json
  Historian tags x instrument index           -> signals.json
  Historian datapoints x batch event frames   -> timeSeries.json (units + tz normalized)
  CMMS work orders x equipment master x ET    -> workOrders.json (deduplicated)
  Engineering register                        -> site/areas/assets/equipment.json
  QMS document register + markdown            -> documents.json
  derived                                     -> relationships.json
  analytics                                   -> anomalyWindows.json

Every cross-system join is recorded in contextualization_report.json with the
method used (exact / alias / normalized / master-data join / fuzzy) and a
confidence score, alongside unit conversions, timezone shifts, duplicates
removed, repaired fields, and records that could not be resolved. This is the
local stand-in for the contextualization step of a CDF data pipeline (RAW ->
transformations -> data model), and the report is what a reviewer would look at
before trusting the knowledge graph.

Run: python3 scripts/contextualize.py   (or `npm run generate-data`)
"""

from __future__ import annotations

import csv
import difflib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
DOCS = ROOT / "data" / "documents"
OUT = ROOT / "data" / "generated"

PLANT_UTC_OFFSET_HOURS = -5

# -----------------------------------------------------------------------------
# Report
# -----------------------------------------------------------------------------


class Report:
    def __init__(self) -> None:
        self.sources: list[dict] = []
        self.matches: list[dict] = []
        self.unresolved: list[dict] = []
        self.conversions: list[dict] = []
        self.duplicates: list[dict] = []
        self.repairs: list[dict] = []
        self.entities: dict[str, int] = {}

    def source(self, system: str, layer: str, files: list[str], records: int, description: str, datapoints: int | None = None) -> None:
        entry = {"system": system, "layer": layer, "files": files, "records": records, "description": description}
        if datapoints is not None:
            entry["datapoints"] = datapoints
        self.sources.append(entry)

    def match(self, entity: str, source: str, source_key: str, resolved_id: str, method: str, confidence: float, note: str = "") -> None:
        self.matches.append({"entity": entity, "source": source, "sourceKey": source_key, "resolvedId": resolved_id, "method": method, "confidence": round(confidence, 2), "note": note})

    def unresolvable(self, entity: str, source: str, source_key: str, reason: str) -> None:
        self.unresolved.append({"entity": entity, "source": source, "sourceKey": source_key, "reason": reason})

    def conversion(self, kind: str, source: str, key: str, detail: str, records: int) -> None:
        self.conversions.append({"kind": kind, "source": source, "key": key, "detail": detail, "records": records})

    def duplicate(self, entity: str, source: str, key: str, kept: str, dropped: int) -> None:
        self.duplicates.append({"entity": entity, "source": source, "key": key, "kept": kept, "dropped": dropped})

    def repair(self, entity: str, source: str, key: str, field: str, action: str) -> None:
        self.repairs.append({"entity": entity, "source": source, "key": key, "field": field, "action": action})

    def to_json(self) -> dict:
        by_method = Counter(m["method"] for m in self.matches)
        low_confidence = [m for m in self.matches if m["confidence"] < 0.9]
        return {
            "pipeline": "scripts/contextualize.py",
            "plantUtcOffsetHours": PLANT_UTC_OFFSET_HOURS,
            "summary": {
                "sources": len(self.sources),
                "sourceRecords": sum(s["records"] for s in self.sources),
                "datapointRows": sum(s.get("datapoints", 0) for s in self.sources),
                "matches": len(self.matches),
                "matchesByMethod": dict(sorted(by_method.items())),
                "lowConfidenceMatches": len(low_confidence),
                "unresolved": len(self.unresolved),
                "conversions": len(self.conversions),
                "duplicatesRemoved": sum(d["dropped"] for d in self.duplicates),
                "repairs": len(self.repairs),
            },
            "entities": self.entities,
            "sources": self.sources,
            "matches": self.matches,
            "lowConfidenceMatches": low_confidence,
            "unresolved": self.unresolved,
            "conversions": self.conversions,
            "duplicatesRemoved": self.duplicates,
            "repairs": self.repairs,
        }


report = Report()

# -----------------------------------------------------------------------------
# IO + normalization helpers
# -----------------------------------------------------------------------------


def read_csv(rel: str) -> list[dict]:
    with (RAW / rel).open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def read_json(rel: str):
    with (RAW / rel).open(encoding="utf-8") as f:
        return json.load(f)


def write_out(name: str, data: object) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"  wrote {path.relative_to(ROOT)}")


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def from_mes_ts(value: str) -> datetime | None:
    """MES: DD-MON-YYYY HH:MM:SS (plant local)."""
    if not value:
        return None
    return datetime.strptime(value, "%d-%b-%Y %H:%M:%S")


def from_epoch_ms(value: str | int) -> datetime:
    """Historian: UTC epoch ms -> naive plant local."""
    utc = datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc).replace(tzinfo=None)
    return utc + timedelta(hours=PLANT_UTC_OFFSET_HOURS)


def from_qms_ts(value: str) -> datetime:
    """QMS: ISO with milliseconds, plant local."""
    return datetime.fromisoformat(value)


def from_cmms_date(yyyymmdd: str) -> str:
    return f"{yyyymmdd[0:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:8]}"


def norm_key(value: str) -> str:
    """Aggressive normalization for matching: uppercase alphanumerics only."""
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def batch_id_from_ref(ref: str) -> str:
    """B104 / B-104 / b104 -> B-104."""
    m = re.match(r"^\s*B-?(\d+)\s*$", ref, re.I)
    if not m:
        raise ValueError(f"unrecognized batch reference {ref!r}")
    return f"B-{m.group(1)}"


def f_to_c(value: float) -> float:
    return (value - 32) * 5 / 9


UNIT_ALIASES = {"DEGC": "°C", "DEGF": "°F", "PH": "pH", "RPM": "rpm", "BARG": "bar", "PCT": "%", "MS/CM": "mS/cm", "LPM": "L/min"}

# -----------------------------------------------------------------------------
# 1. Engineering register (ET) -> site, areas, assets, equipment
# -----------------------------------------------------------------------------


def build_plant_model() -> tuple[dict, list[dict], list[dict], list[dict], dict]:
    register = read_csv("engineering/asset_register.csv")
    equipment_rows = read_csv("engineering/equipment_register.csv")
    report.source("Engineering register", "ET", ["engineering/asset_register.csv", "engineering/equipment_register.csv"], len(register) + len(equipment_rows), "Asset hierarchy, equipment register, instrument index, operating limits")

    site = next(r for r in register if r["LEVEL"] == "SITE")
    site_out = {"id": site["ASSET_ID"], "name": site["NAME"], "description": site["DESCRIPTION"]}
    areas = [{"id": r["ASSET_ID"], "siteId": r["PARENT_ID"], "name": r["NAME"]} for r in register if r["LEVEL"] == "AREA"]
    area_ids = {a["id"] for a in areas}

    assets = []
    asset_area: dict[str, str] = {}
    for r in register:
        if r["LEVEL"] != "ASSET":
            continue
        parent = r["PARENT_ID"]
        if parent in area_ids:
            asset = {"id": r["ASSET_ID"], "areaId": parent, "name": r["NAME"], "assetType": r["TYPE"]}
        else:
            # Parent is another asset: inherit its area.
            asset = {"id": r["ASSET_ID"], "areaId": asset_area[parent], "parentAssetId": parent, "name": r["NAME"], "assetType": r["TYPE"]}
        asset_area[asset["id"]] = asset["areaId"]
        assets.append(asset)

    equipment = []
    for r in equipment_rows:
        e = {"id": r["TAG"], "assetId": r["PARENT_ASSET"], "name": r["NAME"], "tag": r["TAG"], "equipmentType": r["TYPE"]}
        if r["MANUFACTURER"]:
            e["manufacturer"] = r["MANUFACTURER"]
        if r["SERIAL_NO"]:
            e["serialNumber"] = r["SERIAL_NO"]
        e["status"] = r["STATUS"].lower()
        equipment.append(e)

    structure = {
        "parentEquip": {r["TAG"]: r["PARENT_EQUIP"] for r in equipment_rows if r["PARENT_EQUIP"]},
        "serves": {r["TAG"]: r["SERVES"] for r in equipment_rows if r["SERVES"]},
    }
    return site_out, areas, assets, equipment, structure


# -----------------------------------------------------------------------------
# 2. Equipment resolution — the heart of contextualization
# -----------------------------------------------------------------------------


class EquipmentResolver:
    """Resolve any system's name for a piece of equipment to the engineering tag."""

    def __init__(self, equipment: list[dict]) -> None:
        self.tags = [e["id"] for e in equipment]
        self.by_norm = {norm_key(t): t for t in self.tags}
        # MES uses unit-centric names; these aliases were confirmed with the MES team.
        self.aliases = {"BR-101": "BIO-101", "BR101": "BIO-101", "BR-101-TT": "TT-101", "BR-101-PH": "PH-101", "BR-101-AGIT": "AG-101"}
        # Abbreviations seen in CMMS functional locations.
        self.abbreviations = {"PMP": "PUMP", "VLV": "VLV", "AGIT": "AG"}
        self._cache: dict[tuple[str, str], str | None] = {}

    def resolve(self, source: str, raw: str, *, entity: str = "equipment", context: str = "") -> str | None:
        if not raw:
            return None
        key = (source, raw)
        if key in self._cache:
            return self._cache[key]
        resolved = self._resolve(source, raw, entity, context)
        self._cache[key] = resolved
        return resolved

    def _resolve(self, source: str, raw: str, entity: str, context: str) -> str | None:
        candidate = raw.strip()
        if candidate in self.tags:
            report.match(entity, source, raw, candidate, "exact", 1.0, context)
            return candidate
        if candidate in self.aliases:
            report.match(entity, source, raw, self.aliases[candidate], "alias", 0.95, f"MES unit alias{(' — ' + context) if context else ''}")
            return self.aliases[candidate]
        # CMMS functional locations: take the trailing token (CHI-FERM-TRA-PH 101 -> PH 101).
        token = candidate.split("-")[-1] if candidate.count("-") >= 2 else candidate
        for abbr, full in self.abbreviations.items():
            if norm_key(token).startswith(abbr):
                token = full + norm_key(token)[len(abbr):]
        normalized = norm_key(token)
        if normalized in self.by_norm:
            tag = self.by_norm[normalized]
            method = "normalized"
            confidence = 0.9
            note = f"case/punctuation-insensitive match on {token!r}"
            if token != raw:
                note = f"functional-location suffix {token!r} normalized"
            report.match(entity, source, raw, tag, method, confidence, note + (f" — {context}" if context else ""))
            return tag
        close = difflib.get_close_matches(normalized, list(self.by_norm.keys()), n=1, cutoff=0.8)
        if close:
            tag = self.by_norm[close[0]]
            ratio = difflib.SequenceMatcher(None, normalized, close[0]).ratio()
            report.match(entity, source, raw, tag, "fuzzy", round(0.6 + 0.3 * ratio, 2), f"closest engineering tag to {token!r}" + (f" — {context}" if context else ""))
            return tag
        report.unresolvable(entity, source, raw, "no engineering tag matches" + (f" ({context})" if context else ""))
        return None


# -----------------------------------------------------------------------------
# 3. MES batches + QMS deviations
# -----------------------------------------------------------------------------

MES_STATUS = {"COMP": "complete", "DEVN": "deviation", "PLND": "planned", "RUN": "running", "DLYD": "delayed"}
MES_PHASE = {"COMP": "complete", "FERM": "fermentation", "PLND": "planned", "CIP": "cip", "INOC": "inoculation", "HARV": "harvest", "HOLD": "hold"}
QMS_CLASS = {"Minor": "minor", "Major": "major", "Critical": "critical"}
QMS_STATE = {"Open": "open", "Under Review": "under_review", "Closed": "closed"}


def build_batches_and_deviations(resolver: EquipmentResolver, equipment: list[dict]) -> tuple[list[dict], list[dict]]:
    mes_rows = read_csv("mes/batch_records.csv")
    qms_rows = read_json("qms/deviations.json")
    asset_of = {e["id"]: e["assetId"] for e in equipment}

    deviations = []
    dev_by_batch: dict[str, str] = {}
    for d in qms_rows:
        batch_id = batch_id_from_ref(d["batch_ref"])
        report.match("batch", "QMS", d["batch_ref"], batch_id, "normalized", 0.95, f"deviation {d['deviation_no']} batch reference")
        equipment_ids = []
        for raw in [x.strip() for x in d["impacted_equipment"].split(";") if x.strip()]:
            tag = resolver.resolve("QMS", raw, context=f"impacted equipment on {d['deviation_no']}")
            if tag:
                equipment_ids.append(tag)
        deviations.append({
            "id": d["deviation_no"],
            "batchId": batch_id,
            "title": d["title"],
            "description": d["description"],
            "status": QMS_STATE[d["state"]],
            "severity": QMS_CLASS[d["classification"]],
            "openedAt": iso(from_qms_ts(d["opened"])),
            "equipmentIds": equipment_ids,
            "relatedEventIds": [x.strip() for x in d["linked_events"].split(",") if x.strip()],
        })
        dev_by_batch[batch_id] = d["deviation_no"]
    report.conversion("timestamp", "QMS", "deviations.opened", "ISO-8601 with milliseconds -> plant-local seconds precision", len(qms_rows))

    batches = []
    for r in mes_rows:
        batch_id = batch_id_from_ref(r["BATCH_NO"])
        report.match("batch", "MES", r["BATCH_NO"], batch_id, "normalized", 0.95, "MES batch number without hyphen")
        unit = resolver.resolve("MES", r["UNIT"], context=f"primary unit for {batch_id}")
        b: dict = {
            "id": batch_id,
            "name": f"Batch {batch_id}",
            "productCode": r["PROD_CODE"],
            "status": MES_STATUS[r["STATUS"]],
            "currentPhase": MES_PHASE[r["PHASE"]],
            "plannedStart": iso(from_mes_ts(r["PLAN_START"])),
        }
        for src, dst in (("ACT_START", "actualStart"), ("PLAN_END", "plannedEnd"), ("ACT_END", "actualEnd")):
            dt = from_mes_ts(r[src])
            if dt:
                b[dst] = iso(dt)
        b["primaryEquipmentId"] = unit
        b["primaryAssetId"] = asset_of[unit]
        if batch_id in dev_by_batch:
            b["deviationId"] = dev_by_batch[batch_id]
            report.match("deviation", "QMS->MES", dev_by_batch[batch_id], batch_id, "normalized", 0.95, "deviation linked to batch via normalized batch reference")
        if r["REMARKS"]:
            b["notes"] = r["REMARKS"]
        batches.append(b)
    report.source("MES", "IT", ["mes/batch_records.csv", "mes/batch_events.csv", "mes/operator_log.csv"], len(mes_rows), "Batch records, batch events, electronic logbook")
    report.conversion("timestamp", "MES", "batch_records.*_START/_END", "DD-MON-YYYY HH:MM:SS -> ISO-8601 plant local", len(mes_rows))
    return batches, deviations


# -----------------------------------------------------------------------------
# 4. Events from three systems
# -----------------------------------------------------------------------------

MES_EVENT_TYPE = {"PROC": "process", "OPER": "operator_action", "QUAL": "quality", "ALRM": "alarm", "MAINT": "maintenance", "DOC": "document"}
MES_SEVERITY = {"I": "info", "W": "warning", "A": "alarm"}
HIST_PRIORITY = {"1": "alarm", "2": "warning", "3": "info"}
QMS_SEVERITY = {"High": "alarm", "Medium": "warning", "Low": "info"}


def build_events(resolver: EquipmentResolver, equipment: list[dict], hist_tag_to_equipment: dict[str, str]) -> list[dict]:
    asset_of = {e["id"]: e["assetId"] for e in equipment}
    events: list[dict] = []

    def finish(e: dict) -> dict:
        if e.get("equipmentId"):
            e["assetId"] = asset_of[e["equipmentId"]]
        return e

    mes_rows = read_csv("mes/batch_events.csv")
    seen: dict[str, int] = defaultdict(int)
    for r in mes_rows:
        seen[r["EVENT_ID"]] += 1
        if seen[r["EVENT_ID"]] > 1:
            continue
        e: dict = {"id": r["EVENT_ID"], "batchId": batch_id_from_ref(r["BATCH_NO"]), "timestamp": iso(from_mes_ts(r["EVENT_TS"])), "title": r["EVENT_TEXT"]}
        if r["EVENT_DETAIL"]:
            e["description"] = r["EVENT_DETAIL"]
        e["category"] = MES_EVENT_TYPE[r["EVENT_TYPE"]]
        if r["UNIT"]:
            tag = resolver.resolve("MES", r["UNIT"], context=f"event {r['EVENT_ID']}")
            if tag:
                e["equipmentId"] = tag
        if r["SEVERITY"]:
            e["severity"] = MES_SEVERITY[r["SEVERITY"]]
        else:
            e["severity"] = "info"
            report.repair("event", "MES", r["EVENT_ID"], "severity", "blank in MES export; defaulted to 'info' for a PROC event")
        e["sourceSystem"] = "MES"
        events.append(finish(e))
    for event_id, count in seen.items():
        if count > 1:
            report.duplicate("event", "MES", event_id, "first occurrence", count - 1)

    alarms = read_csv("historian/alarms.csv")
    for r in alarms:
        tag = hist_tag_to_equipment.get(r["TAG"])
        if not tag:
            report.unresolvable("event", "Historian", r["ALARM_ID"], f"alarm tag {r['TAG']} not in instrument index")
            continue
        report.match("event", "Historian", r["TAG"], tag, "master_data_join", 0.9, f"alarm {r['ALARM_ID']} tag -> instrument index -> equipment")
        e = {"id": r["ALARM_ID"], "batchId": batch_id_from_ref(r["BATCH_CTX"]), "timestamp": iso(from_epoch_ms(r["TS_EPOCH_MS"])), "title": r["ALARM_TEXT"]}
        if r["ALARM_DETAIL"]:
            e["description"] = r["ALARM_DETAIL"]
        e["category"] = MES_EVENT_TYPE[r["CLASS"]]
        e["equipmentId"] = tag
        e["severity"] = HIST_PRIORITY[r["PRIORITY"]]
        e["sourceSystem"] = "Historian"
        events.append(finish(e))
    report.conversion("timestamp", "Historian", "alarms.TS_EPOCH_MS", f"UTC epoch ms -> plant local (UTC{PLANT_UTC_OFFSET_HOURS:+03d}:00)", len(alarms))

    qevents = read_json("qms/quality_events.json")
    for q in qevents:
        e = {"id": q["event_ref"], "batchId": batch_id_from_ref(q["batch_ref"]), "timestamp": iso(from_qms_ts(q["occurred"])), "title": q["summary"]}
        if q["detail"]:
            e["description"] = q["detail"]
        e["category"] = "quality"
        if q.get("equipment"):
            tag = resolver.resolve("QMS", q["equipment"], context=f"quality event {q['event_ref']}")
            if tag:
                e["equipmentId"] = tag
        e["severity"] = QMS_SEVERITY[q["severity"]]
        e["sourceSystem"] = "QMS"
        events.append(finish(e))
    report.source("QMS", "IT", ["qms/deviations.json", "qms/quality_events.json", "qms/document_register.json"], len(qevents) + len(read_json("qms/deviations.json")) + len(read_json("qms/document_register.json")), "Deviation records, quality events, document control register")

    events.sort(key=lambda e: (e["batchId"], e["timestamp"], e["id"]))
    return events


# -----------------------------------------------------------------------------
# 5. Operator notes (MES electronic logbook)
# -----------------------------------------------------------------------------

COMPLETE_FLAG = {"Y": "complete", "P": "partial", "N": "incomplete"}


def build_operator_notes(resolver: EquipmentResolver, batches: list[dict]) -> list[dict]:
    rows = read_csv("mes/operator_log.csv")
    batch_date = {b["id"]: datetime.fromisoformat(b.get("actualStart") or b["plannedStart"]).date() for b in batches}
    notes = []
    for r in rows:
        batch_id = batch_id_from_ref(r["BATCH_NO"])
        num, seq = r["ENTRY_ID"].split("-")[1:]
        note_id = f"NOTE-B{num}-{seq}"
        ts_raw = r["ENTRY_TS"]
        if re.fullmatch(r"\d{2}:\d{2}", ts_raw):
            hh, mm = map(int, ts_raw.split(":"))
            dt = datetime.combine(batch_date[batch_id], datetime.min.time()).replace(hour=hh, minute=mm)
            report.repair("operatorNote", "MES", note_id, "timestamp", f"entry had time only ({ts_raw}); date inferred from batch {batch_id} start")
        else:
            dt = from_mes_ts(ts_raw)
        surname, initial = [p.strip() for p in r["OPERATOR"].split(",")]
        n: dict = {"id": note_id, "batchId": batch_id, "timestamp": iso(dt), "author": f"{initial}. {surname.title()}", "content": r["ENTRY_TEXT"]}
        if r["EQUIP"]:
            tag = resolver.resolve("MES", r["EQUIP"], context=f"logbook entry {r['ENTRY_ID']}")
            if tag:
                n["equipmentId"] = tag
        n["completeness"] = COMPLETE_FLAG[r["COMPLETE_FLAG"]]
        notes.append(n)
    return notes


# -----------------------------------------------------------------------------
# 6. Signals + time series (historian x instrument index x event frames)
# -----------------------------------------------------------------------------


def build_signals(resolver: EquipmentResolver) -> tuple[list[dict], dict[str, str], dict[str, str]]:
    """Returns (signals, historian_tag -> signal_id, historian_tag -> equipment_id)."""
    index = read_csv("engineering/instrument_index.csv")
    limits = {r["LOOP_ID"]: r for r in read_csv("engineering/operating_limits.csv")}
    hist_tags = read_csv("historian/tags.csv")
    hist_by_norm = {norm_key(t["TAG"]): t for t in hist_tags}
    hist_datapoints = read_csv("historian/datapoints.csv")
    hist_alarms = read_csv("historian/alarms.csv")
    hist_frames = read_csv("historian/batch_event_frames.csv")
    hist_records = len(hist_tags) + len(hist_alarms) + len(hist_frames)
    report.source(
        "Historian",
        "OT",
        ["historian/tags.csv", "historian/datapoints.csv", "historian/alarms.csv", "historian/batch_event_frames.csv"],
        hist_records,
        "Tag list, datapoints, alarms, batch event frames",
        datapoints=len(hist_datapoints),
    )

    signals = []
    tag_to_signal: dict[str, str] = {}
    tag_to_equipment: dict[str, str] = {}
    matched_hist: set[str] = set()
    for r in index:
        equipment_id = resolver.resolve("Engineering register", r["EQUIPMENT"], context=f"loop {r['LOOP_ID']}")
        lim = limits[r["LOOP_ID"]]
        signals.append({
            "id": r["LOOP_ID"],
            "equipmentId": equipment_id,
            "name": r["SERVICE"],
            "externalId": r["CDF_EXTERNAL_ID"],
            "unit": r["ENG_UNITS"],
            "range": {"target": float(lim["TARGET"]) if "." in lim["TARGET"] else int(lim["TARGET"]), "min": float(lim["LO"]) if "." in lim["LO"] else int(lim["LO"]), "max": float(lim["HI"]) if "." in lim["HI"] else int(lim["HI"]), "unit": lim["UNITS"]},
        })
        wanted = r["HISTORIAN_TAG"]
        exact = next((t for t in hist_tags if t["TAG"] == wanted), None)
        if exact:
            report.match("timeSeries", "Historian", wanted, r["LOOP_ID"], "exact", 1.0, "instrument index historian tag found verbatim")
            hit = exact
        elif norm_key(wanted) in hist_by_norm:
            hit = hist_by_norm[norm_key(wanted)]
            report.match("timeSeries", "Historian", wanted, r["LOOP_ID"], "normalized", 0.9, f"index tag {wanted!r} matched historian tag {hit['TAG']!r} ignoring punctuation")
        else:
            close = difflib.get_close_matches(norm_key(wanted), list(hist_by_norm.keys()), n=1, cutoff=0.8)
            if not close:
                report.unresolvable("timeSeries", "Historian", wanted, f"no historian tag for loop {r['LOOP_ID']}")
                continue
            hit = hist_by_norm[close[0]]
            report.match("timeSeries", "Historian", wanted, r["LOOP_ID"], "fuzzy", 0.75, f"closest historian tag {hit['TAG']!r}")
        tag_to_signal[hit["TAG"]] = r["LOOP_ID"]
        # Alarms raised on a tag belong to the instrument if it is registered
        # equipment in its own right (PH-101, TT-101), otherwise to the loop's unit.
        instrument = r["INSTRUMENT_TAG"]
        tag_to_equipment[hit["TAG"]] = instrument if instrument in resolver.tags else equipment_id
        matched_hist.add(hit["TAG"])

    for t in hist_tags:
        if t["TAG"] not in matched_hist:
            report.unresolvable("timeSeries", "Historian", t["TAG"], "historian tag has no instrument-index entry; datapoints not loaded")
    return signals, tag_to_signal, tag_to_equipment


def build_time_series(signals: list[dict], tag_to_signal: dict[str, str]) -> list[dict]:
    hist_units = {t["TAG"]: t["ENG_UNITS"] for t in read_csv("historian/tags.csv")}
    unit_of_signal = {s["id"]: s["unit"] for s in signals}
    frames = [(batch_id_from_ref(f["BATCH_NO"]), int(f["START_EPOCH_MS"]), int(f["END_EPOCH_MS"])) for f in read_csv("historian/batch_event_frames.csv")]
    for f in read_csv("historian/batch_event_frames.csv"):
        report.match("batch", "Historian", f["BATCH_NO"], batch_id_from_ref(f["BATCH_NO"]), "exact", 1.0, f"event frame {f['EF_ID']}")

    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    converted: Counter = Counter()
    orphan_points: Counter = Counter()
    unassigned = 0
    for r in read_csv("historian/datapoints.csv"):
        sig = tag_to_signal.get(r["TAG"])
        if not sig:
            orphan_points[r["TAG"]] += 1
            continue
        ts_ms = int(r["TS_EPOCH_MS"])
        batch_id = next((b for b, s, e in frames if s <= ts_ms <= e), None)
        if not batch_id:
            unassigned += 1
            continue
        value = float(r["VALUE"])
        src_unit, dst_unit = hist_units[r["TAG"]], unit_of_signal[sig]
        if src_unit == "DEGF" and dst_unit == "°C":
            value = f_to_c(value)
            converted[r["TAG"]] += 1
        elif UNIT_ALIASES.get(src_unit) != dst_unit:
            raise ValueError(f"unit mismatch for {r['TAG']}: {src_unit} vs {dst_unit}")
        buckets[(sig, batch_id)].append({"timestamp": iso(from_epoch_ms(ts_ms)), "value": round(value, 3)})

    for tag, n in converted.items():
        report.conversion("unit", "Historian", tag, "DEGF -> °C (historian tag configured in Fahrenheit; SOP limits are Celsius)", n)
    total = sum(len(v) for v in buckets.values())
    report.conversion("timestamp", "Historian", "datapoints.TS_EPOCH_MS", f"UTC epoch ms -> plant local (UTC{PLANT_UTC_OFFSET_HOURS:+03d}:00)", total)
    for tag, n in orphan_points.items():
        report.conversion("dropped", "Historian", tag, "datapoints skipped: tag unresolved", n)
    if unassigned:
        report.conversion("dropped", "Historian", "datapoints", "datapoints outside any batch event frame", unassigned)

    # Preserve the generator's ordering: by batch schedule, then by signal order.
    sig_order = {s["id"]: i for i, s in enumerate(signals)}
    batch_order = {b: i for i, (b, _, _) in enumerate(frames)}
    series = []
    for (sig, batch_id), points in sorted(buckets.items(), key=lambda kv: (batch_order[kv[0][1]], sig_order[kv[0][0]])):
        points.sort(key=lambda p: p["timestamp"])
        series.append({"signalId": sig, "batchId": batch_id, "points": points})
    return series


# -----------------------------------------------------------------------------
# 7. Work orders (CMMS x equipment master x engineering register)
# -----------------------------------------------------------------------------

CMMS_STATUS = {"CRTD": "scheduled", "REL": "open", "INPR": "in_progress", "TECO": "closed"}
CMMS_PRIORITY = {"1": "high", "2": "medium", "3": "low"}


def build_work_orders(resolver: EquipmentResolver) -> list[dict]:
    master = {r["EQUIPMENT_NO"]: r for r in read_csv("cmms/equipment_master.csv")}
    orders = read_json("cmms/work_orders.json")
    report.source("CMMS", "IT", ["cmms/equipment_master.csv", "cmms/work_orders.json"], len(master) + len(orders), "SAP-style equipment master and maintenance orders")

    # Resolve each CMMS equipment number once, via its functional location.
    eq_no_to_tag: dict[str, str | None] = {}
    for eq_no, row in master.items():
        eq_no_to_tag[eq_no] = resolver.resolve("CMMS", row["FUNC_LOC"], context=f"equipment no. {eq_no} ({row['DESCRIPTION']})")

    latest: dict[str, dict] = {}
    revisions: Counter = Counter()
    for o in orders:
        revisions[o["order_no"]] += 1
        if o["order_no"] not in latest or o["revision"] > latest[o["order_no"]]["revision"]:
            latest[o["order_no"]] = o
    for order_no, n in revisions.items():
        if n > 1:
            report.duplicate("workOrder", "CMMS", f"WO-{int(order_no)}", f"revision {latest[order_no]['revision']}", n - 1)

    work_orders = []
    for order_no, o in latest.items():
        wo_id = f"WO-{int(order_no)}"
        tag = eq_no_to_tag.get(o["equipment_no"])
        if not tag:
            report.unresolvable("workOrder", "CMMS", wo_id, f"equipment no. {o['equipment_no']} ({o['func_loc']}) not in engineering register; order excluded")
            continue
        report.match("workOrder", "CMMS", o["equipment_no"], tag, "master_data_join", 0.9, f"{wo_id}: equipment no. -> functional location -> engineering tag")
        wo: dict = {"id": wo_id, "title": o["short_text"], "description": o["long_text"], "status": CMMS_STATUS[o["sys_status"]], "priority": CMMS_PRIORITY[o["priority"]], "equipmentId": tag}
        if o["basic_finish"]:
            wo["dueDate"] = from_cmms_date(o["basic_finish"])
        wo["createdAt"] = f"{from_cmms_date(o['created_on'])}T{o['created_at'][0:2]}:{o['created_at'][2:4]}:{o['created_at'][4:6]}"
        wo["sourceSystem"] = "CMMS"
        work_orders.append(wo)
    report.conversion("timestamp", "CMMS", "work_orders.created_on/created_at", "YYYYMMDD + HHMMSS -> ISO-8601", len(work_orders))
    work_orders.sort(key=lambda w: w["id"])
    return work_orders


# -----------------------------------------------------------------------------
# 8. Documents (QMS register + markdown) and derived relationships
# -----------------------------------------------------------------------------

DOC_TYPE = {"SOP": "sop", "BMR": "batch_record", "SHIFT": "shift_note", "QA": "qa_checklist"}


def parse_sections(path: Path) -> list[dict]:
    sections: list[dict] = []
    if not path.exists():
        return sections
    current_id = current_title = None
    lines: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            if current_id:
                sections.append({"id": current_id, "title": current_title or "", "content": "\n".join(lines).strip()})
            header = line[3:].strip()
            if " — " in header:
                current_id, current_title = header.split(" — ", 1)
            else:
                current_id, current_title = header.replace(" ", "-").upper()[:20], header
            lines = []
        elif current_id:
            lines.append(line)
    if current_id:
        sections.append({"id": current_id, "title": current_title or "", "content": "\n".join(lines).strip()})
    return sections


def build_documents(resolver: EquipmentResolver) -> list[dict]:
    documents = []
    for d in read_json("qms/document_register.json"):
        equipment_ids = []
        for raw in [x.strip() for x in d["equipment_refs"].split(";") if x.strip()]:
            tag = resolver.resolve("QMS", raw, context=f"document {d['doc_no']}")
            if tag:
                equipment_ids.append(tag)
        batch_id = batch_id_from_ref(d["batch_ref"]) if d["batch_ref"] else None
        if batch_id:
            report.match("document", "QMS", d["batch_ref"], batch_id, "normalized", 0.95, f"document {d['doc_no']} batch reference")
        documents.append({
            "id": d["doc_no"],
            "title": d["title"],
            "documentType": DOC_TYPE[d["doc_type"]],
            "filePath": f"data/documents/{d['file']}",
            "relatedBatchId": batch_id,
            "relatedDeviationId": d["deviation_ref"],
            "relatedEquipmentIds": equipment_ids or None,
            "sections": parse_sections(DOCS / d["file"]),
            "tags": [k.strip() for k in d["keywords"].split(";") if k.strip()],
        })
    return documents


def build_relationships(batches, equipment, structure, work_orders, deviations, documents) -> list[dict]:
    rels: list[tuple[str, str, str, str, str]] = []
    for b in batches:
        if b.get("deviationId"):
            rels.append(("batch", b["id"], "equipment", b["primaryEquipmentId"], "uses"))
    for child, parent in structure["parentEquip"].items():
        rels.append(("equipment", parent, "equipment", child, "has_component"))
    for src, dst in structure["serves"].items():
        rels.append(("equipment", src, "equipment", dst, "supports_cleaning"))
    for wo in work_orders:
        rels.append(("workOrder", wo["id"], "equipment", wo["equipmentId"], "maintains"))
    for d in deviations:
        rels.append(("deviation", d["id"], "batch", d["batchId"], "affects"))
        if d["equipmentIds"]:
            rels.append(("deviation", d["id"], "equipment", d["equipmentIds"][0], "affects"))
    for doc in documents:
        if doc["documentType"] == "sop" and doc.get("relatedDeviationId"):
            rels.append(("document", doc["id"], "deviation", doc["relatedDeviationId"], "references"))
        if doc.get("relatedBatchId"):
            rels.append(("document", doc["id"], "batch", doc["relatedBatchId"], "references"))
    return [{"id": f"REL-{i + 1:03d}", "sourceType": s, "sourceId": sid, "targetType": t, "targetId": tid, "relationshipType": rt} for i, (s, sid, t, tid, rt) in enumerate(rels)]


# -----------------------------------------------------------------------------
# main
# -----------------------------------------------------------------------------


def main() -> None:
    print("Contextualizing data/raw/ -> data/generated/ ...")
    site, areas, assets, equipment, structure = build_plant_model()
    resolver = EquipmentResolver(equipment)

    signals, tag_to_signal, tag_to_equipment = build_signals(resolver)
    batches, deviations = build_batches_and_deviations(resolver, equipment)
    events = build_events(resolver, equipment, tag_to_equipment)
    notes = build_operator_notes(resolver, batches)
    series = build_time_series(signals, tag_to_signal)
    work_orders = build_work_orders(resolver)
    documents = build_documents(resolver)
    anomalies = read_json("analytics/anomaly_windows.json")
    report.source("Analytics", "derived", ["analytics/anomaly_windows.json"], len(anomalies), "Anomaly-detection output over historian signals")
    relationships = build_relationships(batches, equipment, structure, work_orders, deviations, documents)

    outputs = {
        "site.json": site,
        "areas.json": areas,
        "assets.json": assets,
        "equipment.json": equipment,
        "batches.json": batches,
        "deviations.json": deviations,
        "events.json": events,
        "signals.json": signals,
        "timeSeries.json": series,
        "anomalyWindows.json": anomalies,
        "workOrders.json": work_orders,
        "operatorNotes.json": notes,
        "relationships.json": relationships,
        "documents.json": documents,
    }
    for name, data in outputs.items():
        report.entities[name.replace(".json", "")] = len(data) if isinstance(data, list) else 1
        write_out(name, data)
    write_out("contextualization_report.json", report.to_json())

    s = report.to_json()["summary"]
    print(
        f"Done. {s['matches']} matches ({s['lowConfidenceMatches']} low-confidence), "
        f"{s['unresolved']} unresolved, {s['duplicatesRemoved']} duplicates removed, "
        f"{s['repairs']} repairs, {s['conversions']} conversions."
    )


if __name__ == "__main__":
    main()
