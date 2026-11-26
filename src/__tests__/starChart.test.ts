import { chartPaths, depthShift, hitStarChart, homeConstellation, layoutStarChart } from '@/domain/starChart';

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
  { id: 'idle', title: 'Untouched', joinedAt: null, source: 'curated', books: [entry('Nine')] },
];
const viewport = { width: 400, height: 500 };

describe('star chart', () => {
  it('shows complete and followed paths, not untouched ones', () => {
    expect(chartPaths(paths, shelf).map((p) => p.id)).toEqual(['done', 'going']);
  });

  it('draws each book once as a star and leaves books outside paths as lone stars', () => {
    const chart = layoutStarChart(chartPaths(paths, shelf), shelf, viewport);
    expect(chart.constellations.map((c) => [c.pathId, c.complete])).toEqual([
      ['done', true],
      ['going', false],
    ]);
    expect(chart.lone.map((s) => s.title)).toEqual(['Loose']);
    expect(chart.booksFinished).toBe(3);
  });

  it('opens on the constellation completed last', () => {
    const chart = layoutStarChart(chartPaths(paths, shelf), shelf, viewport);
    expect(homeConstellation(chart)?.pathId).toBe('done');
    expect(chart.constellations[0].completedAt).toBe('2026-02-01T00:00:00Z');
  });

  it('hits stars first, then the constellation around them, then nothing', () => {
    const chart = layoutStarChart(chartPaths(paths, shelf), shelf, viewport);
    const star = chart.constellations[0].stars[0];
    expect(hitStarChart(chart, star.x + 3, star.y)).toMatchObject({ kind: 'book', pathId: 'done' });
    const { label } = chart.constellations[0];
    expect(hitStarChart(chart, label.x, label.y)).toMatchObject({ kind: 'path', pathId: 'done' });
    expect(hitStarChart(chart, -500, -500)).toBeNull();
  });

  it('puts completed constellations nearer than ones still being read', () => {
    const chart = layoutStarChart(chartPaths(paths, shelf), shelf, viewport);
    const [done, going] = chart.constellations;
    expect(done.z).toBeLessThan(going.z);
  });

  it('moves near things more than far ones, and hits stars where they are seen', () => {
    expect(depthShift(0.5, 100, 0, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(depthShift(0, 100, 0, 0, 0).x).toBeGreaterThan(depthShift(1, 100, 0, 0, 0).x);
    const chart = layoutStarChart(chartPaths(paths, shelf), shelf, viewport);
    const star = chart.constellations[0].stars[0];
    const shift = (z: number) => depthShift(z, 120, 0, 0, 0);
    const seen = shift(star.z);
    expect(hitStarChart(chart, star.x + seen.x, star.y + seen.y, 4, shift)).toMatchObject({ kind: 'book' });
  });

  it('shows books being read outside any constellation as planets, and finds them by tap', () => {
    const more = [...shelf, { ...book('p', 'Planet book', 'reading'), pageCount: 400, currentPage: 100 }];
    const chart = layoutStarChart(chartPaths(paths, more), more, viewport);
    // 'Three' is read inside the Going path, so only the loose book becomes a planet.
    expect(chart.planets.map((p) => p.bookId)).toEqual(['p']);
    const planet = chart.planets[0];
    expect(planet.fill).toBeCloseTo(0.25);
    expect(planet.ringed).toBe(true);
    const hit = hitStarChart(chart, planet.x + planet.r, planet.y, 4);
    expect(hit).toEqual({ kind: 'planet', planet });
  });
});
