import { afterEach, describe, expect, it } from "vitest";
import { join } from "path";
import { hybridRetrieve, resetSopIndexCache } from "./hybridRetriever";
import { retrieveDocuments } from "./simpleRetriever";

const MISSING_INDEX = join(process.cwd(), "data", "generated", "sop_embeddings.missing.json");

afterEach(() => {
  resetSopIndexCache();
});

describe("hybridRetrieve", () => {
  it("returns null when the index file is missing so callers can fall back", () => {
    expect(hybridRetrieve("escalation criteria", { indexPath: MISSING_INDEX })).toBeNull();
  });

  it("keeps SOP-DEV-005 in topK for an escalation-criteria query", () => {
    const hits = hybridRetrieve("escalation criteria", { batchId: "B-104", topK: 5 });
    expect(hits).not.toBeNull();
    const ids = hits!.map((h) => h.section.sectionId);
    expect(ids).toContain("SOP-DEV-005");
  });

  it("never returns another batch's BMR or SHIFT sections", () => {
    const hits = hybridRetrieve("batch record deviation shift handover", {
      batchId: "B-103",
      topK: 10,
    });
    expect(hits).not.toBeNull();
    const ids = hits!.map((h) => h.section.sectionId);
    expect(ids.some((id) => id.startsWith("BMR-B104") || id.startsWith("SHIFT-"))).toBe(false);
    expect(hits!.every((h) => !h.section.relatedBatchId || h.section.relatedBatchId === "B-103")).toBe(
      true
    );
  });
});

describe("retrieveDocuments fallback", () => {
  it("falls back to keyword when the index is missing", () => {
    const hits = retrieveDocuments("temperature excursion", {
      batchId: "B-104",
      topK: 5,
      indexPath: MISSING_INDEX,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.section.sectionId.startsWith("SOP-"))).toBe(true);
  });
});
