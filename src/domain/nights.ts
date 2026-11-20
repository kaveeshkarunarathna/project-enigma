import { monthName, parseNightKey } from './time';

/**
 * Rules for looking back: a star in the sky opens its night, and a book's
 * sessions draw its pages over time. Pure functions, so they are tested.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Thursday 19 November", plus the year when it is not this year. */
export function nightTitle(night: string, now = new Date()): string {
  const d = parseNightKey(night);
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${monthName(d.getMonth())}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "9:30 PM", from an ISO time, in the reader's own clock. */
export function clockTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m < 10 ? `0${m}` : m} ${h < 12 ? 'AM' : 'PM'}`;
}

/** The star nearest a tap, if one is close enough to mean it. */
export function nearestStar<T extends { night: string; x: number; y: number }>(
  stars: T[],
  x: number,
  y: number,
  reach = 28,
): T | null {
  let best: T | null = null;
  let bestD = reach * reach;
  for (const s of stars) {
    const d = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

/** The reading nights either side of `night`, from a list sorted oldest first. */
export function neighbourNights(
  nights: string[],
  night: string,
): { prev: string | null; next: string | null } {
  const before = nights.filter((n) => n < night);
  const after = nights.filter((n) => n > night);
  return { prev: before[before.length - 1] ?? null, next: after[0] ?? null };
}

type PageSession = { night: string; pageFrom: number | null; pageTo: number | null };

/** Pages one session covered: from where it began to where the reader stopped. */
export function sessionPages(s: Pick<PageSession, 'pageFrom' | 'pageTo'>): number {
  return s.pageTo == null ? 0 : Math.max(0, s.pageTo - (s.pageFrom ?? 0));
}

/**
 * A book's page over time: one point per night with a stopping page, the
 * furthest page reached so far. Pages never go backwards on the chart.
 */
export function pageSeries(sessions: PageSession[]): { night: string; page: number }[] {
  const byNight = new Map<string, number>();
  for (const s of sessions) {
    if (s.pageTo == null || s.pageTo <= 0) continue;
    byNight.set(s.night, Math.max(byNight.get(s.night) ?? 0, s.pageTo));
  }
  let furthest = 0;
  return [...byNight.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([night, page]) => {
      furthest = Math.max(furthest, page);
      return { night, page: furthest };
    });
}
