/**
 * Hybrid retrieval: α · cosine(TF-IDF) + β · keyword score.
 * Index is built offline by scripts/embed_sops.py. Missing or non-tfidf indexes
 * return null so the caller falls back to keywordRetrieve.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getDocSections } from "./documentStore";
import { sectionInScope } from "./scope";
import { keywordScore, type RetrievalHit, type RetrieveOpts } from "./scoring";
import { tokenize } from "./tokenize";

const DEFAULT_INDEX_PATH = join(process.cwd(), "data", "generated", "sop_embeddings.json");
const ALPHA = 2;
const BETA = 1;

interface SparsePair {
  index: number;
  value: number;
}

export interface SopIndex {
  provider: string;
  model: string;
  dim: number;
  vocab: string[];
  idf: number[];
  sections: Array<{ id: string; vector: SparsePair[] }>;
}

let cached: { path: string; index: SopIndex } | null = null;

export function resetSopIndexCache(): void {
  cached = null;
}

export function loadSopIndex(indexPath: string = DEFAULT_INDEX_PATH): SopIndex | null {
  if (cached && cached.path === indexPath) return cached.index;
  if (!existsSync(indexPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(indexPath, "utf-8")) as SopIndex;
    if (parsed.provider !== "tfidf" || !Array.isArray(parsed.vocab) || !Array.isArray(parsed.idf)) {
      return null;
    }
    cached = { path: indexPath, index: parsed };
    return parsed;
  } catch {
    return null;
  }
}

function embedQuery(query: string, index: SopIndex): Map<number, number> | null {
  const vocabIndex = new Map(index.vocab.map((term, i) => [term, i]));
  const tf = new Map<number, number>();
  for (const term of tokenize(query)) {
    const i = vocabIndex.get(term);
    if (i === undefined) continue;
    tf.set(i, (tf.get(i) ?? 0) + 1);
  }
  if (tf.size === 0) return new Map();

  const weights = new Map<number, number>();
  for (const [i, count] of tf) {
    weights.set(i, count * (index.idf[i] ?? 0));
  }
  let norm = 0;
  for (const v of weights.values()) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm <= 0) return new Map();
  for (const [i, v] of weights) weights.set(i, v / norm);
  return weights;
}

function cosine(query: Map<number, number>, vector: SparsePair[]): number {
  if (query.size === 0 || vector.length === 0) return 0;
  let dot = 0;
  for (const pair of vector) {
    const q = query.get(pair.index);
    if (q) dot += q * pair.value;
  }
  return dot;
}

export function hybridRetrieve(
  query: string,
  opts: RetrieveOpts & { indexPath?: string } = {}
): RetrievalHit[] | null {
  const { batchId, equipmentIds = [], topK = 5, indexPath = DEFAULT_INDEX_PATH } = opts;
  const index = loadSopIndex(indexPath);
  if (!index) return null;

  const queryTerms = tokenize(query);
  const queryVec = embedQuery(query, index);
  if (!queryVec) return null;

  const byId = new Map(index.sections.map((s) => [s.id, s.vector]));

  const hits: RetrievalHit[] = getDocSections()
    .filter((section) => sectionInScope(section, batchId))
    .map((section) => {
      const kw = keywordScore(section, queryTerms, { batchId, equipmentIds });
      const cos = cosine(queryVec, byId.get(section.sectionId) ?? []);
      return { section, score: ALPHA * cos + BETA * kw };
    });

  return hits
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
