import { requireOptionalNativeModule } from 'expo';
import { CameraView } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { guessFirstPage } from '@/domain/scan';

/**
 * The page scanner. Text recognition runs on the phone: Apple Vision on iOS,
 * ML Kit on Android (both through `expo-text-extractor`). Pages are captured
 * with the system document scanner (VisionKit on iOS, ML Kit on Android),
 * which finds the page's edges and flattens it, or with a plain photo when
 * that is missing. Photos are never uploaded and never saved to the photo
 * library, and they are deleted as soon as the text is read. Only the lines
 * of text come back, held in memory until the reader keeps a short passage
 * or leaves.
 */

type TextExtractor = { isSupported: boolean; extractTextFromImage: (uri: string) => Promise<string[]> };

// Optional, so the app still runs in Expo Go and on the web, where the
// native module is missing. The scanner then explains it needs the app build.
const extractor = requireOptionalNativeModule<TextExtractor>('ExpoTextExtractor');

export type ScanErrorKind = 'unsupported' | 'permission' | 'unreadable';

export class ScanError extends Error {
  constructor(
    public kind: ScanErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export function scannerAvailable(): boolean {
  return !!extractor?.isSupported;
}

/** The system document scanner: edge finding, flattening, up to two pages. */
export function documentScannerAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return scannerAvailable() && !!CameraView.isDocumentScannerAvailable;
  } catch {
    return false;
  }
}

/**
 * - `book`: the document scanner, pointed at the open book.
 * - `camera`: a plain photo, for phones without the document scanner.
 * - `library`: a photo the reader already took.
 */
export type ScanSource = 'book' | 'camera' | 'library';

export type ScannedText = { lines: string[]; page: number | null };

/** Most a reader needs for one quote: a page, or two when it runs over. */
const MAX_PAGES = 2;

/**
 * Asks for a page (or two) and reads the text. Returns null when the reader
 * cancels. Throws ScanError when the scanner cannot run.
 */
export async function scanPage(source: ScanSource): Promise<ScannedText | null> {
  if (!extractor?.isSupported) {
    throw new ScanError('unsupported', 'The scanner needs the installed app, not Expo Go or the web.');
  }
  const uris = source === 'book' ? await documentPages() : await photo(source);
  if (!uris) return null;
  try {
    const pages: string[][] = [];
    for (const uri of uris.slice(0, MAX_PAGES)) {
      pages.push(await extractor.extractTextFromImage(uri.replace('file://', '')));
    }
    const lines = pages.flat();
    if (!lines.some((l) => l.trim())) {
      throw new ScanError('unreadable', 'No text found. Try again with the page flat and well lit.');
    }
    return { lines, page: guessFirstPage(pages) };
  } catch (e) {
    if (e instanceof ScanError) throw e;
    throw new ScanError(
      'unreadable',
      'The page could not be read. Try again with the page flat and well lit.',
    );
  } finally {
    uris.forEach(discardPhoto);
  }
}

async function documentPages(): Promise<string[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw cameraRefused();
  const result = await CameraView.scanDocumentAsync({ quality: 1, requestPdf: false });
  if (!result?.pages.length) return null;
  // Pages beyond the second are not read, and are deleted with the rest.
  return result.pages;
}

async function photo(source: 'camera' | 'library'): Promise<string[] | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    if (source === 'camera') throw cameraRefused();
    throw new ScanError(
      'permission',
      'Night Atlas needs access to your photos to read a page. You can allow it in Settings.',
    );
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    base64: false,
    exif: false,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return [result.assets[0].uri];
}

function cameraRefused() {
  return new ScanError(
    'permission',
    'Night Atlas needs the camera to read a page. You can allow it in Settings.',
  );
}

/**
 * Deletes the scanner's or picker's working copy of a photo. For a photo
 * chosen from the library this is a copy in the app's cache; the reader's
 * own photo in their library is left alone.
 */
function discardPhoto(uri: string) {
  try {
    // Only ever delete our own copies, inside the app's cache.
    if (
      !uri.startsWith(Paths.cache.uri) &&
      !uri.includes('/ImagePicker/') &&
      !uri.includes('/DocumentScanner/')
    ) {
      return;
    }
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The cache is cleared by the system anyway; nothing else to do.
  }
}
