/**
 * Hands a scanned passage back to the screen that opened the scanner. Kept
 * in memory only, and taken once, so the passage is never stored unless the
 * reader saves it as a quote.
 */
export type ScannedPassage = { quote: string; page: number | null };

let pending: ScannedPassage | null = null;

export function handOffPassage(p: ScannedPassage) {
  pending = p;
}

export function takePassage(): ScannedPassage | null {
  const p = pending;
  pending = null;
  return p;
}
