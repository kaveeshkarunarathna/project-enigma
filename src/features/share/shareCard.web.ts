import type { RefObject } from 'react';

import type { CardView } from './SkyCard';
import type { CardShape } from '@/domain/skyCard';

/** On the web the card is a preview only; the image is made on the phone. */
export const CAN_SHARE_CARD = false;

export async function shareCard(_ref: RefObject<CardView | null>, _shape: CardShape): Promise<boolean> {
  return false;
}
