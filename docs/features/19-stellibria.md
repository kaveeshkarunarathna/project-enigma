# Phase 19: The app is named Stellibria

**Status:** shipped

The app's working names were Night Atlas (in the app) and Orrery (on the share
card). Its name is now **Stellibria**, pronounced stel-LEE-brah. The repository
keeps its code name, `project-enigma`.

## What changed

- **App name** on the home screen, in permission prompts, notifications,
  settings, the journal export and the backup share sheet: Stellibria.
- **Share card wordmark** (`CARD_WORDMARK`): STELLIBRIA.
- **App IDs** in `app.json`:
  - Android package and iOS bundle ID: `com.stellibria.app`
  - Expo slug and deep link scheme: `stellibria` (links look like
    `stellibria://...`)
- **Backups** are now saved as `stellibria-2026-11-21.json` and marked
  `app: "stellibria"`. Backups made before the rename (`night-atlas-*.json`)
  still restore.
- **Open Library and Gutenberg** requests identify the app as `Stellibria/0.1`.
- **Store listing draft** in [docs/STORE-LISTING.md](../STORE-LISTING.md), with
  the title "Stellibria: Reading Tracker".
- README, privacy policy draft and design system docs use the new name.

## Kept on purpose

- The on-phone database file is still `night-atlas.db`. Readers never see it,
  and renaming it would leave existing test data behind.
- Earlier feature notes (phases 1 to 17) keep the name they shipped under, as a
  record.
- The "Night Atlas" design idea (books as stars, paths as constellations) is
  still the concept; only the product name changed.

## Before release (for Kaveesh)

- The app ID change means a phone with an older dev build installs Stellibria
  as a separate app. Expo Go is not affected.
- The Android package can never change once the app is on Google Play, so
  confirm `com.stellibria.app` before the first upload.
- Check the name is free: Play Store and App Store search, the domains
  stellibria.com / stellibria.app, trademark search (USPTO, WIPO Global Brand
  Database), and social handles (@stellibria).
