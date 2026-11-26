/**
 * Search by meaning: the pure rules behind journal search. No React, no SQL,
 * no model. The model only turns the reader's own words into vectors (see
 * `src/services/embedder.ts`); everything that decides what is shown lives
 * here so it is tested once.
 *
 * Rule: only words the reader wrote are given to the embedding model. A
 * quote's passage (`quoteText`) comes from a book, so it is never embedded:
 * it stays plain stored text and is found by its words alone.
 */

/** The model vectors are made with. Stored next to each vector, so a new model re-indexes. */
export const MEANING_MODEL = 'all-MiniLM-L6-v2/xnnpack-int8';
export const MEANING_DIMS = 384;

/** About what the reader downloads once to turn search by meaning on. */
export const MEANING_DOWNLOAD_MB = 25;

/** Below this cosine similarity a result is noise, unless its words match too. */
export const MIN_SIMILARITY = 0.3;

/** Words per piece. MiniLM reads up to 256 tokens; 120 words stays well inside. */
export const CHUNK_WORDS = 120;
const CHUNK_OVERLAP = 20;

export type SearchableEntry = {
  id: string;
  kind: 'reflection' | 'note' | 'quote';
  createdAt: string;
  body: string;
  quoteText: string | null;
  bookTitle: string | null;
};

/** The part of an entry the model may read: the reader's own words, never a quoted passage. */
export function embeddableText(e: Pick<SearchableEntry, 'body'>): string {
  return e.body.replace(/\s+/g, ' ').trim();
}

/**
 * Splits long writing into overlapping pieces the model can read whole.
 * Short entries are one piece.
 */
export function chunkText(text: string, size = CHUNK_WORDS, overlap = CHUNK_OVERLAP): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  if (words.length <= size) return [words.join(' ')];
  const out: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let start = 0; start < words.length; start += step) {
    out.push(words.slice(start, start + size).join(' '));
    if (start + size >= words.length) break;
  }
  return out;
}

/** A short, stable fingerprint, so an entry is re-indexed only when its words change. */
export function textHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (((h << 5) + h) ^ text.charCodeAt(i)) >>> 0;
  return `${h.toString(36)}.${text.length.toString(36)}`;
}

// ---------------------------------------------------------------------------
// Vectors

export function normalize(v: ArrayLike<number>): Float32Array {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const len = Math.sqrt(sum) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / len;
  return out;
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/** The mean direction of several vectors, normalized. Weights default to 1. */
export function centroid(vectors: ArrayLike<number>[], weights?: number[]): Float32Array | null {
  if (!vectors.length) return null;
  const dims = vectors[0].length;
  const acc = new Float32Array(dims);
  vectors.forEach((v, k) => {
    const w = weights?.[k] ?? 1;
    for (let i = 0; i < dims; i++) acc[i] += v[i] * w;
  });
  return normalize(acc);
}

/**
 * Stores a vector as text in about a third of the space of float32: one
 * scale and one signed byte per dimension, in base64. Cosine similarity is
 * almost unchanged (the error per dimension is under 0.5%).
 */
export function packVector(v: ArrayLike<number>): string {
  let max = 0;
  for (let i = 0; i < v.length; i++) max = Math.max(max, Math.abs(v[i]));
  const scale = max / 127 || 1;
  const bytes = new Uint8Array(v.length);
  for (let i = 0; i < v.length; i++) {
    const q = Math.max(-127, Math.min(127, Math.round(v[i] / scale)));
    bytes[i] = q & 0xff;
  }
  return `${scale.toPrecision(8)}:${toBase64(bytes)}`;
}

export function unpackVector(s: string): Float32Array | null {
  const at = s.indexOf(':');
  if (at < 1) return null;
  const scale = Number(s.slice(0, at));
  if (!Number.isFinite(scale)) return null;
  const bytes = fromBase64(s.slice(at + 1));
  if (!bytes) return null;
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = ((bytes[i] << 24) >> 24) * scale;
  return normalize(out);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

function fromBase64(s: string): Uint8Array | null {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    let n = 0;
    for (let j = 0; j < 4; j++) {
      const c = clean[i + j];
      const v = c === undefined ? 0 : B64.indexOf(c);
      if (v < 0) return null;
      n = (n << 6) | v;
    }
    if (o < out.length) out[o++] = (n >> 16) & 0xff;
    if (o < out.length) out[o++] = (n >> 8) & 0xff;
    if (o < out.length) out[o++] = n & 0xff;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Words

const STOPWORDS = new Set(
  (
    'a an and are as at be but by for from had has have he her his i if in into is it its me my ' +
    'of on or our she so that the their them then there they this to was we were what when where ' +
    'which who will with you your about all just not do did does been than too very can'
  ).split(' '),
);

/** Lower-case words without accents or stopwords: "Théo's dreams" → ["theo", "dreams"]. */
export function searchTerms(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

/**
 * How well an entry's words match the query, from 0 to 1: the share of query
 * words found (a word of 4+ letters also matches as a prefix, so "dream"
 * finds "dreaming"), with a bonus when the whole phrase appears.
 */
export function wordScore(query: string, e: SearchableEntry): number {
  const terms = searchTerms(query);
  if (!terms.length) return 0;
  const hay = [e.body, e.quoteText ?? '', e.bookTitle ?? ''].join(' ');
  const words = new Set(searchTerms(hay));
  let found = 0;
  for (const t of terms) {
    if (words.has(t)) found++;
    else if (t.length >= 4) {
      for (const w of words) {
        if (w.startsWith(t)) {
          found++;
          break;
        }
      }
    }
  }
  const share = found / terms.length;
  const phrase = query.trim().toLowerCase();
  const bonus = phrase.length > 3 && hay.toLowerCase().includes(phrase) ? 0.2 : 0;
  return Math.min(1, share + bonus);
}

// ---------------------------------------------------------------------------
// Ranking

export type MatchedBy = 'words' | 'meaning' | 'both';

export type SearchHit = { id: string; score: number; matchedBy: MatchedBy };

/**
 * Ranks entries for a query. With a query vector, closeness in meaning
 * leads and matching words add to it; without one (no model on this phone),
 * words alone decide. `vectors` holds each entry's piece vectors.
 */
export function rankEntries(
  query: string,
  entries: SearchableEntry[],
  queryVector: ArrayLike<number> | null,
  vectors: Map<string, Float32Array[]>,
): SearchHit[] {
  const hits: (SearchHit & { at: string })[] = [];
  for (const e of entries) {
    const words = wordScore(query, e);
    let sim = 0;
    if (queryVector) {
      for (const v of vectors.get(e.id) ?? []) sim = Math.max(sim, dot(queryVector, v));
    }
    const close = queryVector !== null && sim >= MIN_SIMILARITY;
    if (words <= 0 && !close) continue;
    // Similarity of unrelated MiniLM sentences sits near 0.1 to 0.25; spread 0.2 to 0.7 over 0 to 1.
    const meaning = Math.max(0, Math.min(1, (sim - 0.2) / 0.5));
    const score = queryVector ? 0.7 * meaning + 0.3 * words : words;
    const matchedBy: MatchedBy = words > 0 && close ? 'both' : close ? 'meaning' : 'words';
    hits.push({ id: e.id, score, matchedBy, at: e.createdAt });
  }
  hits.sort((a, b) => b.score - a.score || (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return hits.map(({ id, score, matchedBy }) => ({ id, score, matchedBy }));
}
