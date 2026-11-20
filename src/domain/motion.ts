/**
 * Motion maths shared by the sky and its tests. Worklets, so they run on the
 * UI thread inside Reanimated and Skia.
 */

/** Stars are split into this many twinkle groups, each with its own phase. */
export const TWINKLE_GROUPS = 4;
/** Twinkles per sky cycle (60 s), per group: periods of 12, 10, 8.6 and 15 seconds. */
const CYCLES = [5, 6, 7, 4];

/**
 * A group's brightness at `t` (0..1 through the sky cycle): between 0.82 and
 * 1, so a star softens but never blinks out. Starts and ends each cycle on
 * the same value, so the loop has no seam.
 */
export function twinkle(t: number, group: number): number {
  'worklet';
  const cycles = CYCLES[group % CYCLES.length];
  // Uneven offsets, so no two groups start the cycle at the same brightness.
  const phase = (group * 0.37) % 1;
  return 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t * cycles + phase)));
}

/** 0..1 eased: slow out, as light settles. */
export function easeOutCubic(t: number): number {
  'worklet';
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - c) ** 3;
}

/** The value a counter shows `t` (0..1) of the way from `from` to `to`, as whole numbers. */
export function countAt(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * easeOutCubic(t));
}
