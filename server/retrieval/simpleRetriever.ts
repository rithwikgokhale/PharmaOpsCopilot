import { getDocSections, type DocSectionRecord } from "./documentStore";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "what", "why", "how", "which", "should", "i", "before",
  "this", "that", "be", "do", "does", "can", "with", "at", "it",
]);

export interface RetrievalHit {
  section: DocSectionRecord;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Keyword-based retrieval (RAG Option A). Scores doc sections by term overlap
 * with the query, with a small boost for sections tied to the active batch or
 * equipment. Returns top-K hits. Swappable for embeddings later (Option B).
 */
export function retrieveDocuments(
  query: string,
  opts: { batchId?: string; equipmentIds?: string[]; topK?: number } = {}
): RetrievalHit[] {
  const { batchId, equipmentIds = [], topK = 5 } = opts;
  const queryTerms = tokenize(query);

  const hits: RetrievalHit[] = getDocSections().map((section) => {
    const haystack = tokenize(`${section.title} ${section.content} ${section.tags.join(" ")}`);
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

    return { section, score };
  });

  return hits
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
