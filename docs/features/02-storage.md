# Phase 2: On-device storage

**Status:** shipped

## What it does

Everything the reader creates is saved in a SQLite database on the phone
(`night-atlas.db`). There are no accounts and nothing leaves the device.

## Tables

| Table | Holds |
| --- | --- |
| `books` | The shelf: title, author, cover, page and chapter counts, status, current page, chapters done, stardust |
| `sessions` | Each reading session: book, night, start and end, seconds read, pages, chapters, stardust earned |
| `nights` | One row per night with reading, with the goal copied in so changing the goal never rewrites old moons |
| `journal_entries` | Reflections, notes and quotes. Quotes hold a short passage, its page, and whether it was typed or scanned |
| `paths` and `path_books` | Reading paths. **Curated and reader-made paths share one structure** (`source` is `curated` or `user`) |
| `settings` | Small key-value settings, stored as JSON |

Migrations live in `src/data/migrations.ts` and run in order using
`PRAGMA user_version`. A shipped migration is never edited; changes are added
as a new migration.

## Rules built into the data layer

- **Nights roll over at 4 AM.** Reading at 1 AM counts towards the evening
  before (`src/domain/time.ts`).
- **Every session counts.** However short it is, it adds minutes to tonight's
  moon and stardust to its book.
- **Pages never move backwards.** Logging an earlier page keeps the furthest
  page reached.
- **Quotes stay short.** Up to 60 words is fine, 61 to 120 gets a gentle nudge
  to trim, and more than 120 is not saved (`src/domain/quotes.ts`).
- **Curated paths are read-only.** They are refreshed only when the bundled
  version is newer, and the reader's "joined" state is kept. Reader-made paths
  can be renamed, reordered and deleted.

## Progress rules

These live in `src/domain/progress.ts` and `src/domain/moonlog.ts`:

- A book's ring has one bead per chapter, or one per 20 pages when chapters are
  unknown, up to 24.
- Stardust: 1 per minute read, plus 5 per bead lit.
- A book's star is never fully dark once started, so the first session already
  shows.
- Moon Log: the moon fills against the night's goal. A full moon means the goal
  was met, and a teal halo means the goal plus a reflection. Weeks run Monday to
  Sunday with a target of 4 full moons. The copy never mentions missed nights.

## Using it from screens

```tsx
const db = useDb();
const { data: books } = useLiveQuery(() => listBooks(db, 'reading'), ['books']);
```

Every write calls `notifyChanged(...)` for its tables, and `useLiveQuery`
re-runs any query that reads them, so screens stay current without manual
refreshes.

## Tests

`npm test` runs 28 unit tests. The data tests use a real SQLite database in
memory through Node's built-in `node:sqlite`, with the same schema and
migrations as the app. CI runs typecheck, lint and tests on every push.
