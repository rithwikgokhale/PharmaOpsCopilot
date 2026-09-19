/** Shared unigram tokenizer for keyword + TF-IDF retrieval. Must stay in lockstep
 *  with `tokenize()` in `scripts/embed_sops.py` — a mismatch would make the
 *  committed index unusable at query time. */

export const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "were",
  "what",
  "why",
  "how",
  "which",
  "should",
  "i",
  "before",
  "this",
  "that",
  "be",
  "do",
  "does",
  "can",
  "with",
  "at",
  "it",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
