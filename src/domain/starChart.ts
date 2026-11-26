import { constellationPoints, matchShelfBook, pathProgress, type PathStarState } from './paths';
import { mulberry32 } from './random';
import { hash } from './sky';

/**
 * The reader's sky as a star chart. Every finished book is a star. Books that
 * belong to a reading path are joined into that path's constellation, and a
 * path read end to end is named on the chart. Books outside any path are
 * lone stars between the constellations. Nights read live in the Moon Log,
 * not here.
 */

type ChartBook = {
  id: string;
  olWorkKey: string | null;
  title: string;
  author: string | null;
  status: string;
  currentPage?: number;
  pageCount?: number | null;
  finishedAt?: string | null;
};

type ChartPath = {
  id: string;
  title: string;
  joinedAt: string | null;
  source: string;
  books: { olWorkKey: string | null; title: string; author: string | null }[];
};

export type ChartStar = {
  /** Shelf book id, or null for a book in the path not yet on the shelf. */
  bookId: string | null;
  title: string;
  author: string | null;
  state: PathStarState;
  /** 0..1, page by page. */
  fill: number;
  x: number;
  y: number;
  r: number;
  finishedAt: string | null;
  /** 0 cool to 1 warm: longer books burn warmer. */
  warmth: number;
  /** How far away this star is: 0 nearest, 1 farthest. */
  z: number;
};

export type ChartConstellation = {
  pathId: string;
  title: string;
  complete: boolean;
  finished: number;
  total: number;
  /** When its last star was lit, for complete constellations. */
  completedAt: string | null;
  stars: ChartStar[];
  /** Where its name is lettered: centred under the shape. */
  label: { x: number; y: number };
  /** The box it was drawn in, for centring the camera on it. */
  box: { x: number; y: number; w: number; h: number };
  /** How far away the constellation is: 0 nearest, 1 farthest. Its stars sit around it. */
  z: number;
};

export type StarChart = {
  width: number;
  height: number;
  constellations: ChartConstellation[];
  lone: ChartStar[];
  /** Books finished, in paths or not. */
  booksFinished: number;
};

/** Bigger books are bigger stars, within a narrow range so none shouts. */
export function starRadius(pageCount: number | null | undefined, state: PathStarState): number {
  if (state === 'none') return 2.2;
  if (state === 'shelf') return 2.6;
  const pages = pageCount && pageCount > 0 ? pageCount : 200;
  return 3.2 + Math.min(pages / 450, 1) * 2.6;
}

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

/** Nearer stars look bigger: from 140% at the front to 65% at the back. */
export function depthSize(z: number): number {
  return 1.4 - 0.75 * z;
}

/**
 * How far a thing at depth `z` shifts from where it is drawn, given how far
 * the chart has been dragged from where it opened and the phone's tilt.
 * Depth 0.5 sits still with the chart; nearer things move a little more and
 * farther ones a little less, so constellations slide past one another.
 */
export function depthShift(
  z: number,
  dx: number,
  dy: number,
  tiltX: number,
  tiltY: number,
): { x: number; y: number } {
  'worklet';
  const k = 0.5 - z;
  return { x: dx * k * 0.45 - tiltX * k * 14, y: dy * k * 0.45 - tiltY * k * 14 };
}

export type Shift = (z: number) => { x: number; y: number };

/** Short books burn cool, long ones warm: 0 at 80 pages or fewer, 1 at 450 or more. */
export function starWarmth(pageCount: number | null | undefined): number {
  const pages = pageCount && pageCount > 0 ? pageCount : 200;
  return Math.min(Math.max((pages - 80) / 370, 0), 1);
}

/** The book finished most recently on the chart: the one star that breathes. */
export function newestStar(chart: StarChart): ChartStar | null {
  let best: ChartStar | null = null;
  for (const s of [...chart.constellations.flatMap((c) => c.stars), ...chart.lone]) {
    if (s.state === 'finished' && s.finishedAt && (!best || s.finishedAt > (best.finishedAt ?? ''))) best = s;
  }
  return best;
}

/**
 * Lays the chart out for a viewport. The chart is larger than the screen once
 * there is more than a couple of constellations, so the reader wanders it.
 */
export function layoutStarChart(
  paths: ChartPath[],
  shelf: ChartBook[],
  viewport: { width: number; height: number },
): StarChart {
  // A path earns a place on the chart once one of its books is finished.
  const shown = paths
    .map((p) => ({ path: p, progress: pathProgress(p.books, shelf) }))
    .filter(({ progress }) => progress.finished > 0)
    .sort((a, b) => Number(b.progress.complete) - Number(a.progress.complete));

  // Cells a little narrower than the screen, so a neighbour always peeks in
  // from the side and the reader knows there is more sky to wander.
  const cellW = viewport.width * 0.66;
  const cellH = Math.max(220, viewport.height * 0.52);
  const cols = shown.length > 1 ? 2 : 1;
  const rows = Math.max(1, Math.ceil(shown.length / cols));
  const pad = 24;
  const width = Math.max(viewport.width, cols * cellW + pad * 2);
  const height = Math.max(viewport.height, rows * cellH + cellH * 0.22 + pad * 2);
  const offsetX = (width - cols * cellW) / 2;
  const offsetY = (height - rows * cellH) / 2;

  const used = new Set<string>();
  const constellations: ChartConstellation[] = shown.map(({ path, progress }, i) => {
    // A completed constellation hangs nearer; one still being read is farther off.
    const z = progress.complete ? 0.08 + hash(`${path.id}:z`) * 0.3 : 0.55 + hash(`${path.id}:z`) * 0.3;
    // Odd rows shift a little, so the chart reads as a sky, not a grid.
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jx = (hash(`${path.id}:cx`) - 0.5) * cellW * 0.1;
    const jy = (hash(`${path.id}:cy`) - 0.5) * cellH * 0.1;
    const box = {
      x: offsetX + col * cellW + cellW * 0.08 + jx,
      y: offsetY + row * cellH + cellH * 0.04 + jy + (col % 2) * cellH * 0.22,
      w: cellW * 0.84,
      h: cellH * 0.66,
    };
    const points = constellationPoints(path.id, path.books.length);
    // One seeded stream per path, so each star's depth is its own and the same on every phone.
    const spread = mulberry32(Math.floor(hash(`${path.id}:depth`) * 4294967295));
    const stars = path.books.map((entry, k) => {
      const book = matchShelfBook(entry, shelf);
      if (book) used.add(book.id);
      const state = progress.states[k];
      // Each star sits a little nearer or farther than its constellation, so the shape has volume.
      const sz = clamp01(z + (spread() - 0.5) * 0.8);
      return {
        bookId: book?.id ?? null,
        title: book?.title ?? entry.title,
        author: book?.author ?? entry.author,
        state,
        fill: progress.fills[k],
        x: box.x + points[k].x * box.w,
        y: box.y + points[k].y * box.h,
        r: starRadius(book?.pageCount, state) * depthSize(sz),
        finishedAt: book?.finishedAt ?? null,
        warmth: starWarmth(book?.pageCount),
        z: sz,
      };
    });
    const finishedDates = stars.map((s) => s.finishedAt).filter((d): d is string => !!d);
    return {
      pathId: path.id,
      title: path.title,
      complete: progress.complete,
      finished: progress.finished,
      total: progress.total,
      completedAt: progress.complete && finishedDates.length ? finishedDates.sort().at(-1)! : null,
      stars,
      // Named just under its lowest star, centred on the shape.
      label: {
        x: (Math.min(...stars.map((t) => t.x)) + Math.max(...stars.map((t) => t.x))) / 2,
        y: Math.max(...stars.map((t) => t.y)) + 24,
      },
      box,
      z,
    };
  });

  // Finished books outside any shown path: lone stars in the open sky.
  const loose = shelf.filter((b) => b.status === 'finished' && !used.has(b.id));
  const keepOut = constellations.map((c) => ({
    x: c.box.x - 16,
    y: c.box.y - 16,
    w: c.box.w + 32,
    h: c.box.h + 56,
  }));
  const lone: ChartStar[] = [];
  for (const b of loose) {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 24; attempt++) {
      x = pad + hash(`${b.id}:x${attempt}`) * (width - pad * 2);
      y = pad + hash(`${b.id}:y${attempt}`) * (height - pad * 2);
      const clear =
        !keepOut.some((k) => x > k.x && x < k.x + k.w && y > k.y && y < k.y + k.h) &&
        !lone.some((s) => Math.hypot(s.x - x, s.y - y) < 48);
      if (clear) break;
    }
    const lz = 0.3 + hash(`${b.id}:z`) * 0.65;
    lone.push({
      bookId: b.id,
      title: b.title,
      author: b.author,
      state: 'finished',
      fill: 1,
      x,
      y,
      r: starRadius(b.pageCount, 'finished') * depthSize(lz),
      finishedAt: b.finishedAt ?? null,
      warmth: starWarmth(b.pageCount),
      z: lz,
    });
  }

  return {
    width,
    height,
    constellations,
    lone,
    booksFinished: shelf.filter((b) => b.status === 'finished').length,
  };
}

export type ChartHit =
  { kind: 'book'; star: ChartStar; pathId: string | null } | { kind: 'path'; pathId: string };

/**
 * What a tap at (x, y) in chart space lands on: a star first, then a
 * constellation's name or the space around its shape. Null is open sky.
 */
export function hitStarChart(
  chart: StarChart,
  x: number,
  y: number,
  slop = 26,
  shift: Shift = () => ({ x: 0, y: 0 }),
): ChartHit | null {
  // Stars are drawn shifted by their depth; test against where they are seen.
  const at = (s: ChartStar) => {
    const o = shift(s.z);
    return Math.hypot(s.x + o.x - x, s.y + o.y - y);
  };
  let best: { star: ChartStar; pathId: string | null; d: number } | null = null;
  for (const c of chart.constellations) {
    for (const s of c.stars) {
      const d = at(s);
      if (d <= slop && (!best || d < best.d)) best = { star: s, pathId: c.pathId, d };
    }
  }
  for (const s of chart.lone) {
    const d = at(s);
    if (d <= slop && (!best || d < best.d)) best = { star: s, pathId: null, d };
  }
  if (best) return { kind: 'book', star: best.star, pathId: best.pathId };
  for (const c of chart.constellations) {
    const o = shift(c.z);
    const px = x - o.x;
    const py = y - o.y;
    const nearLabel = Math.abs(px - c.label.x) < c.box.w / 2 && Math.abs(py - c.label.y) < 22;
    const inBox = px > c.box.x && px < c.box.x + c.box.w && py > c.box.y && py < c.box.y + c.box.h;
    if (nearLabel || inBox) return { kind: 'path', pathId: c.pathId };
  }
  return null;
}

/** Which constellation to open the chart on: the last one completed, else the furthest along. */
export function homeConstellation(chart: StarChart): ChartConstellation | null {
  const done = chart.constellations
    .filter((c) => c.complete)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  if (done[0]) return done[0];
  return [...chart.constellations].sort((a, b) => b.finished / b.total - a.finished / a.total)[0] ?? null;
}

/** Paths the chart considers: followed, made by the reader, or already read end to end. */
export function chartPaths<P extends ChartPath>(paths: P[], shelf: ChartBook[]): P[] {
  return paths.filter(
    (p) => p.joinedAt || p.source === 'user' || (p.books.length && pathProgress(p.books, shelf).complete),
  );
}
