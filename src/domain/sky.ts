/**
 * Layout of the reader's sky. Every night with reading becomes a star, placed
 * along a golden-angle spiral, so the sky fills from the centre outwards and
 * a new star never moves the old ones.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type SkyStar = {
  night: string;
  x: number;
  y: number;
  /** Radius in points. */
  r: number;
  /** 0..1 */
  brightness: number;
};

/** Small stable hash, so each night gets the same jitter on every launch. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Positions come from a fixed spiral, then the whole sky is zoomed so the
 * outermost star sits near the edge. As the sky grows it zooms out: every
 * star keeps its place relative to the others, and a handful of nights still
 * fills the view instead of huddling in the middle.
 */
export function layoutSky(
  nights: { night: string; seconds: number }[],
  width: number,
  height: number,
  goalMinutes = 10,
): SkyStar[] {
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) / 2 - 16;
  const raw = nights.map((n, i) => {
    const jitter = hash(n.night);
    return {
      n,
      radius: Math.sqrt(i + 0.6) * (0.92 + 0.16 * jitter),
      angle: i * GOLDEN_ANGLE + jitter * 0.6,
    };
  });
  // Never zoom in further than a sky of about 12 nights would need.
  const outer = Math.max(Math.sqrt(12), ...raw.map((p) => p.radius));
  const scale = (maxR * 0.9) / outer;
  return raw.map(({ n, radius, angle }) => {
    const ratio = Math.min(n.seconds / (goalMinutes * 60), 2);
    return {
      night: n.night,
      x: cx + radius * scale * Math.cos(angle),
      y: cy + radius * scale * Math.sin(angle),
      r: 1.2 + ratio * 1.1,
      brightness: 0.45 + 0.275 * ratio,
    };
  });
}
