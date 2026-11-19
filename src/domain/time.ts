/**
 * A "night" is the reader's local calendar day, but it only rolls over at
 * 4 AM. Reading at 1 AM still counts for the evening before, which is how
 * people think about bedtime reading.
 */
export const NIGHT_ROLLOVER_HOUR = 4;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** Local date as `YYYY-MM-DD`. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The night a moment belongs to, as `YYYY-MM-DD`. */
export function nightKey(at: Date = new Date(), rolloverHour = NIGHT_ROLLOVER_HOUR): string {
  const shifted = new Date(at.getTime());
  if (shifted.getHours() < rolloverHour) shifted.setDate(shifted.getDate() - 1);
  return localDateKey(shifted);
}

/** Parses `YYYY-MM-DD` as local midnight. */
export function parseNightKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = parseNightKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/**
 * The seven nights of the week that contains `key`. Weeks start on Monday,
 * so the strip reads Mon to Sun.
 */
export function weekOf(key: string): string[] {
  const date = parseNightKey(key);
  const mondayOffset = (date.getDay() + 6) % 7;
  const monday = addDays(key, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Short weekday initial for the week strip. */
export function weekdayInitial(key: string): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][parseNightKey(key).getDay()];
}
