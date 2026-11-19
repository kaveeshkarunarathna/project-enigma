# Phase 8: Reading paths and constellations

**Status:** shipped

A path is a short, ordered list of books that lead into each other. On screen
it is a **constellation**: one star per book, joined by faint lines. Each star
lights as the reader finishes that book, so the shape appears as they read.

## Curated paths

`src/content/paths.ts` bundles **8 paths, two per genre**:

| Genre | Paths |
| --- | --- |
| Philosophy | First Steps with the Stoics; Questions That Started Everything |
| Classics | Short Classics for Long Evenings; Into the Great Novels |
| Fantasy | Doors into Other Worlds; Myths Retold |
| Science fiction | Classic Science Fiction, Gently; Minds and Machines |

Rules for writing a path:

- It opens with a **short book**, so the first star can light in the first week.
- Each book has a one or two sentence **note in our own words** about why it
  sits there. Notes never quote or summarise the book (see the legal rule in
  the README). Only titles and authors are stored, which are facts.
- Bump `version` when a path changes. `syncCuratedPaths` runs on every launch
  (registered with `onDatabaseReady` in `src/app/_layout.tsx`). It rewrites a
  path only when its seed version is newer, and it **keeps the reader's
  "following" state**.

> Kaveesh: the paths and notes are a first draft. Edit freely, but keep each
> `id` once it ships.

## Your own paths

Readers build paths with the same structure as curated ones (`/paths/new`):

1. Name it, optionally say what ties the books together, and choose a kind of
   book (Philosophy, Classics, Fantasy, Science fiction or Anything).
2. **Create and add books** opens catalog search with `?pathId=`, so picked
   books go into the path.
3. On the path screen they can **move books up and down, remove** them,
   **add** more, **rename** the path or **delete** it. Deleting a path never
   touches the shelf.

## Screens

- **Paths tab** (`src/app/(tabs)/paths.tsx`): "Your paths" (followed and
  self-made) first, then curated paths grouped by genre in a fixed order,
  then "Build your own path". Each card has a mini constellation and a
  caption such as "2 of 5 stars lit".
- **Path screen** (`src/app/paths/[id].tsx`): the large constellation with an
  aurora ring on the next star to read, a summary line, **Follow this path**
  (the screen's one starlight button), then the books in order with their
  notes and shelf state. Tapping a book that is on the shelf opens it.
  Tapping one that is not offers **Start reading** or **Want to read**, which
  adds it through the catalog when online, or from the title and author when
  offline (`src/features/paths/addPathBook.ts`). Adding a book from a curated
  path follows that path.

## Matching path books to the shelf

Curated seeds have no catalog keys, so `matchShelfBook` in
`src/domain/paths.ts` matches by Open Library work key when there is one,
otherwise by **normalised title** (lowercase, no accents or punctuation, no
leading "The/A/An"), using the author's surname to break ties. Star states:

| State | When | Star |
| --- | --- | --- |
| finished | the shelf book is finished | bright, with a candlelight glow |
| reading | the shelf book is being read | soft glow |
| shelf | on the shelf, not started | faint |
| none | not on the shelf | pinprick |

## Constellation shapes

`constellationPoints(pathId, count)` makes a seeded zigzag from left to right:
every path has its own recognisable shape, the same on every phone, with no
stored coordinates. `src/components/sky/Constellation.tsx` draws it with Skia
in a single canvas. Lines between two finished stars are brighter.

## Prompts lean towards your paths

`readerGenre` picks the genre tonight's question leans towards: the genre of a
followed path that holds the book being read, otherwise the most recently
followed path with a genre. The Journal tab and the Lamp's after-session
question both use it through `useReaderGenre`. "Anything" paths do not narrow
the prompts.

## Tests

`src/__tests__/paths.test.ts`: title normalisation, shelf matching (key, title,
surname tie-break), progress counts, stable constellations inside the box,
curated path rules (unique ids, notes, at least four books) and the reader
genre rule. Repository functions for paths are covered in `data.test.ts`.

## Not yet

- Drag to reorder (arrows for now, which are also easier with a screen reader).
- Paid or community paths (see the pricing plan).
