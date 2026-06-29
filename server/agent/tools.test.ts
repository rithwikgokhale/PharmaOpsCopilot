import { describe, expect, it } from "vitest";
import {
  assessDataQuality,
  detectAnomalies,
  getBatchSummary,
  getEvents,
  getTimeSeriesStats,
} from "./tools";

describe("tools", () => {
  it("getBatchSummary returns B-104", () => {
    const batch = getBatchSummary("B-104");
    expect(batch?.id).toBe("B-104");
    expect(batch?.status).toBe("deviation");
  });

  it("getBatchSummary returns undefined for unknown batch", () => {
    expect(getBatchSummary("B-999")).toBeUndefined();
  });

  it("getEvents returns sorted ascending timestamps", () => {
    const events = getEvents("B-104");
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timestamp >= events[i - 1].timestamp).toBe(true);
    }
  });

  it("detectAnomalies includes B-104 anomaly windows", () => {
    const anomalies = detectAnomalies("B-104");
    const ids = anomalies.map((a) => a.id);
    expect(ids.some((id) => id.startsWith("ANOM-B104"))).toBe(true);
  });

  it("getTimeSeriesStats reports excursions for temperature", () => {
    const stats = getTimeSeriesStats("B-104", ["SIG-TEMP-101"]);
    const temp = stats.find((s) => s.signalId === "SIG-TEMP-101");
    expect(temp).toBeDefined();
    expect(temp!.excursionCount).toBeGreaterThan(0);
  });

  it("assessDataQuality flags calibration and QA pending for B-104", () => {
    const flags = assessDataQuality("B-104");
    expect(flags.length).toBeGreaterThan(0);
    const categories = flags.map((f) => f.category);
    expect(categories).toContain("calibration_due");
    expect(categories).toContain("qa_pending");
  });
});
