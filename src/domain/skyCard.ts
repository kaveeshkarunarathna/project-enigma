/**
 * The shareable sky card: what it says. Everything here is plain numbers and
 * the titles the reader chose to show. Journal text, quotes and notes never
 * reach the card.
 */
import { monthName, nightKey } from './time';

export type CardShape = 'story' | 'square';
export type CardPeriod = 'month' | 'all';

/** The name printed small at the foot of the card. One place to change it. */
export const CARD_WORDMARK = 'Orrery';

/** Logical size of each shape. Story is 9:16 (Instagram and TikTok stories), square is 1:1. */
export const CARD_SIZE: Record<CardShape, { width: number; height: number }> = {
  story: { width: 360, height: 640 },
  square: { width: 360, height: 360 },
};

/** Pixel size of the shared image. */
export const CARD_PIXELS: Record<CardShape, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

/** At most this many titles, so the card stays calm. */
export const MAX_CARD_TITLES = 3;

export type CardSession = { night: string; seconds: number; pages: number; bookId: string | null };
export type CardBook = { id: string; title: string; status: string; finishedAt: string | null };

export type CardSummary = {
  nights: number;
  minutes: number;
  pages: number;
  /** Books finished in the period. */
  finished: number;
  /** Titles read in the period, finished ones first. Only shown if the reader turns them on. */
  titles: string[];
};

/** First night of the month `today` falls in, as `YYYY-MM-DD`. */
export function monthStart(today: string): string {
  return `${today.slice(0, 7)}-01`;
}

/** First night counted for a period, or null for all time. */
export function periodStart(period: CardPeriod, today: string): string | null {
  return period === 'month' ? monthStart(today) : null;
}

/** "November 2026", or "All my nights". */
export function periodLabel(period: CardPeriod, today: string): string {
  if (period === 'all') return 'All my nights';
  return `${monthName(Number(today.slice(5, 7)) - 1)} ${today.slice(0, 4)}`;
}

/** Adds up a period. `sessions` may hold more than the period; it is filtered here. */
export function cardSummary(
  sessions: CardSession[],
  books: CardBook[],
  period: CardPeriod,
  today: string,
): CardSummary {
  const from = periodStart(period, today);
  const inPeriod = (night: string) => (from === null || night >= from) && night <= today;
  const counted = sessions.filter((s) => inPeriod(s.night));

  const nights = new Set(counted.filter((s) => s.seconds > 0).map((s) => s.night)).size;
  const seconds = counted.reduce((sum, s) => sum + Math.max(0, s.seconds), 0);
  const pages = counted.reduce((sum, s) => sum + Math.max(0, s.pages), 0);

  const finishedBooks = books.filter(
    (b) =>
      b.status === 'finished' &&
      (from === null || (b.finishedAt !== null && inPeriod(nightKey(new Date(b.finishedAt))))),
  );

  // Titles: finished in the period first, then the others read in it, newest reading first.
  const lastRead = new Map<string, string>();
  for (const s of counted) {
    if (!s.bookId) continue;
    const prev = lastRead.get(s.bookId);
    if (!prev || s.night > prev) lastRead.set(s.bookId, s.night);
  }
  const finishedIds = new Set(finishedBooks.map((b) => b.id));
  const byId = new Map(books.map((b) => [b.id, b]));
  const others = [...lastRead.entries()]
    .filter(([id]) => !finishedIds.has(id) && byId.has(id))
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
    .map(([id]) => byId.get(id)!);
  const titles = [...finishedBooks, ...others]
    .map((b) => b.title.trim())
    .filter((t, i, all) => t && all.indexOf(t) === i)
    .slice(0, MAX_CARD_TITLES);

  return { nights, minutes: Math.floor(seconds / 60), pages, finished: finishedBooks.length, titles };
}

/** Time read, short: "45 min", "6 h", "12 h". */
export function cardTime(minutes: number): { value: string; unit: string } {
  if (minutes < 120) return { value: String(minutes), unit: minutes === 1 ? 'minute' : 'minutes' };
  const hours = Math.round(minutes / 60);
  return { value: String(hours), unit: 'hours' };
}

/** Up to three numbers for the card, skipping ones that are zero (except nights). */
export function cardFigures(summary: CardSummary): { value: string; unit: string }[] {
  const figures: { value: string; unit: string }[] = [
    { value: formatCount(summary.nights), unit: summary.nights === 1 ? 'night' : 'nights' },
  ];
  if (summary.pages > 0)
    figures.push({ value: formatCount(summary.pages), unit: summary.pages === 1 ? 'page' : 'pages' });
  if (summary.finished > 0) {
    figures.push({
      value: formatCount(summary.finished),
      unit: summary.finished === 1 ? 'book finished' : 'books finished',
    });
  } else if (summary.minutes > 0) {
    figures.push(cardTime(summary.minutes));
  }
  return figures.slice(0, 3);
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/** File name for the shared image. */
export function cardFileName(shape: CardShape, today: string): string {
  return `my-reading-sky-${today}-${shape}.png`;
}
