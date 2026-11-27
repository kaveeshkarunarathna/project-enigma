import { solidOfBox, type Vec3 } from './orbit';
import { mulberry32 } from './random';
import { hash } from './sky';
import type { ChartConstellation, ChartPlanet, ChartStar, StarChart } from './starChart';

/**
 * The reader's sky as a small world in 3D. The star chart's layout gives
 * each thing its place across and up; its distance becomes real depth.
 * Constellations keep their own volume, lone stars and planets hang at
 * their own distances, a field of faint far stars fills the space between,
 * and a wide orbit rings the whole scene. A camera turns about the
 * constellation it looks at, so near things swing past far ones as the
 * reader drags. Pure maths and worklets, shared by the scene and its tests.
 */

/** How strongly the scene shows perspective: the camera's distance from what it looks at, in points. */
export const SCENE_FOCAL = 620;
/** Chart points to world points: the chart is a little larger than the screen. */
const WORLD = 0.78;
/** How deep the scene is from its nearest constellation to its farthest. */
const DEPTH = 420;
/** The most the sky tips up or down, in radians. */
export const SCENE_PITCH_LIMIT = 0.6;

export type SceneConstellation = {
  c: ChartConstellation;
  /** The centre of its shape in the world. */
  centre: Vec3;
  /** Its stars in the world, in path order. */
  stars: Vec3[];
  /** Where its name hangs: under its lowest star. */
  label: Vec3;
  /** The radius of the orbit around it. */
  orbit: number;
};

export type Scene = {
  constellations: SceneConstellation[];
  lone: { star: ChartStar; p: Vec3 }[];
  planets: { planet: ChartPlanet; p: Vec3 }[];
  /** Faint far stars filling the space, in three depth bands for cheap drawing. */
  dust: Vec3[][];
  /** The radius of the wide orbit around the whole scene. */
  ring: number;
};

export type SceneCamera = {
  yaw: number;
  pitch: number;
  /** Points per world point at the target's distance. */
  zoom: number;
  /** The point the camera looks at and turns about. */
  target: Vec3;
};

export type Seen = { x: number; y: number; z: number; s: number };

/**
 * Where world point `p` is seen from the camera, in view points about the
 * view's centre. `z` grows away from the reader; `s` is how much nearer
 * things grow. Points behind the camera are pushed far off and tiny.
 */
export function see(p: Vec3, cam: SceneCamera): Seen {
  'worklet';
  const x0 = p.x - cam.target.x;
  const y0 = p.y - cam.target.y;
  const z0 = p.z - cam.target.z;
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = x0 * cy + z0 * sy;
  const z1 = -x0 * sy + z0 * cy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y2 = y0 * cp - z1 * sp;
  const z2 = y0 * sp + z1 * cp;
  const d = SCENE_FOCAL + z2;
  if (d < SCENE_FOCAL * 0.25) return { x: 1e5, y: 1e5, z: z2, s: 0 };
  const s = SCENE_FOCAL / d;
  return { x: x1 * s * cam.zoom, y: y2 * s * cam.zoom, z: z2, s };
}

/** How faint a thing is at seen depth `z`: full near the target, fading with distance. */
export function fog(z: number): number {
  'worklet';
  return Math.min(1, Math.max(0.2, 1 - z / 900));
}

/** Lays the chart out as a world. */
export function layoutScene(chart: StarChart): Scene {
  const cx = chart.width / 2;
  const cy = chart.height / 2;
  const at = (x: number, y: number, z: number): Vec3 => ({
    x: (x - cx) * WORLD,
    y: (y - cy) * WORLD,
    // Near things (z 0) come towards the reader, far ones (z 1) recede.
    z: (z - 0.45) * DEPTH,
  });

  const constellations = chart.constellations.map((c) => {
    const centre = at(c.box.x + c.box.w / 2, c.box.y + c.box.h / 2, c.z);
    const stars = solidOfBox(c.stars, c.box).map((v) => ({
      x: centre.x + v.x * WORLD,
      y: centre.y + v.y * WORLD,
      z: centre.z + v.z * WORLD,
    }));
    const lowest = Math.max(...stars.map((s) => s.y));
    return {
      c,
      centre,
      stars,
      label: { x: centre.x, y: lowest + 26, z: centre.z },
      orbit: Math.max(c.box.w, c.box.h) * 0.5 * WORLD,
    };
  });

  const lone = chart.lone.map((star) => ({ star, p: at(star.x, star.y, star.z) }));
  const planets = chart.planets.map((planet) => ({ planet, p: at(planet.x, planet.y, planet.z) }));

  // Far stars fill a box a little wider than the chart and as deep as the scene.
  const rand = mulberry32(Math.floor(hash('scene:dust') * 4294967295));
  const spanX = chart.width * WORLD * 0.75;
  const spanY = chart.height * WORLD * 0.75;
  const bands: Vec3[][] = [[], [], []];
  for (let i = 0; i < 150; i++) {
    const z = (rand() - 0.25) * DEPTH * 1.6;
    const p = { x: (rand() - 0.5) * 2 * spanX, y: (rand() - 0.5) * 2 * spanY, z };
    bands[z < 0 ? 0 : z < DEPTH * 0.5 ? 1 : 2].push(p);
  }

  return {
    constellations,
    lone,
    planets,
    dust: bands,
    ring: Math.max(chart.width, chart.height) * WORLD * 0.55,
  };
}

/** Where the camera rests: looking at the constellation finished last, face on. */
export function homeCamera(scene: Scene, home: ChartConstellation | null): SceneCamera {
  const c = home ? scene.constellations.find((k) => k.c.pathId === home.pathId) : null;
  return { yaw: 0, pitch: 0, zoom: 1, target: c ? { ...c.centre } : { x: 0, y: 0, z: 0 } };
}

/** The camera that brings a constellation close and face on. */
export function cameraFor(c: SceneConstellation, zoom = 1.45): SceneCamera {
  return { yaw: 0, pitch: 0, zoom, target: { ...c.centre } };
}

export type SceneHit =
  | { kind: 'book'; star: ChartStar; pathId: string | null }
  | { kind: 'planet'; planet: ChartPlanet }
  | { kind: 'path'; pathId: string };

/**
 * What a tap at (x, y) about the view's centre lands on, as things are seen
 * now: the nearest star or planet within reach (nearer things win ties),
 * then the space around a constellation's shape. Null is open sky.
 */
export function hitScene(scene: Scene, cam: SceneCamera, x: number, y: number, slop = 28): SceneHit | null {
  let best: { hit: SceneHit; d: number } | null = null;
  const consider = (hit: SceneHit, p: Vec3, extra = 0) => {
    const q = see(p, cam);
    if (q.s <= 0) return;
    const d = Math.hypot(q.x - x, q.y - y) - extra;
    if (d <= slop && (!best || d < best.d)) best = { hit, d };
  };
  for (const k of scene.constellations) {
    k.stars.forEach((p, i) => consider({ kind: 'book', star: k.c.stars[i], pathId: k.c.pathId }, p));
  }
  for (const l of scene.lone) consider({ kind: 'book', star: l.star, pathId: null }, l.p);
  for (const pl of scene.planets) consider({ kind: 'planet', planet: pl.planet }, pl.p, pl.planet.r * 1.5);
  if (best) return (best as { hit: SceneHit }).hit;

  // The space around a shape, nearest constellation first.
  const around = scene.constellations
    .map((k) => {
      const seen = k.stars.map((p) => see(p, cam)).filter((q) => q.s > 0);
      if (!seen.length) return null;
      const xs = seen.map((q) => q.x);
      const ys = seen.map((q) => q.y);
      const pad = 22;
      const inside =
        x > Math.min(...xs) - pad &&
        x < Math.max(...xs) + pad &&
        y > Math.min(...ys) - pad &&
        y < Math.max(...ys) + pad + 30;
      return inside ? { pathId: k.c.pathId, z: see(k.centre, cam).z } : null;
    })
    .filter((v): v is { pathId: string; z: number } => !!v)
    .sort((a, b) => a.z - b.z);
  return around[0] ? { kind: 'path', pathId: around[0].pathId } : null;
}

/** How squarely a constellation faces the reader, 0 edge on to 1 face on: names fade as shapes turn away. */
export function facing(cam: { yaw: number; pitch: number }): number {
  'worklet';
  return Math.max(0, Math.cos(cam.yaw) * Math.cos(cam.pitch));
}
