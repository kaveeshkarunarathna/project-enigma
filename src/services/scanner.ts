import { requireOptionalNativeModule } from 'expo';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * The page scanner. Text recognition runs on the phone: Apple Vision on iOS,
 * ML Kit on Android (both through `expo-text-extractor`). The photo is never
 * uploaded and never saved to the photo library, and it is deleted as soon as
 * the text is read. Only the lines of text come back, held in memory until
 * the reader keeps a short passage or leaves.
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

export type ScanSource = 'camera' | 'library';

/**
 * Asks for a photo of a page and reads its text. Returns null when the
 * reader cancels. Throws ScanError when the scanner cannot run.
 */
export async function scanPage(source: ScanSource): Promise<string[] | null> {
  if (!extractor?.isSupported) {
    throw new ScanError('unsupported', 'The scanner needs the installed app, not Expo Go or the web.');
  }

  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new ScanError(
      'permission',
      source === 'camera'
        ? 'Night Atlas needs the camera to read a page. You can allow it in Settings.'
        : 'Night Atlas needs access to your photos to read a page. You can allow it in Settings.',
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

  const uri = result.assets[0].uri;
  try {
    const lines = await extractor.extractTextFromImage(uri.replace('file://', ''));
    if (!lines.some((l) => l.trim())) {
      throw new ScanError('unreadable', 'No text found. Try again with the page flat and well lit.');
    }
    return lines;
  } catch (e) {
    if (e instanceof ScanError) throw e;
    throw new ScanError(
      'unreadable',
      'The page could not be read. Try again with the page flat and well lit.',
    );
  } finally {
    discardPhoto(uri);
  }
}

/**
 * Deletes the picker's working copy of the photo. For a photo chosen from
 * the library this is a copy in the app's cache; the reader's own photo in
 * their library is left alone.
 */
function discardPhoto(uri: string) {
  try {
    // Only ever delete the picker's own copy, inside the app's cache.
    if (!uri.startsWith(Paths.cache.uri) && !uri.includes('/ImagePicker/')) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The cache is cleared by the system anyway; nothing else to do.
  }
}
