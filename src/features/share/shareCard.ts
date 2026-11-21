import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';

import type { CardView } from './SkyCard';
import { CARD_PIXELS, type CardShape } from '@/domain/skyCard';

/** Sharing the card works on the phone; the web preview only shows it. */
export const CAN_SHARE_CARD = true;

/**
 * Turns the card on screen into a PNG on the phone and hands it to the share
 * sheet (Instagram, TikTok, Messages, Photos...). The image is made on the
 * phone and only leaves it if the reader picks somewhere to send it.
 * Returns false if sharing is not available.
 */
export async function shareCard(ref: RefObject<CardView | null>, shape: CardShape): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const { width, height } = CARD_PIXELS[shape];
  const uri = await captureRef(ref as Parameters<typeof captureRef>[0], {
    format: 'png',
    quality: 1,
    width,
    height,
    result: 'tmpfile',
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Share your reading sky',
  });
  return true;
}
