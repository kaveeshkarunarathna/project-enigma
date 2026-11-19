/** On iOS and Android, Skia is part of the native app and is always ready. */
export function useSkiaReady(): boolean {
  return true;
}
