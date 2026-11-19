# Phase 7: Reflection prompts and the thinking journal

**Status:** shipped

## Reflection prompts

`src/content/prompts.ts` holds **60 prompts written in advance**, signed
"Kaveesh". There is no AI at runtime. There are 20 for any book and 10 each for
philosophy, classics, fantasy and science fiction. None quotes or summarises a
book, so they suit whatever the reader has open.

> Kaveesh: these are a first draft in your voice. Edit the wording freely,
> but keep the `id` of a prompt once it ships, because journal entries point
> at it.

`promptFor(night, genre?, offset?)` in `src/domain/prompts.ts` chooses
**tonight's question**. It is the same all night and different each night.
"Another question" steps through the rest, and a genre (used by paths in
phase 8) favours prompts for that genre plus the "any book" ones.

## Journal tab

- **Tonight's question** in Literata italic with the signature, a **Write**
  button (the screen's one starlight button) and **Another question**.
- **Filters:** All, Reflections, Notes, Quotes, plus search across your words
  and quotes.
- **Entries:** date and book, then the words. Quotes show in italic with a teal
  rule and the page. Reflections show the question they answered.
- **+** at the top makes a note or a quote.

## Writing

`/journal/write` handles three kinds:

| Kind | What it holds |
| --- | --- |
| Reflection | Your answer to a prompt. Counts for the teal halo on that night's moon. |
| Note | Free writing. |
| Quote | A short passage you want to keep, the page, whether it was typed or scanned, and an optional "why it stayed with you". |

Each entry can be linked to a book from a row of your books.

**Quote length** follows the rule from phase 2. Up to 60 words is fine. From
61 to 120 a gentle teal note says "Shorter quotes are easier to return to".
Over 120 the note explains the limit and Save is disabled. This keeps quotes
to personal passages, never pages of a book.

`/journal/[id]` edits or deletes an entry, asking before deleting.

## The lamp asks too

After a lamp session, the sheet now shows tonight's question. Answering saves
a **reflection**, which adds the teal halo to tonight's moon when the goal is
met.

## Privacy

Everything stays in the on-device database. Nothing is uploaded, analysed or
summarised.

## Tests

The prompt tests check that ids are unique, that the prompt stays the same
all night and changes between nights, that "Another question" moves on, and
that genre filtering works. The journal data tests (phase 2) cover search,
quotes and the length cap.
