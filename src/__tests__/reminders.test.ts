/// <reference types="jest" />
import { formatTime, parseTime, planReminders, REMINDER_LINES } from '@/domain/reminders';
import { journalAsText } from '@/features/journal/exportText';

describe('reminders', () => {
  it('parses and formats times', () => {
    expect(parseTime('21:30')).toEqual({ hour: 21, minute: 30 });
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('soon')).toBeNull();
    expect(formatTime('21:00')).toBe('9 PM');
    expect(formatTime('19:30')).toBe('7:30 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
  });

  it('plans a week of evenings, starting tonight when the time is still ahead', () => {
    const now = new Date(2026, 10, 19, 18, 0);
    const plan = planReminders(now, '21:00', { readTonight: false });
    expect(plan).toHaveLength(7);
    expect(plan[0].date).toEqual(new Date(2026, 10, 19, 21, 0));
    expect(plan[6].date).toEqual(new Date(2026, 10, 25, 21, 0));
    for (const r of plan) expect(REMINDER_LINES).toContain(r.body);
    expect(new Set(plan.map((r) => r.body)).size).toBeGreaterThan(1);
  });

  it('skips tonight after reading, or when the time has passed', () => {
    const early = new Date(2026, 10, 19, 18, 0);
    const read = planReminders(early, '21:00', { readTonight: true });
    expect(read).toHaveLength(6);
    expect(read[0].date).toEqual(new Date(2026, 10, 20, 21, 0));

    const late = new Date(2026, 10, 19, 22, 0);
    expect(planReminders(late, '21:00', { readTonight: false })[0].date).toEqual(
      new Date(2026, 10, 20, 21, 0),
    );
  });

  it('plans nothing for a bad time', () => {
    expect(planReminders(new Date(), 'later', { readTonight: false })).toEqual([]);
  });
});

describe('journal export', () => {
  it('writes entries oldest first, with questions, quotes and pages', () => {
    const base = {
      night: '2026-11-18',
      updatedAt: '',
      bookId: null,
      sessionId: null,
      promptId: null,
      quoteText: null,
      quotePage: null,
      quoteSource: null,
    } as const;
    const text = journalAsText(
      [
        {
          ...base,
          id: '2',
          kind: 'quote',
          createdAt: '2026-11-19T20:00:00Z',
          bookTitle: 'Dune',
          body: 'Stayed with me.',
          quoteText: 'A short line.',
          quotePage: 12,
          quoteSource: 'scanned',
        },
        {
          ...base,
          id: '1',
          kind: 'note',
          createdAt: '2026-11-18T20:00:00Z',
          bookTitle: null,
          body: 'First note.',
        },
      ],
      new Date(2026, 10, 19),
    );
    expect(text.indexOf('First note.')).toBeLessThan(text.indexOf('A short line.'));
    expect(text).toContain('## 2026-11-19, Dune');
    expect(text).toContain('"A short line." (page 12)');
  });
});
