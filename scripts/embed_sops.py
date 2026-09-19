#!/usr/bin/env python3
"""Build a local SOP embedding index from data/generated/documents.json.

Default provider is TF-IDF (stdlib only, no network). The TypeScript retriever
re-tokenizes queries with the same vocab + idf stored here — Python is not on
the request path. Section ids come from documents.json so they match
documentStore.ts (one splitter: contextualize.py).

Tokenization must stay in lockstep with server/retrieval/tokenize.ts.

  python3 scripts/embed_sops.py
  python3 scripts/embed_sops.py --provider openai   # optional; requires OPENAI_API_KEY

Chained from `npm run generate-data` as the TF-IDF path only.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_PATH = ROOT / "data" / "generated" / "documents.json"
OUT_PATH = ROOT / "data" / "generated" / "sop_embeddings.json"

# Keep identical to server/retrieval/tokenize.ts
STOPWORDS = {
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
}
TOKEN_RE = re.compile(r"[^a-z0-9\s-]")


def tokenize(text: str) -> list[str]:
    cleaned = TOKEN_RE.sub(" ", text.lower())
    return [t for t in cleaned.split() if len(t) > 1 and t not in STOPWORDS]


def section_text(doc: dict, section: dict) -> str:
    tags = " ".join(doc.get("tags") or [])
    return (
        f"{doc.get('title', '')} {section.get('title', '')} "
        f"{section.get('content', '')} {tags}"
    )


def load_sections() -> list[dict]:
    if not DOCS_PATH.exists():
        raise SystemExit(f"Missing {DOCS_PATH}. Run `npm run generate-data` first.")
    documents = json.loads(DOCS_PATH.read_text(encoding="utf-8"))
    rows = []
    for doc in documents:
        for section in doc.get("sections") or []:
            rows.append(
                {
                    "id": section["id"],
                    "tokens": tokenize(section_text(doc, section)),
                    "text": section_text(doc, section),
                }
            )
    rows.sort(key=lambda r: r["id"])
    return rows


def l2_normalize(weights: dict[int, float]) -> dict[int, float]:
    norm = math.sqrt(sum(v * v for v in weights.values()))
    if norm <= 0:
        return {}
    return {i: v / norm for i, v in weights.items()}


def sparse_pairs(weights: dict[int, float]) -> list[dict]:
    pairs = []
    for index in sorted(weights):
        value = round(weights[index], 6)
        if abs(value) < 1e-9:
            continue
        pairs.append({"index": index, "value": value})
    return pairs


def build_tfidf(rows: list[dict]) -> dict:
    df: dict[str, int] = {}
    for row in rows:
        for term in set(row["tokens"]):
            df[term] = df.get(term, 0) + 1
    vocab = sorted(df)
    vocab_index = {term: i for i, term in enumerate(vocab)}
    n_docs = max(len(rows), 1)
    idf = [math.log((n_docs + 1) / (df[term] + 1)) + 1.0 for term in vocab]

    sections = []
    for row in rows:
        tf: dict[int, int] = {}
        for term in row["tokens"]:
            idx = vocab_index[term]
            tf[idx] = tf.get(idx, 0) + 1
        weights = {i: count * idf[i] for i, count in tf.items()}
        sections.append({"id": row["id"], "vector": sparse_pairs(l2_normalize(weights))})

    return {
        "generatedBy": "scripts/embed_sops.py",
        "provider": "tfidf",
        "model": "tfidf-unigram",
        "dim": len(vocab),
        "vocab": vocab,
        "idf": [round(v, 6) for v in idf],
        "sections": sections,
    }


def build_openai(rows: list[dict], model: str, api_key: str) -> dict:
    payload = json.dumps({"model": model, "input": [row["text"] for row in rows]}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=payload,
        headers={
            "content-type": "application/json",
            "authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")[:240]
        raise SystemExit(f"OpenAI embeddings failed: {err.code} {detail}") from err

    by_index = {int(item["index"]): item["embedding"] for item in body.get("data") or []}
    sections = []
    dim = 0
    for i, row in enumerate(rows):
        vector = by_index.get(i)
        if not vector:
            raise SystemExit(f"OpenAI embeddings response missing index {i} ({row['id']})")
        dim = len(vector)
        sections.append({"id": row["id"], "vector": [round(float(v), 6) for v in vector]})

    return {
        "generatedBy": "scripts/embed_sops.py",
        "provider": "openai",
        "model": model,
        "dim": dim,
        "vocab": [],
        "idf": [],
        "sections": sections,
    }


def write_index(index: dict) -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(index, indent=2, sort_keys=True, ensure_ascii=True) + "\n"
    OUT_PATH.write_text(text, encoding="utf-8")
    print(
        f"  wrote {OUT_PATH.relative_to(ROOT)} "
        f"({index['provider']}, dim={index['dim']}, sections={len(index['sections'])})"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--provider",
        choices=("tfidf", "openai"),
        default="tfidf",
        help="tfidf is the committed offline index. openai requires OPENAI_API_KEY.",
    )
    args = parser.parse_args()

    rows = load_sections()
    if not rows:
        raise SystemExit("documents.json has no sections.")

    if args.provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise SystemExit("OPENAI_API_KEY is required for --provider openai.")
        model = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small").strip()
        print(f"Embedding {len(rows)} sections with {model}…")
        write_index(build_openai(rows, model, api_key))
        print("Note: the live retriever only consumes the tfidf index (sync, no key).")
        return

    print(f"Building TF-IDF index for {len(rows)} sections…")
    write_index(build_tfidf(rows))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
