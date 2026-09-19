import type { DocSectionRecord } from "./documentStore";

/** Drop sections that belong to a *different* batch before any scoring.
 *  Keyword and hybrid retrieval must share this — otherwise embeddings can
 *  reintroduce another batch's record as a citation (BUG-03). */
export function sectionInScope(section: DocSectionRecord, batchId?: string): boolean {
  if (batchId && section.relatedBatchId && section.relatedBatchId !== batchId) {
    return false;
  }
  return true;
}
