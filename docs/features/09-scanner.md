# Phase 9: Page scanner for journal quotes

**Status:** shipped (needs a development build to run, see below)

The reader photographs a page, taps the few sentences they want, and those
lines go into a private journal quote with the book and page. It is a faster
way to type a quote, nothing more.

## Privacy and legal rules

These are the hard rules, and the code is built around them:

| Rule | How |
| --- | --- |
| Text is read **on the phone** | `expo-text-extractor`: Apple Vision on iOS, Google ML Kit on Android. No network call, no AI. |
| The **photo is not kept** | It is never saved to the photo library. The picker's working copy is deleted right after the text is read (`discardPhoto` in `src/services/scanner.ts`), and only files in the app's cache can be deleted, so a photo from the reader's library is never touched. |
| The **page is not kept** | The page's text lives only in screen memory. Leaving the scanner throws it away. |
| Only a **short passage** is saved | The reader chooses sentences. The usual quote limits apply: a nudge over 60 words, and over 120 words "Use these lines" is disabled. |
| Quotes stay **private** | A quote is a journal entry on the phone, with `quote_source = 'scanned'`. There is no sharing or export of quotes. |

Nothing summarises, analyses or uploads book text.

## Flow

1. **Keep a quote** (`/journal/write`, kind Quote) has a **Scan the page
   instead** link. It opens `/scan?from=write`.
2. **Scan a page** (`src/app/scan.tsx`) explains what happens, then offers
   **Take a photo** (camera) or **Choose a photo** (library).
3. While reading, it shows "Reading the page…".
4. **Choose the lines**: the page as sentences. Tap one, then another to take
   in the ones between. Tapping the first or last selected sentence lets it
   go. Each sentence is a checkbox for screen readers, and the word count is
   announced as it changes.
5. **Use these lines** hands the passage and the guessed page number back to
   the editor (`src/features/scan/handoff.ts`, in memory and taken once). The
   reader can still edit the text and page before saving.

Opened from anywhere else, the scanner goes on to `/journal/write` itself.

## Text rules

`src/domain/scan.ts`, all pure and tested in `src/__tests__/scan.test.ts`:

- `guessPageNumber`: a first or last line that is only a number ("37",
  "- 214 -") prefills the page field.
- `joinScannedLines`: drops page-number lines, joins words hyphenated across a
  line break, keeps headings in capitals on their own line.
- `splitSentences`: breaks after `.` `!` `?` `…` (and closing quotes) when the
  next word starts a sentence, but not after "Mr." or an initial like "C. S.".
- `tapSentence`: the selection rule above.

## Running it on your devices

The text recognition module is native code, so it does **not** run in Expo
Go. In Expo Go and on the web the scanner says so and offers to type the lines
instead.

**iPhone, with Xcode and a free Apple ID**

1. In Xcode, Settings, Accounts, add your Apple ID.
2. Plug in the iPhone, then run:
   ```bash
   npx expo run:ios --device
   ```
   Choose your iPhone. The first build takes a while.
3. If Xcode asks for a team, open `ios/NightAtlas.xcworkspace`, choose your
   Personal Team under Signing & Capabilities, and run again.
4. On the iPhone: Settings, General, VPN & Device Management, trust your Apple
   ID. With a free Apple ID the app must be rebuilt every 7 days.

The **iOS Simulator** works too (`npx expo run:ios`). It has no camera, so use
**Choose a photo** with an image of a page dragged into the simulator's Photos.

**Android emulator on the Mac**

```bash
npx expo run:android
```

The emulator's camera shows a test scene, so use **Choose a photo** with a
page image dragged onto the emulator. ML Kit's text model comes with Google
Play services, so use an emulator image that includes Google Play.

These builds include `expo-dev-client`, so once installed you can keep using
`npx expo start` and the app reloads like Expo Go.

## Permissions

Set in `app.json` through the `expo-image-picker` plugin. The wording says why
and that the photo is not kept. The microphone permission is turned off.

## Trying the picker without a phone

In development builds (or web builds made with `EXPO_PUBLIC_DEV_TOOLS=1`),
the scanner offers **Try a sample page**: a short page written for the app
(`src/features/scan/sample.ts`), not taken from any book.

## Not yet

- Cropping to a region before reading.
- Choosing part of a sentence directly. For now, trim it in the editor.
