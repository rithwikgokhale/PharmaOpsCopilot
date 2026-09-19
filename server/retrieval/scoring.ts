import type { DocSectionRecord } from "./documentStore";
import { tokenize } from "./tokenize";

export interface RetrievalHit {
  section: DocSectionRecord;
  score: number;
}

export type RetrieveOpts = {
  batchId?: string;
  equipmentIds?: string[];
  topK?: number;
  /** Test hook: hybridRetrieve uses this path; keywordRetrieve ignores it. */
  indexPath?: string;
};

export function keywordScore(
  section: DocSectionRecord,
  queryTerms: string[],
  opts: { batchId?: string; equipmentIds?: string[] } = {}
): number {
  const { batchId, equipmentIds = [] } = opts;
  const haystack = tokenize(
    `${section.documentTitle} ${section.title} ${section.content} ${section.tags.join(" ")}`
  );
  const haystackSet = new Set(haystack);

  let score = 0;
  for (const term of queryTerms) {
    if (haystackSet.has(term)) score += 2;
    else if (haystack.some((h) => h.includes(term) || term.includes(h))) score += 1;
  }

  if (batchId && section.relatedBatchId === batchId) score += 1.5;
  if (equipmentIds.length && section.relatedEquipmentIds?.some((id) => equipmentIds.includes(id))) {
    score += 1;
  }
  return score;
}
