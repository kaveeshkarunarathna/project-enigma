import { cameraFor, fog, hitScene, homeCamera, layoutScene, see } from '@/domain/scene';
import { chartPaths, homeConstellation, layoutStarChart } from '@/domain/starChart';

const book = (id: string, title: string, status: string, finishedAt: string | null = null) => ({
  id,
  olWorkKey: null,
  title,
  author: null,
  status,
  pageCount: 200,
  finishedAt,
});
const shelf = [
  book('a', 'One', 'finished', '2026-01-01T00:00:00Z'),
  book('b', 'Two', 'finished', '2026-02-01T00:00:00Z'),
  book('c', 'Three', 'reading'),
  book('d', 'Loose', 'finished', '2026-03-01T00:00:00Z'),
];
const entry = (title: string) => ({ olWorkKey: null, title, author: null });
const paths = [
  { id: 'done', title: 'Done path', joinedAt: null, source: 'curated', books: [entry('One'), entry('Two')] },
  {
    id: 'going',
    title: 'Going path',
    joinedAt: '2026-01-01',
    source: 'curated',
    books: [entry('Two'), entry('Three')],
  },
];
const chart = layoutStarChart(chartPaths(paths, shelf), shelf, { width: 400, height: 500 });
const scene = layoutScene(chart);

describe('sky scene', () => {
  it('puts every star, lone star and far star in the world', () => {
    expect(scene.constellations).toHaveLength(2);
    expect(scene.constellations[0].stars).toHaveLength(2);
    expect(scene.lone.map((l) => l.star.title)).toEqual(['Loose']);
    expect(scene.dust.flat().length).toBe(150);
  });

  it('gives a constellation real depth', () => {
    const zs = scene.constellations[0].stars.map((p) => p.z);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(10);
  });

  it('sees what the camera looks at in the middle, nearer things bigger', () => {
    const home = homeCamera(scene, homeConstellation(chart));
    const target = scene.constellations.find((k) => k.c.pathId === 'done')!;
    const mid = see(target.centre, home);
    expect(mid.x).toBeCloseTo(0);
    expect(mid.y).toBeCloseTo(0);
    expect(see({ ...target.centre, z: target.centre.z - 100 }, home).s).toBeGreaterThan(1);
    expect(see({ ...target.centre, z: target.centre.z + 100 }, home).s).toBeLessThan(1);
  });

  it('turning the camera swings near things past far ones', () => {
    const cam = homeCamera(scene, homeConstellation(chart));
    const near = { x: 50, y: 0, z: cam.target.z - 150 };
    const far = { x: 50, y: 0, z: cam.target.z + 150 };
    const turned = { ...cam, yaw: 0.4 };
    const moveNear = see(near, turned).x - see(near, cam).x;
    const moveFar = see(far, turned).x - see(far, cam).x;
    expect(Math.sign(moveNear)).not.toBe(Math.sign(moveFar));
  });

  it('hits a star where it is seen, and a constellation around its shape', () => {
    const k = scene.constellations[0];
    const cam = cameraFor(k);
    const q = see(k.stars[0], cam);
    expect(hitScene(scene, cam, q.x + 2, q.y)).toMatchObject({ kind: 'book', pathId: k.c.pathId });
    const mid = see(k.centre, cam);
    const hit = hitScene(scene, cam, mid.x, mid.y + 1, 2);
    expect(hit?.kind === 'path' || hit?.kind === 'book').toBe(true);
    expect(hitScene(scene, cam, 5000, 5000)).toBeNull();
  });

  it('fades with distance but never to nothing', () => {
    expect(fog(-200)).toBe(1);
    expect(fog(5000)).toBe(0.2);
  });
});
