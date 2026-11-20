/**
 * The colour of the sky follows the real night: a little purple at dusk,
 * deepest around midnight, a hint of blue before dawn. Daytime keeps the
 * night palette, because the app is a night sky whenever it opens.
 */
export type SkyMood = { top: string; mid: string; floor: string; band: number };

const NIGHT: SkyMood = { top: '#141436', mid: '#18173E', floor: '#2A1E42', band: 1 };
const DUSK: SkyMood = { top: '#22184A', mid: '#2C1D4E', floor: '#43284F', band: 0.6 };
const DAWN: SkyMood = { top: '#16193E', mid: '#1E2148', floor: '#3A3358', band: 0.7 };

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function blend(a: SkyMood, b: SkyMood, t: number): SkyMood {
  const k = Math.max(0, Math.min(1, t));
  return {
    top: mix(a.top, b.top, k),
    mid: mix(a.mid, b.mid, k),
    floor: mix(a.floor, b.floor, k),
    band: a.band + (b.band - a.band) * k,
  };
}

/** The sky at a local time, given as hours from midnight (0 to 24, fractions allowed). */
export function skyMood(hours: number): SkyMood {
  const h = ((hours % 24) + 24) % 24;
  if (h >= 17 && h < 19) return DUSK;
  if (h >= 19 && h < 22) return blend(DUSK, NIGHT, (h - 19) / 3);
  if (h >= 22 || h < 3) return NIGHT;
  if (h >= 3 && h < 6) return blend(NIGHT, DAWN, (h - 3) / 3);
  return NIGHT;
}
