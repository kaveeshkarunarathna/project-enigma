import { Platform, TurboModuleRegistry } from 'react-native';

import type { EmbedFn } from '@/data/meaning';

/**
 * The on-device embedding model behind search by meaning:
 * all-MiniLM-L6-v2 (384 dimensions, int8, about 25 MB), run by
 * react-native-executorch on the phone's CPU (XNNPACK) on Android and iOS.
 *
 * - The model is downloaded once, only after the reader turns search by
 *   meaning on. The download sends nothing of theirs: it is a plain file
 *   fetch, with the library's download counter switched off.
 * - Every embedding runs on the phone. No text ever leaves it.
 * - It reads only the reader's own words (see `embeddableText`), never a
 *   quoted passage from a book.
 *
 * The native module is missing in Expo Go and on the web. The library is
 * then never loaded and search falls back to words alone.
 */

type Executorch = typeof import('react-native-executorch');
type TextEmbedder = Awaited<ReturnType<Executorch['createTextEmbedder']>>;
type ModelFiles = { modelPath: string; tokenizerPath: string };

export function meaningSupported(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return TurboModuleRegistry.get('RnExecutorch') != null;
  } catch {
    return false;
  }
}

let lib: Executorch | null = null;
function executorch(): Executorch {
  if (!lib) {
    // Required lazily: importing it without the native module throws.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require('react-native-executorch') as Executorch;
    lib.setTelemetryEnabled(false);
  }
  return lib;
}

function modelSource(): ModelFiles {
  const m = executorch().models.textEmbeddings.ALL_MINILM_L6_V2.XNNPACK_INT8;
  return { modelPath: m.modelPath, tokenizerPath: m.tokenizerPath };
}

export type { ModelFiles };

/**
 * Fetches the model files once (a no-op when they are already on the
 * phone) and returns where they are. Progress goes from 0 to 1. An
 * interrupted download resumes.
 */
export async function downloadModel(
  onProgress?: (p: number) => void,
  signal?: AbortSignal,
): Promise<ModelFiles> {
  return executorch().download(modelSource(), { onProgress, signal });
}

let loaded: { key: string; model: Promise<TextEmbedder> } | null = null;

/** Loads the model from its files into memory, once. */
export async function getEmbed(files: ModelFiles): Promise<EmbedFn> {
  const key = `${files.modelPath}|${files.tokenizerPath}`;
  if (!loaded || loaded.key !== key) {
    const model = executorch().createTextEmbedder(files);
    loaded = { key, model };
    model.catch(() => {
      if (loaded?.model === model) loaded = null;
    });
  }
  const model = await loaded.model;
  return (text: string) => model.embed(text);
}

/** Frees the model's memory and deletes its files from the phone. */
export async function removeModel(files: ModelFiles | null): Promise<void> {
  const current = loaded;
  loaded = null;
  if (current) {
    try {
      (await current.model).dispose();
    } catch {
      // it never loaded
    }
  }
  if (!files || !meaningSupported()) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Blob = (require('react-native-blob-util') as typeof import('react-native-blob-util')).default;
  for (const path of [files.modelPath, files.tokenizerPath]) {
    try {
      await Blob.fs.unlink(path.replace(/^file:\/\//, ''));
    } catch {
      // already gone
    }
  }
}
