import { CARD_CHART_VIEWPORT, cardSky } from '@/domain/cardSky';
import { layoutStarChart } from '@/domain/starChart';

const book = (id: string, status: string, finishedAt: string | null, pageCount = 200) => ({
  id,
  olWorkKey: null,
  title: id,
  author: null,
  status,
  pageCount,
  finishedAt,
});
const entry = (title: string) => ({ olWorkKey: null, title, author: null });

/** A sky like a keen reader's: four paths of four or five books, three read end to end, and lone books. */
function bigSky() {
  const shelf = [];
  const paths = [];
  for (let p = 0; p < 4; p++) {
    const ids = Array.from({ length: p === 1 ? 5 : 4 }, (_, i) => `p${p}b${i}`);
    ids.forEach((id, i) => {
      const done = p < 3 || i < 1;
      shelf.push(book(id, done ? 'finished' : 'want', done ? `2026-0${p + 1}-${10 + i}T20:00:00Z` : null));
    });
    paths.push({
      id: `path${p}`,
      title: `Path ${p}`,
      joinedAt: '2026-01-01',
      source: 'curated',
      books: ids.map(entry),
    });
  }
  shelf.push(
    book('lone1', 'finished', '2026-11-03T20:00:00Z'),
    book('lone2', 'finished', '2026-05-03T20:00:00Z'),
  );
  return layoutStarChart(paths, shelf, CARD_CHART_VIEWPORT);
}

const box = { x: 0, y: 100, w: 360, h: 376 };

describe('share card sky', () => {
  it('keeps every star inside the sky box', () => {
    const sky = cardSky(bigSky(), box, null);
    expect(sky.stars.length).toBeGreaterThan(0);
    for (const s of sky.stars) {
      expect(s.x).toBeGreaterThanOrEqual(box.x - 4);
      expect(s.x).toBeLessThanOrEqual(box.x + box.w + 4);
      expect(s.y).toBeGreaterThanOrEqual(box.y - 4);
      expect(s.y).toBeLessThanOrEqual(box.y + box.h + 4);
    }
  });

  it('leaves room between the stars instead of crowding them', () => {
    const { stars } = cardSky(bigSky(), box, null);
    let closest = Infinity;
    for (let i = 0; i < stars.length; i++)
      for (let j = i + 1; j < stars.length; j++)
        closest = Math.min(closest, Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y));
    expect(closest).toBeGreaterThan(12);
  });

  it('shows a big sky whole when it fits, and names its constellations', () => {
    const sky = cardSky(bigSky(), box, null);
    console.log(
      sky.zoom,
      sky.stars.length,
      sky.names.map((n) => n.title),
    );
    expect(sky.names.length).toBeGreaterThanOrEqual(3);
  });

  it('dims books finished before the period, and only those', () => {
    const { stars } = cardSky(bigSky(), box, '2026-11-01');
    const lit = stars.filter((s) => s.finished);
    expect(lit.filter((s) => !s.old)).toHaveLength(1);
    expect(lit.filter((s) => s.old).length).toBe(lit.length - 1);
  });

  it('draws nothing for an empty sky', () => {
    const sky = cardSky(layoutStarChart([], [], CARD_CHART_VIEWPORT), box, null);
    expect(sky.stars).toEqual([]);
  });
});
