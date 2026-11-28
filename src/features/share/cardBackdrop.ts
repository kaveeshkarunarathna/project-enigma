import { createPicture, drawAsImageFromPicture, Skia, TileMode } from '@shopify/react-native-skia';

import {
  BAND_TINT,
  drawDots,
  drawSparkles,
  FAR_TINT,
  farStars,
  MILKY_SKSL,
  milkyStars,
  sparkleStars,
} from '@/components/sky/Atmosphere';
import { skyMood } from '@/domain/skyMood';
import { CARD_SIZE, type CardShape } from '@/domain/skyCard';

/** Pixels per card unit: the card is shared 1080 wide, and the gas is soft, so twice is plenty. */
const DENSITY = 2;

/** How much larger than the card the nebula is drawn, so its folds are as broad as on the Sky. */
const GAS_SCALE = 1.6;

const cache = new Map<CardShape, string | null>();

/**
 * The Sky's deep space for the card, baked once per shape into a still PNG:
 * the midnight gradient, the same nebula shader, the far star field and a
 * few sparkling stars, in the Sky's own colours. A plain image (not a live
 * Skia canvas) so the card can be captured on any phone. Null if it cannot
 * be drawn here; the card then keeps its plain gradient.
 */
export function cardBackdrop(shape: CardShape): string | null {
  if (cache.has(shape)) return cache.get(shape)!;
  let uri: string | null = null;
  try {
    const { width: w, height: h } = CARD_SIZE[shape];
    const pw = w * DENSITY;
    const ph = h * DENSITY;
    const mood = skyMood(0);
    const picture = createPicture(
      (canvas) => {
        canvas.scale(DENSITY, DENSITY);
        const sky = Skia.Paint();
        sky.setShader(
          Skia.Shader.MakeLinearGradient(
            { x: 0, y: 0 },
            { x: 0, y: h },
            [Skia.Color(mood.top), Skia.Color(mood.mid), Skia.Color(mood.floor)],
            [0, 0.5, 1],
            TileMode.Clamp,
          ),
        );
        canvas.drawRect(Skia.XYWHRect(0, 0, w, h), sky);
        drawDots(canvas, farStars(w, h).baked, FAR_TINT, 0.5);
        const gas = Skia.Paint();
        // The Sky's nebula spans a screen and a half; a card is about one screen, so it shows a part of one
        // at the Sky's own scale, a little softer so the words on top stay easy to read.
        gas.setShader(MILKY_SKSL.makeShader([w * GAS_SCALE, h * GAS_SCALE, mood.band * 0.8]));
        canvas.drawRect(Skia.XYWHRect(0, 0, w, h), gas);
        drawDots(canvas, milkyStars(w, h), BAND_TINT, 0.3);
        drawSparkles(canvas, sparkleStars(w, h));
      },
      { width: pw, height: ph },
    );
    const image = drawAsImageFromPicture(picture, { width: pw, height: ph });
    const data = image?.encodeToBase64();
    uri = data ? `data:image/png;base64,${data}` : null;
  } catch {
    uri = null;
  }
  cache.set(shape, uri);
  return uri;
}
