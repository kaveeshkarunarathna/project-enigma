import type { EmbedFn } from '@/data/meaning';

export type ModelFiles = { modelPath: string; tokenizerPath: string };

/** The web build has no on-device model, so search uses words alone. */
export function meaningSupported(): boolean {
  return false;
}

export async function downloadModel(): Promise<ModelFiles> {
  throw new Error('Search by meaning works in the phone app.');
}

export async function getEmbed(): Promise<EmbedFn> {
  throw new Error('Search by meaning works in the phone app.');
}

export async function removeModel(_files: ModelFiles | null): Promise<void> {}
