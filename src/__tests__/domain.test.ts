/// <reference types="jest" />
import { moonFor, weekMessage, weekSummary } from '@/domain/moonlog';
import { bookCompletion, litBeads, ringSize, sessionStardust, starBrightness } from '@/domain/progress';
import { checkQuote, normalizeQuote } from '@/domain/quotes';
import { layoutSky } from '@/domain/sky';
import { addDays, monthGrid, nightKey, weekOf } from '@/domain/time';

describe('nights', () => {
  it('rolls over at 4 AM, not midnight', () => {
    expect(nightKey(new Date(2026, 10, 19, 23, 30))).toBe('2026-11-19');
    expect(nightKey(new Date(2026, 10, 20, 1, 15))).toBe('2026-11-19');
    expect(nightKey(new Date(2026, 10, 20, 4, 0))).toBe('2026-11-20');
  });

  it('handles month and year edges', () => {
    expect(nightKey(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('builds a Monday to Sunday week', () => {
    // 19 Nov 2026 is a Thursday
    expect(weekOf('2026-11-19')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(weekOf('2026-11-22')[0]).toBe('2026-11-16');
    expect(weekOf('2026-11-16')[0]).toBe('2026-11-16');
  });
});

describe('moon log', () => {
  it('fills the moon against the goal', () => {
    const half = moonFor({ night: 'n', seconds: 300, goalMinutes: 10, reflected: false }, 'n', 10);
    expect(half.fill).toBeCloseTo(0.5);
    expect(half.full).toBe(false);
    expect(half.read).toBe(true);
  });

  it('uses the goal saved for that night, not today’s goal', () => {
    const moon = moonFor({ night: 'n', seconds: 300, goalMinutes: 5, reflected: true }, 'n', 30);
    expect(moon.full).toBe(true);
    expect(moon.halo).toBe(true);
  });

  it('shows an empty new moon for a night without reading', () => {
    expect(moonFor(undefined, 'n', 10)).toMatchObject({ fill: 0, full: false, read: false, halo: false });
  });

  it('counts full moons towards the weekly target', () => {
    const records = ['2026-11-16', '2026-11-17', '2026-11-19'].map((night) => ({
      night,
      seconds: 900,
      goalMinutes: 10,
      reflected: false,
    }));
    const week = weekSummary(records, '2026-11-19', 10, 4);
    expect(week.moons).toHaveLength(7);
    expect(week.fullMoons).toBe(3);
    expect(week.targetMet).toBe(false);
    expect(weekMessage(week)).toBe('3 of 4 full moons. 1 more night this week.');
  });

  it('never mentions missed nights', () => {
    const empty = weekSummary([], '2026-11-19', 10, 4);
    expect(weekMessage(empty)).not.toMatch(/miss|lost|broke/i);
  });
});

describe('book progress', () => {
  const base = { pageCount: 200, chapterCount: null, currentPage: 0, chaptersDone: 0, finished: false };

  it('uses one bead per 20 pages when chapters are unknown', () => {
    expect(ringSize(base)).toBe(10);
    expect(litBeads({ ...base, currentPage: 45 })).toBe(2);
  });

  it('uses chapters when known, capped at 24 beads', () => {
    expect(ringSize({ pageCount: 900, chapterCount: 12 })).toBe(12);
    expect(ringSize({ pageCount: 900, chapterCount: 60 })).toBe(24);
    expect(litBeads({ ...base, chapterCount: 12, chaptersDone: 3 })).toBe(3);
  });

  it('lights every bead when finished', () => {
    expect(litBeads({ ...base, finished: true })).toBe(10);
    expect(bookCompletion({ ...base, finished: true })).toBe(1);
  });

  it('brightens the star from the first session', () => {
    expect(starBrightness(0, true)).toBeGreaterThan(starBrightness(0, false));
    expect(starBrightness(1, true)).toBe(1);
  });

  it('gives stardust for minutes and beads', () => {
    expect(sessionStardust(600, 0)).toBe(10);
    expect(sessionStardust(59, 1)).toBe(5);
  });
});

describe('quotes', () => {
  it('joins words hyphenated across lines', () => {
    expect(normalizeQuote('the unexam-\nined life')).toBe('the unexamined life');
  });

  it('caps quotes at a short passage', () => {
    expect(checkQuote('').status).toBe('empty');
    expect(checkQuote('word '.repeat(30)).status).toBe('ok');
    expect(checkQuote('word '.repeat(80)).status).toBe('long');
    expect(checkQuote('word '.repeat(121)).status).toBe('too-long');
  });
});

describe('month grid', () => {
  it('lays out November 2026 Monday-first', () => {
    const grid = monthGrid(2026, 10);
    // 1 Nov 2026 is a Sunday, so six blanks lead
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
  });
});

describe('sky layout', () => {
  it('keeps old stars in the same direction when the sky grows', () => {
    const nights = Array.from({ length: 30 }, (_, i) => ({
      night: `2026-10-${String(i + 1).padStart(2, '0')}`,
      seconds: 600,
    }));
    const before = layoutSky(nights, 300, 300);
    const after = layoutSky([...nights, { night: '2026-11-01', seconds: 600 }], 300, 300);
    const angle = (s: { x: number; y: number }) => Math.atan2(s.y - 150, s.x - 150);
    before.forEach((s, i) => expect(angle(after[i])).toBeCloseTo(angle(s), 6));
  });

  it('keeps stars inside the canvas', () => {
    const nights = Array.from({ length: 400 }, (_, i) => ({ night: `n${i}`, seconds: 1200 }));
    for (const s of layoutSky(nights, 300, 300)) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(300);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(300);
    }
  });
});
