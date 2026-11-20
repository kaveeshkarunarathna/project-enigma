import { addDays } from './time';

/**
 * Pace: how much reading the last few weeks hold, in time and in pages.
 * Only ever descriptive. There is no "behind" and nothing to catch up on.
 */

export type PaceSession = {
  night: string;
  seconds: number;
  /** Pages read in the session, when the reader said where they stopped. */
  pages: number;
};

export type Pace = {
  /** Pages and minutes over the 7 nights ending tonight. */
  pagesThisWeek: number;
  minutesThisWeek: number;
  /** Average pages per week over the last four weeks, counting quiet weeks. */
  pagesPerWeek: number;
  /** Pages per hour, from sessions that recorded both time and pages. Null until there is enough. */
  pagesPerHour: number | null;
};

const WEEKS = 4;
/** Fewer minutes than this with pages is too little to say a speed. */
const MIN_TIMED_MINUTES = 20;

export function readingPace(sessions: PaceSession[], tonight: string): Pace {
  const weekStart = addDays(tonight, -6);
  const monthStart = addDays(tonight, -(WEEKS * 7 - 1));
  let pagesThisWeek = 0;
  let secondsThisWeek = 0;
  let pagesMonth = 0;
  let timedPages = 0;
  let timedSeconds = 0;
  for (const s of sessions) {
    if (s.night > tonight || s.night < monthStart) continue;
    const pages = Math.max(0, s.pages);
    pagesMonth += pages;
    if (s.night >= weekStart) {
      pagesThisWeek += pages;
      secondsThisWeek += Math.max(0, s.seconds);
    }
    if (pages > 0 && s.seconds > 0) {
      timedPages += pages;
      timedSeconds += s.seconds;
    }
  }
  return {
    pagesThisWeek,
    minutesThisWeek: Math.floor(secondsThisWeek / 60),
    pagesPerWeek: Math.round(pagesMonth / WEEKS),
    pagesPerHour:
      timedSeconds >= MIN_TIMED_MINUTES * 60 ? Math.round((timedPages / timedSeconds) * 3600) : null,
  };
}

/**
 * Roughly how many more weeks a book takes at the reader's own pace.
 * Null when the pace or the page count is unknown.
 */
export function weeksToFinish(pagesLeft: number, pagesPerWeek: number): number | null {
  if (pagesLeft <= 0) return 0;
  if (pagesPerWeek <= 0) return null;
  return Math.max(1, Math.round(pagesLeft / pagesPerWeek));
}

/** "about 3 weeks to go", or null. Gentle wording, never a deadline. */
export function finishLine(pagesLeft: number | null, pagesPerWeek: number): string | null {
  if (pagesLeft == null) return null;
  const weeks = weeksToFinish(pagesLeft, pagesPerWeek);
  if (weeks == null) return null;
  if (weeks === 0) return 'The last page is close';
  return weeks === 1 ? 'About a week to go at your pace' : `About ${weeks} weeks to go at your pace`;
}
