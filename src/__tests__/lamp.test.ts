/// <reference types="jest" />
import { elapsedMs, formatClock, initialLamp, isDue, lampProgress, lampReducer } from '@/domain/lamp';

const MIN = 60_000;

describe('the lamp timer', () => {
  it('counts only running time, across pauses', () => {
    let s = initialLamp('b1', { kind: 'countdown', minutes: 10 });
    s = lampReducer(s, { type: 'start', now: 0 });
    s = lampReducer(s, { type: 'pause', now: 3 * MIN });
    expect(elapsedMs(s, 100 * MIN)).toBe(3 * MIN);
    s = lampReducer(s, { type: 'resume', now: 10 * MIN });
    expect(elapsedMs(s, 12 * MIN)).toBe(5 * MIN);
    expect(lampProgress(s, 12 * MIN)).toBeCloseTo(0.5);
  });

  it('stays right after the phone sleeps', () => {
    let s = initialLamp(null, { kind: 'countdown', minutes: 15 });
    s = lampReducer(s, { type: 'start', now: 1000 });
    // no ticks at all for 20 minutes
    expect(isDue(s, 1000 + 20 * MIN)).toBe(true);
  });

  it('completes at exactly the target', () => {
    let s = initialLamp(null, { kind: 'countdown', minutes: 10 });
    s = lampReducer(s, { type: 'start', now: 0 });
    s = lampReducer(s, { type: 'complete', now: 10 * MIN + 4000 });
    expect(s.phase).toBe('complete');
    expect(elapsedMs(s, 99 * MIN)).toBe(10 * MIN);
  });

  it('lets an early ending still count', () => {
    let s = initialLamp(null, { kind: 'countdown', minutes: 30 });
    s = lampReducer(s, { type: 'start', now: 0 });
    s = lampReducer(s, { type: 'complete', now: 4 * MIN });
    expect(elapsedMs(s, 0)).toBe(4 * MIN);
  });

  it('keeps reading as a fresh open session', () => {
    let s = initialLamp(null, { kind: 'countdown', minutes: 10 });
    s = lampReducer(s, { type: 'start', now: 0 });
    s = lampReducer(s, { type: 'complete', now: 10 * MIN });
    s = lampReducer(s, { type: 'keepReading', now: 11 * MIN });
    expect(s.mode).toEqual({ kind: 'open' });
    expect(s.phase).toBe('running');
    expect(elapsedMs(s, 13 * MIN)).toBe(2 * MIN);
    expect(isDue(s, 999 * MIN)).toBe(false);
  });

  it('ignores actions in the wrong phase', () => {
    const s = initialLamp(null);
    expect(lampReducer(s, { type: 'pause', now: 5 })).toBe(s);
    expect(lampReducer(s, { type: 'keepReading', now: 5 })).toBe(s);
  });

  it('formats the clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9 * MIN + 5000)).toBe('9:05');
    expect(formatClock(75 * MIN)).toBe('1:15:00');
  });
});
