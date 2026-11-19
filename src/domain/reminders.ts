/**
 * Gentle reminders. One quiet note at the reader's chosen evening time.
 * There is no streak talk and no guilt, and no note on a night when the
 * reader has already read. Notes are scheduled a week ahead on the phone
 * and planned again whenever the app opens or a session is logged.
 */

export const REMINDER_TIMES = ['19:00', '20:00', '21:00', '22:00'] as const;

/** Written in advance, in the app's voice. Chosen by date, so they vary. */
export const REMINDER_LINES = [
  'The lamp is ready when you are. Even ten minutes counts.',
  'A few pages tonight? Your book is waiting where you left it.',
  'Tonight’s moon is still dark. A short read will light it.',
  'A quiet moment to read, if the evening allows.',
  'Your next star is a few pages away.',
  'One chapter, or one page. Either is a good night.',
  'There is a question waiting in your journal tonight.',
];

export function parseTime(hhmm: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** "21:00" as "9 PM", "21:30" as "9:30 PM". */
export function formatTime(hhmm: string): string {
  const t = parseTime(hhmm);
  if (!t) return hhmm;
  const h = t.hour % 12 || 12;
  const suffix = t.hour < 12 ? 'AM' : 'PM';
  return t.minute ? `${h}:${String(t.minute).padStart(2, '0')} ${suffix}` : `${h} ${suffix}`;
}

export type PlannedReminder = { date: Date; body: string };

/**
 * The reminders to schedule from `now`: one a day at `time` for `days` days.
 * Today's is left out when its time has passed or the reader already read
 * tonight.
 */
export function planReminders(
  now: Date,
  time: string,
  { readTonight, days = 7 }: { readTonight: boolean; days?: number },
): PlannedReminder[] {
  const t = parseTime(time);
  if (!t) return [];
  const plan: PlannedReminder[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, t.hour, t.minute, 0, 0);
    if (date <= now) continue;
    if (i === 0 && readTonight) continue;
    const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
    plan.push({ date, body: REMINDER_LINES[dayNumber % REMINDER_LINES.length] });
  }
  return plan;
}
