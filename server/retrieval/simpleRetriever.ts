import { getDocSections } from "./documentStore";
import { hybridRetrieve } from "./hybridRetriever";
import { keywordScore, type RetrievalHit, type RetrieveOpts } from "./scoring";
import { sectionInScope } from "./scope";
import { tokenize } from "./tokenize";

export type { RetrievalHit, RetrieveOpts } from "./scoring";
export { keywordScore } from "./scoring";

/**
 * Keyword-based retrieval. Scores doc sections by term overlap with the query,
 * with a small boost for sections tied to the active batch or equipment.
 */
export function keywordRetrieve(query: string, opts: RetrieveOpts = {}): RetrievalHit[] {
  const { batchId, equipmentIds = [], topK = 5 } = opts;
  const queryTerms = tokenize(query);

  const hits: RetrievalHit[] = getDocSections()
    .filter((section) => sectionInScope(section, batchId))
    .map((section) => ({
      section,
      score: keywordScore(section, queryTerms, { batchId, equipmentIds }),
    }));

  return hits
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Hybrid retrieval when a TF-IDF index is present; otherwise keyword-only.
 * The evidence-packet contract is unchanged: `{ section, score }[]` with cite IDs.
 */
export function retrieveDocuments(query: string, opts: RetrieveOpts = {}): RetrievalHit[] {
  return hybridRetrieve(query, opts) ?? keywordRetrieve(query, opts);
}
