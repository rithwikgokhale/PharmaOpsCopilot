import { describe, expect, it } from "vitest";
import { retrieveDocuments } from "./simpleRetriever";

describe("retrieveDocuments", () => {
  it("returns SOP-related hits for deviation/temperature queries", () => {
    const hits = retrieveDocuments("temperature excursion deviation SOP", {
      batchId: "B-104",
      topK: 5,
    });
    expect(hits.length).toBeGreaterThan(0);
    const sectionIds = hits.map((h) => h.section.sectionId);
    expect(sectionIds.some((id) => id.startsWith("SOP-"))).toBe(true);
  });

  it("respects topK limit", () => {
    const hits = retrieveDocuments("batch deviation temperature CIP pH", { topK: 2 });
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("filters zero-score sections", () => {
    const hits = retrieveDocuments("xyzzy nonsense query with no matches", { topK: 5 });
    expect(hits.every((h) => h.score > 0)).toBe(true);
  });
});
