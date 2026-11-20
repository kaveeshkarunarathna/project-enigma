export type Puff = readonly [cx: number, cy: number, r: number];

type Options = {
  /** Where the flat bottom of the cloud sits. */
  base: number;
  /** A level the outline never drops below between `from` and `to` (a cloud bank's body). */
  shelf?: { y: number; from: number; to: number };
  /** Points sampled along the top edge. More is smoother. */
  samples?: number;
};

/** Height of the top edge at x: the highest puff (or shelf) there, or null if nothing covers x. */
function topAt(x: number, puffs: readonly Puff[], shelf: Options['shelf']): number | null {
  let top: number | null = shelf && x >= shelf.from && x <= shelf.to ? shelf.y : null;
  for (const [cx, cy, r] of puffs) {
    const dx = x - cx;
    if (Math.abs(dx) > r) continue;
    const y = cy - Math.sqrt(r * r - dx * dx);
    if (top == null || y < top) top = y;
  }
  return top;
}

/**
 * One closed outline for a cloud made of round puffs: the top edge follows
 * the union of the puffs and the bottom is flat. Drawing a single shape,
 * rather than overlapping circles, means a soft fill has no seams where the
 * puffs meet.
 */
export function cloudPath(puffs: readonly Puff[], { base, shelf, samples = 72 }: Options): string {
  const lefts = puffs.map(([cx, , r]) => cx - r);
  const rights = puffs.map(([cx, , r]) => cx + r);
  if (shelf) {
    lefts.push(shelf.from);
    rights.push(shelf.to);
  }
  const x0 = Math.min(...lefts);
  const x1 = Math.max(...rights);
  const pts: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const x = x0 + ((x1 - x0) * i) / samples;
    const y = topAt(x, puffs, shelf);
    if (y == null || y >= base) continue;
    pts.push([x, y]);
  }
  if (pts.length < 2) return '';
  const f = (n: number) => Math.round(n * 100) / 100;
  // Start on the base under the first point, rise to it, then run through
  // midpoints with quadratic curves so the edge is smooth.
  let d = `M${f(pts[0][0])} ${f(base)} L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${f(x)} ${f(y)} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${f(last[0])} ${f(last[1])} L${f(last[0])} ${f(base)} Z`;
  return d;
}
