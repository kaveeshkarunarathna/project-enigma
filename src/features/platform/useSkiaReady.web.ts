import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useEffect, useState } from 'react';

/**
 * The web build (used only for previews and screenshots) has to download
 * Skia's WebAssembly before anything is drawn.
 */
export function useSkiaReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    LoadSkiaWeb({ locateFile: (file: string) => `/${file}` })
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);
  return ready;
}
