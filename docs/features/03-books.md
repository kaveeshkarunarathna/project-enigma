# Phase 3: Book search and the shelf

**Status:** shipped

## What it does

- **Find a book** (`/search`): type a title or author and results appear from
  the Open Library catalog after a short pause. Tap a result for two choices:
  **Reading now** or **Want to read**. Books already on the shelf show a teal
  check.
- **Add by hand** (`/book/new`): for books the catalog lacks. Only the title is
  required; pages and chapters help light the chapter ring.
- **Your shelf** (`/shelf`): books grouped as Reading now, Want to read, Resting
  and Finished, each with a one-line italic caption such as "Page 42 of 300" or
  "Finished Nov 2026".
- **Book page** (`/book/[id]`): cover, ring lights, percent read, stardust and
  minutes; a **Read now** button; fields for current page, total pages,
  chapters done and total chapters; and quiet shelf actions (finish, rest,
  read again, move to want to read, remove).
- **Tonight** now shows the book you are most likely to pick up, with a
  **Read now** button, plus any other books you are reading. The shelf is one
  tap away from the top right.

Search can also add a book to a reader-made path (`/search?pathId=...`), which
phase 8 uses.

## Open Library

`src/services/openLibrary.ts` calls `search.json` asking only for catalog
fields: `key, title, author_name, cover_i, first_publish_year,
number_of_pages_median, edition_count`. Covers load from
`covers.openlibrary.org`. **No book text is ever requested or stored.**

- Requests send an app User-Agent, as Open Library asks.
- Results are de-duplicated by work and malformed entries are skipped.
- Errors become calm messages: offline ("You can still add the book by hand"),
  slow ("The catalog took too long to answer") or server trouble.
- Typing quickly cancels the earlier request.

## Design notes

- Covers sit at 2:3 with a hairline edge. A missing or broken cover becomes a
  night tile with the title's first letter, so lists never show broken images.
- One primary (starlight) button per screen: **Find a book** when empty and
  **Read now** on Tonight and the book page.
- Removing a book asks first and explains that its sessions stay in the Moon
  Log.

## Tests

`src/__tests__/openLibrary.test.ts` covers parsing, de-duplication, author
joining, cover URLs, the "catalog fields only" request, and the friendly
offline and server errors.

## How to test

1. On Tonight, tap **Find a book** and search "Meditations".
2. Tap a result and choose **Reading now**. You land on the book page.
3. Go back to Tonight: the book is there with **Read now**.
4. Turn on airplane mode and search again: you get the offline message and the
   "Add it by hand" link still works.
