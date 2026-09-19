import { describe, expect, it } from "vitest";
import { keywordRetrieve, retrieveDocuments } from "./simpleRetriever";

describe("keywordRetrieve", () => {
  it("returns SOP-related hits for deviation/temperature queries", () => {
    const hits = keywordRetrieve("temperature excursion deviation SOP", {
      batchId: "B-104",
      topK: 5,
    });
    expect(hits.length).toBeGreaterThan(0);
    const sectionIds = hits.map((h) => h.section.sectionId);
    expect(sectionIds.some((id) => id.startsWith("SOP-"))).toBe(true);
    expect(sectionIds.some((id) => id.startsWith("SOP-DEV-") || id.startsWith("SOP-BIO-"))).toBe(
      true
    );
  });

  it("respects topK limit", () => {
    const hits = keywordRetrieve("batch deviation temperature CIP pH", { topK: 2 });
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("filters zero-score sections", () => {
    const hits = keywordRetrieve("xyzzy nonsense query with no matches", { topK: 5 });
    expect(hits.every((h) => h.score > 0)).toBe(true);
  });

  it("excludes documents that belong to a different batch", () => {
    const hits = keywordRetrieve("batch record deviation", { batchId: "B-103", topK: 10 });
    expect(hits.every((h) => !h.section.relatedBatchId || h.section.relatedBatchId === "B-103")).toBe(
      true
    );
    expect(hits.every((h) => !h.section.sectionId.startsWith("BMR-B104"))).toBe(true);
    expect(hits.every((h) => !h.section.sectionId.startsWith("SHIFT-"))).toBe(true);
  });
});

describe("retrieveDocuments", () => {
  it("still returns SOP sections for EVAL-like queries", () => {
    const hits = retrieveDocuments("What SOP sections are relevant?", {
      batchId: "B-104",
      topK: 5,
    });
    const ids = hits.map((h) => h.section.sectionId);
    expect(ids.some((id) => id.startsWith("SOP-DEV-") || id.startsWith("SOP-CIP-"))).toBe(true);
  });
});
