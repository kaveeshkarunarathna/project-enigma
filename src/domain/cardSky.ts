import { fog, layoutScene, see, type SceneCamera } from './scene';
import { homeConstellation, type ChartStar, type StarChart } from './starChart';
import { nightKey } from './time';

/**
 * The reader's sky as the share card shows it: the same star chart and the
 * same 3D world as the Sky screen, seen face on, framed to fit the card.
 * Stars keep the spacing they have on the Sky (one card unit is about one
 * point on a phone), so a big sky is cropped around the constellation the
 * Sky opens on instead of being squeezed until the stars crowd together.
 */

/** The chart is laid out for a phone-sized view, so its spacing matches the Sky screen. */
export const CARD_CHART_VIEWPORT = { width: 360, height: 420 };

/** How far the card may zoom in on a small sky, and out on a big one. */
const MAX_ZOOM = 1.15;
const MIN_ZOOM = 0.45;
/** Room kept inside the sky box: at the sides for halos, below for constellation names. */
const PAD = { x: 22, top: 14, bottom: 34 };

export type CardStar = {
  key: string;
  x: number;
  y: number;
  /** Radius of the star's body in card units. */
  r: number;
  /** 0 unlit, up to 1 finished. */
  light: number;
  finished: boolean;
  /** 0 cool to 1 warm. */
  warmth: number;
  /** How much distance fades it: 1 near, down to 0.2 far. */
  fog: number;
  /** Finished before the period on the card: drawn fainter. */
  old: boolean;
  /** The book finished last: it gets a wider glow. */
  newest: boolean;
};

export type CardThread = {
  key: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Both ends finished: a solid line, else a faint dotted guide. */
  joined: boolean;
  fog: number;
};

/** Room a constellation's name takes on the card, in card units: at most two lines of italic. */
export const NAME_WIDTH = 150;
const NAME_CHAR = 5.9;
const NAME_LINE = 16;

/** Roughly how much room a name takes, so names can be kept apart without measuring text. */
export function nameSize(title: string): { w: number; h: number } {
  const w = title.length * NAME_CHAR;
  return w <= NAME_WIDTH ? { w, h: NAME_LINE } : { w: NAME_WIDTH, h: NAME_LINE * 2 };
}

export type CardName = { key: string; x: number; y: number; title: string; complete: boolean; fog: number };

export type CardSkyLayout = {
  /** Back to front. */
  stars: CardStar[];
  threads: CardThread[];
  names: CardName[];
  zoom: number;
};

type Box = { x: number; y: number; w: number; h: number };

function brightness(s: ChartStar): number {
  if (s.state === 'finished') return 1;
  if (s.state === 'reading') return 0.35 + 0.55 * s.fill;
  return 0;
}

/**
 * Frames `chart` in `box` (card units). `from` is the first night of the
 * card's period, or null for all time: books finished before it are marked
 * old so the card can draw them fainter.
 */
export function cardSky(
  chart: StarChart,
  box: Box,
  from: string | null,
  /** The least zoom before the card crops instead: a short sky box needs more room per star. */
  minZoom = MIN_ZOOM,
): CardSkyLayout {
  const scene = layoutScene(chart);
  const home = homeConstellation(chart);
  const homeAt = home ? scene.constellations.find((k) => k.c.pathId === home.pathId) : undefined;
  // Face on, looking at the depth of the constellation the Sky opens on, as the Sky does.
  const cam: SceneCamera = {
    yaw: 0,
    pitch: 0,
    zoom: 1,
    target: { x: 0, y: 0, z: homeAt ? homeAt.centre.z : 0 },
  };

  const points = [
    ...scene.constellations.flatMap((k) => k.stars.map((p) => see(p, cam))),
    ...scene.lone.map((l) => see(l.p, cam)),
  ].filter((q) => q.s > 0);
  if (!points.length) return { stars: [], threads: [], names: [], zoom: 1 };

  const minX = Math.min(...points.map((q) => q.x));
  const maxX = Math.max(...points.map((q) => q.x));
  const minY = Math.min(...points.map((q) => q.y));
  const maxY = Math.max(...points.map((q) => q.y));
  const inner = { w: box.w - PAD.x * 2, h: box.h - PAD.top - PAD.bottom };
  const fit = Math.min(inner.w / Math.max(maxX - minX, 1), inner.h / Math.max(maxY - minY, 1));
  const zoom = Math.min(MAX_ZOOM, Math.max(minZoom, fit));

  // The whole sky fits: centre it. It does not: centre on the home
  // constellation, but never so far that one side of the card is empty.
  let cx = (minX + maxX) / 2;
  let cy = (minY + maxY) / 2;
  if (fit < minZoom && homeAt) {
    const h = see(homeAt.centre, cam);
    const halfW = inner.w / 2 / zoom;
    const halfH = inner.h / 2 / zoom;
    const clampTo = (v: number, lo: number, hi: number) =>
      lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi);
    cx = clampTo(h.x, minX + halfW, maxX - halfW);
    cy = clampTo(h.y, minY + halfH, maxY - halfH);
  }
  const ox = box.x + PAD.x + inner.w / 2;
  const oy = box.y + PAD.top + inner.h / 2;
  const place = (q: { x: number; y: number }) => ({ x: ox + (q.x - cx) * zoom, y: oy + (q.y - cy) * zoom });
  const inside = (p: { x: number; y: number }, slack = 4) =>
    p.x >= box.x - slack &&
    p.x <= box.x + box.w + slack &&
    p.y >= box.y - slack &&
    p.y <= box.y + box.h + slack;

  let newest: ChartStar | null = null;
  for (const s of [...chart.constellations.flatMap((c) => c.stars), ...chart.lone]) {
    if (s.state === 'finished' && s.finishedAt && (!newest || s.finishedAt > (newest.finishedAt ?? '')))
      newest = s;
  }

  const stars: (CardStar & { z: number })[] = [];
  const threads: CardThread[] = [];
  const names: CardName[] = [];
  const addStar = (s: ChartStar, p: { x: number; y: number; z: number; s: number }, key: string) => {
    const at = place(p);
    if (!inside(at)) return;
    stars.push({
      key,
      ...at,
      // The Sky's own size rule, gently scaled with the frame so a zoomed-out card stays airy.
      r: Math.max(s.r, 2.4) * 0.95 * Math.min(p.s, 2.2) * Math.sqrt(zoom),
      light: brightness(s),
      finished: s.state === 'finished',
      warmth: s.warmth,
      fog: fog(p.z),
      old: !!from && s.state === 'finished' && !!s.finishedAt && nightKey(new Date(s.finishedAt)) < from,
      newest: s === newest,
      z: p.z,
    });
  };

  scene.constellations.forEach((k) => {
    const seen = k.stars.map((p) => see(p, cam));
    seen.forEach((q, j) => {
      if (q.s <= 0) return;
      addStar(k.c.stars[j], q, `${k.c.pathId}:${j}`);
      if (j === 0 || seen[j - 1].s <= 0) return;
      const a = place(seen[j - 1]);
      const b = place(q);
      if (!inside(a, 40) && !inside(b, 40)) return;
      threads.push({
        key: `${k.c.pathId}:${j}`,
        ax: a.x,
        ay: a.y,
        bx: b.x,
        by: b.y,
        joined: k.c.stars[j - 1].state === 'finished' && k.c.stars[j].state === 'finished',
        fog: (fog(seen[j - 1].z) + fog(q.z)) / 2,
      });
    });
    const label = see(k.label, cam);
    const at = place(label);
    // A name is shown only when it sits in the box, under a shape that is mostly in view.
    if (label.s > 0 && at.x > box.x + 30 && at.x < box.x + box.w - 30 && at.y < box.y + box.h + 6) {
      const half = nameSize(k.c.title).w / 2;
      names.push({
        key: k.c.pathId,
        // Kept whole inside the card, even under a shape at its edge.
        x: Math.min(Math.max(at.x, box.x + half + 8), box.x + box.w - half - 8),
        // Names sit a little closer under the shape as the card zooms out.
        y: at.y - (1 - zoom) * 10,
        title: k.c.title,
        complete: k.c.complete,
        fog: fog(label.z),
      });
    }
  });
  scene.lone.forEach((l, i) => {
    const q = see(l.p, cam);
    if (q.s > 0) addStar(l.star, q, `lone:${l.star.bookId ?? i}`);
  });

  // Far things first, so nearer stars pass in front.
  stars.sort((a, b) => b.z - a.z);
  // Names never sit on top of one another or of a star: read paths are named
  // first, and a name with no room is left out rather than crowding the sky.
  const kept: { x: number; y: number; w: number; h: number }[] = [];
  const shown = [...names]
    .sort((a, b) => Number(b.complete) - Number(a.complete) || b.fog - a.fog)
    .filter((n) => {
      const size = nameSize(n.title);
      const rect = { x: n.x - size.w / 2, y: n.y - 2, w: size.w, h: size.h };
      const hits =
        kept.some(
          (o) =>
            rect.x < o.x + o.w + 6 &&
            o.x < rect.x + rect.w + 6 &&
            rect.y < o.y + o.h + 2 &&
            o.y < rect.y + rect.h + 2,
        ) ||
        stars.some(
          (s) =>
            s.x > rect.x - s.r &&
            s.x < rect.x + rect.w + s.r &&
            s.y > rect.y - s.r &&
            s.y < rect.y + rect.h + s.r,
        );
      if (!hits) kept.push(rect);
      return !hits;
    });

  return {
    stars: stars.map(({ z: _z, ...s }) => s),
    threads,
    names: names.filter((n) => shown.includes(n)),
    zoom,
  };
}
