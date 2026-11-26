# Phase 20: Search your journal by meaning

**Status:** shipped (search by meaning needs a development build; word search works everywhere)

The journal could already be searched by its words. But a reader rarely
remembers the words they used. They remember the feeling: "that night I felt
small", "something about my father". This phase lets them find an entry by
what they meant, fully offline, with a small language model that runs on the
phone and only ever reads their own words.

## What the reader sees

- **Journal, search.** The same search box as before. When search by meaning
  is on, results include entries close in meaning, ranked with the ones that
  also share words. An entry found only by meaning carries a quiet
  "close in meaning" after its date. One caption under the box says how it is
  searching ("Finds what you meant, not only the words. Read on this phone.").
  When it is off, that caption points to Settings instead.
- **Settings, Search by meaning.** Off by default. One plain paragraph says
  what it does and what it costs: a one-time download of about 25 MB, then it
  works offline, reads only the reader's own words, never quoted passages, and
  sends nothing anywhere. "Turn on" shows the download's progress and can be
  stopped. "Turn off and remove the model" deletes the model and the index.
  In Expo Go it says it needs the full app; on the web, the phone app.
- While a large journal is first being read (more than three entries), the
  caption says "Getting to know your journal, 12 of 40". One new entry is
  indexed silently.

## How it works

| Piece | Where |
| --- | --- |
| Rules: which text may be embedded, chunking, vector packing, word scoring, ranking | `src/domain/meaning.ts` |
| The index (`journal_vectors`), indexing, search | `src/data/meaning.ts` |
| The model: download, load, embed, remove | `src/services/embedder.ts` (`embedder.web.ts` on the web) |
| On/off, keeping the index in step, `useJournalSearch` | `src/features/meaning/meaning.ts` |
| Screens | `src/app/(tabs)/journal.tsx`, `src/app/settings.tsx` |

1. **Only the reader's own words are embedded.** `embeddableText` returns an
   entry's `body` and nothing else. A quote's passage (`quote_text`) comes from
   a book, so it never goes to the model. Quotes are still found by their
   words, as before. Nothing is ever generated or summarized.
2. **Indexing.** Each entry's words are split into pieces of up to 120 words
   (20 words overlap) so the model reads each piece whole. Each piece becomes
   a 384-number vector, packed as one scale plus one signed byte per number
   (about 520 characters of base64 per piece, cosine error under 0.1%). Rows
   carry the model name and a hash of the words, so an entry is re-read only
   when its words change, and a new model re-reads everything. Indexing runs
   one entry at a time in the background whenever the journal changes.
3. **Searching.** The query is embedded after a 300 ms pause in typing.
   Every entry's best-matching piece is compared by cosine similarity (brute
   force: a few thousand entries take a few milliseconds). Score is
   70% meaning (similarity 0.2 to 0.7 spread over 0 to 1) and 30% words
   (share of query words found, prefixes of 4+ letters count, a bonus for the
   whole phrase). Entries below 0.3 similarity are left out unless their words
   match. Without the model, words alone decide.

## Why this model and runtime

**Chosen: [react-native-executorch](https://github.com/software-mansion/react-native-executorch)
0.11 with all-MiniLM-L6-v2, int8, XNNPACK.**

- Software Mansion (who make Reanimated and Gesture Handler, already in the
  app) maintain it, and it has a ready text embedding pipeline
  (`createTextEmbedder`) with the tokenizer built in. No hand-written
  tokenizer, no C++ of our own.
- all-MiniLM-L6-v2 is the standard small sentence-embedding model: 384
  dimensions, about 25 MB as int8, a few milliseconds per sentence on a
  phone CPU, good English similarity.
- XNNPACK runs on the CPU of every Android and iOS phone and in the Android
  emulator and iOS Simulator, and gives identical vectors on both platforms.
  The app's `package.json` asks the library for only the XNNPACK backend and
  no OpenCV (`"react-native-executorch": { "backends": ["xnnpack"], "libs": [] }`),
  which keeps the app small.
- The library's anonymous download counter is switched off
  (`setTelemetryEnabled(false)`).

Tradeoffs and alternatives considered:

| Option | Why not (for now) |
| --- | --- |
| `onnxruntime-react-native` + MiniLM ONNX | Works, but needs a WordPiece tokenizer written in JS and mean pooling by hand. More code to own. |
| `llama.rn` with a GGUF embedding model | Excellent for LLMs, but a heavier native library than an embedding-only job needs. |
| `react-native-fast-tflite` | No ready text embedding pipeline or tokenizer. |
| Bundling the model in the app | Adds 25 MB to every download, including readers who never turn it on. Can be switched later by pointing `modelSource()` at a bundled asset. |

Costs of the choice:

- Needs the **New Architecture** (already on in SDK 58) and a **development
  build**. Expo Go cannot load it; there, search uses words alone.
- Raises the minimum OS to **Android 8.0 (API 26)** and **iOS 17**
  (`expo-build-properties` in `app.json`). Phones on iOS 16 or older can no
  longer install the app.
- The model is downloaded once from Hugging Face (Software Mansion's model
  repository) when the reader turns it on. That download sends no reader
  data. Searching and indexing never use the network.

## Backups

`journal_vectors` (migration 4) is derived data, so it is **not** in
`BACKUP_TABLES`: backups stay small and identical in shape. After a restore,
the restored entries are indexed again on the new phone. Vectors are removed
with their entry (`ON DELETE CASCADE`), which also clears them when a restore
replaces the journal. The model's file paths are internal app state
(`_meaning`), so a backup never claims a model the new phone does not have.
Backups made by this version say schema 4; older app versions will ask to be
updated before restoring them, as with every schema change.

## Testing it (Mac, iPhone, no Android phone)

Word search and the Settings text can be checked in Expo Go or on the web.
Search by meaning needs a development build:

**iPhone (free Apple ID)**

```
npm install
npx expo run:ios --device
```

Pick the iPhone, sign with your Apple ID in Xcode when asked. Then Settings,
Search by meaning, Turn on (use Wi-Fi), write two or three entries, and search
for a feeling with different words. The iOS Simulator works too
(`npx expo run:ios`).

**Android emulator on the Mac**

```
npx expo run:android
```

with an Android Studio emulator running (API 26 or newer; on Apple silicon use
an arm64 image). The emulator uses the Mac's internet for the one download.

After the first build, JavaScript changes reload with `npx expo start` as
usual. Only adding native libraries needs a new build.

## Tests

`src/__tests__/meaning.test.ts` (17 tests), with a stand-in model where
words that mean alike share a dimension:

- only the reader's words are embedded; quoted passages never reach the model
- chunking, hashing, vector packing round trip, centroid, word scoring
- ranking by meaning and words, words alone without a model
- indexing once, re-indexing on edit, stopping and resuming, a new model
  re-indexing, vectors deleted with their entry
- vectors left out of backups and rebuilt after a restore
- search with kind filters, quotes found by their words
