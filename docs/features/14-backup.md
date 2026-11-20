# Phase 14: Keep your sky safe

**Status:** shipped

Everything in Night Atlas lives only on the phone, with no account. That keeps
it private, but a lost phone would take the whole sky with it. This phase adds
a backup the reader keeps themselves, and a way to restore it.

## The backup file

One JSON file, named by date (`night-atlas-2026-11-20.json`), holding every
row the reader made: settings, nights, books, sessions, journal entries,
paths and their books (`BACKUP_TABLES` in `src/domain/backup.ts`).

Left out on purpose:

- **Internal app state**, the settings keys that start with `_` (a running
  lamp, the last backup time). These belong to one phone.
- **Downloaded classics.** They are public-domain texts that can be downloaded
  again, and they would make the file large.

The file carries `app`, `format` (1) and `schema` (the database version), so a
restore can tell whether it understands the file.

## Saving a backup

Settings, "Keep your sky safe", then **Save a backup** (`makeBackup` in
`src/data/backup.ts`, `shareBackup` in `src/features/backup/files.ts`). On the
phone the file goes to the system share sheet, so the reader picks where it
lives: Files, Drive, email to themselves, AirDrop. On the web it downloads.
The app never uploads it anywhere. Settings shows when the last backup was.

A quiet line at the foot of the sky suggests a backup once there is something
worth keeping (7 nights read) and then only every 30 days (`backupDue`).

## Restoring

Settings, then **Restore from a backup** (`src/app/restore.tsx`):

1. The reader picks the file (`expo-document-picker`).
2. `parseBackup` checks it is whole before anything is touched: the right
   app, a format and schema this build understands, and every table a list
   of plain rows. A file from a newer app asks the reader to update first.
3. The screen shows what the backup holds next to what the phone holds now.
   On a phone with nothing on it, the button is simply "Restore it". Otherwise
   it says plainly that restoring replaces everything here.
4. `restoreBackup` replaces all of the reader's rows in **one transaction**:
   if any row fails, nothing changes. Columns an older backup does not have
   take their defaults (for example `books.isbn`), and columns this app does
   not know are dropped.

## Tests

`src/__tests__/backup.test.ts`: a full round trip into an empty database (books
with ISBNs, sessions, journal, own paths, settings and the sky's totals all
match), replacing existing data while keeping the phone's own app state,
rollback on a bad row, older backups without newer columns, refusing broken
or newer files, the summary wording, file names and when to suggest a backup.
