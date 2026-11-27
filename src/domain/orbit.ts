/**
 * A constellation seen up close, as a small solid in 3D. Stars keep their
 * places on the chart for x and y, and their distance from the reader
 * becomes real depth, so as the shape turns, near stars swing past far ones.
 * Pure maths and worklets, shared by the close-up view and its tests.
 */

export type Vec3 = { x: number; y: number; z: number };
export type Projected = { x: number; y: number; z: number; s: number };

/** The camera's distance from the shape, in points. Smaller is a stronger perspective. */
export const FOCAL = 520;
/** The most the close-up tips forward or back, in radians. */
export const PITCH_LIMIT = 0.5;
/** How far the close-up rests tipped back, so the orbit reads as a ring and not a line. */
export const REST_PITCH = 0.22;

/**
 * Turns `p` by `yaw` about the vertical axis, then tips it by `pitch` about
 * the horizontal one, and projects it with perspective. `z` grows away from
 * the reader; `s` is how much nearer things grow.
 */
export function project(p: Vec3, yaw: number, pitch: number, focal = FOCAL): Projected {
  'worklet';
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  const s = focal / Math.max(focal + z2, focal * 0.2);
  return { x: x1 * s, y: y2 * s, z: z2, s };
}

/**
 * A constellation's stars as points about its own centre. `depth` is each
 * star's distance (0 near, 1 far), spread so the shape is about as deep as
 * it is wide, which is what makes it read as a solid when it turns.
 */
export function solidOf(
  stars: { x: number; y: number; z: number }[],
  centre: { x: number; y: number },
  span: number,
): Vec3[] {
  if (!stars.length) return [];
  const mean = stars.reduce((n, s) => n + s.z, 0) / stars.length;
  // Stars barely differ in depth on the chart; stretch the difference to the shape's width.
  const spread = Math.max(0.12, ...stars.map((s) => Math.abs(s.z - mean)));
  return stars.map((s) => ({
    x: s.x - centre.x,
    y: s.y - centre.y,
    z: ((s.z - mean) / spread) * span * 0.45,
  }));
}

/** A constellation's solid, centred on the box it was drawn in. */
export function solidOfBox(
  stars: { x: number; y: number; z: number }[],
  box: { x: number; y: number; w: number; h: number },
): Vec3[] {
  return solidOf(stars, { x: box.x + box.w / 2, y: box.y + box.h / 2 }, Math.max(box.w, box.h));
}

/** The radius of a constellation's orbit, in chart points. */
export function orbitRadius(box: { w: number; h: number }): number {
  return Math.max(box.w, box.h) * 0.5;
}

/**
 * Points around an orbit: a circle of `radius` about the centre, lying
 * nearly flat (tipped by `lean`), then seen from the camera. The first
 * point is where the orbit begins, and progress runs from there.
 */
export function orbitPoints(
  radius: number,
  lean: number,
  yaw: number,
  pitch: number,
  count = 72,
  from = 0,
  to = 1,
): Projected[] {
  'worklet';
  const out: Projected[] = [];
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  const n = Math.max(2, Math.round(count * (to - from)));
  for (let i = 0; i <= n; i++) {
    const a = 2 * Math.PI * (from + ((to - from) * i) / n) - Math.PI / 2;
    const x = radius * Math.cos(a);
    const flat = radius * Math.sin(a);
    // A flat ring in the horizontal plane, tipped a little towards the reader.
    out.push(project({ x, y: flat * sl, z: flat * cl }, yaw, pitch));
  }
  return out;
}

/** The scale at which a shape of this size fills about three quarters of the view. */
export function closeUpScale(box: { w: number; h: number }, view: { width: number; height: number }): number {
  const k = Math.min((view.width * 0.74) / Math.max(box.w, 1), (view.height * 0.66) / Math.max(box.h, 1));
  return Math.min(Math.max(k, 0.8), 2.2);
}

/**
 * How lit star `i` is while a close-up lights its stars one after another:
 * 0 until its turn, then up to 1 over one step. `t` counts stars lit so far.
 */
export function igniteAt(t: number, i: number): number {
  'worklet';
  return Math.min(Math.max(t - i, 0), 1);
}

/** The nearest projected star to (x, y) within `slop`, or -1. */
export function hitProjected(points: { x: number; y: number }[], x: number, y: number, slop: number): number {
  let best = -1;
  let bestD = slop;
  points.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}
