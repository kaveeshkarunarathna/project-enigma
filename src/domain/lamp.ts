/**
 * The Lamp: the reading timer.
 *
 * Time is kept as timestamps, not ticks, so the timer stays right when the
 * phone sleeps or the app goes to the background. The UI simply re-reads
 * `elapsedMs(state, Date.now())` a few times a second.
 */

export const LAMP_DURATIONS = [10, 15, 20, 30] as const;

export type LampMode = { kind: 'countdown'; minutes: number } | { kind: 'open' };

export type LampState = {
  bookId: string | null;
  mode: LampMode;
  phase: 'setup' | 'running' | 'paused' | 'complete';
  /** First time the timer started, as epoch ms. */
  startedAt: number | null;
  /** Running time from finished segments, in ms. */
  accumulatedMs: number;
  /** Start of the current running segment, or null when not running. */
  segmentStart: number | null;
};

export function initialLamp(
  bookId: string | null,
  mode: LampMode = { kind: 'countdown', minutes: 15 },
): LampState {
  return { bookId, mode, phase: 'setup', startedAt: null, accumulatedMs: 0, segmentStart: null };
}

export function elapsedMs(s: LampState, now: number): number {
  return s.accumulatedMs + (s.segmentStart != null ? Math.max(0, now - s.segmentStart) : 0);
}

export function targetMs(s: LampState): number | null {
  return s.mode.kind === 'countdown' ? s.mode.minutes * 60_000 : null;
}

/** 0..1 through a countdown; for open sessions, progress through the current minute. */
export function lampProgress(s: LampState, now: number): number {
  const target = targetMs(s);
  const elapsed = elapsedMs(s, now);
  if (target == null) return (elapsed % 60_000) / 60_000;
  return Math.min(elapsed / target, 1);
}

/** Has a countdown reached its end? */
export function isDue(s: LampState, now: number): boolean {
  const target = targetMs(s);
  return s.phase === 'running' && target != null && elapsedMs(s, now) >= target;
}

export type LampAction =
  | { type: 'choose'; mode: LampMode }
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  /** The countdown reached its end. Freezes time at exactly the target. */
  | { type: 'complete'; now: number }
  /** After a countdown completes: keep counting up as open time. */
  | { type: 'keepReading'; now: number }
  | { type: 'reset' }
  /** Bring back a lamp that was running when the app closed. */
  | { type: 'restore'; state: LampState };

export function lampReducer(s: LampState, a: LampAction): LampState {
  switch (a.type) {
    case 'choose':
      return s.phase === 'setup' ? { ...s, mode: a.mode } : s;
    case 'start':
      if (s.phase !== 'setup') return s;
      return { ...s, phase: 'running', startedAt: a.now, segmentStart: a.now, accumulatedMs: 0 };
    case 'pause':
      if (s.phase !== 'running') return s;
      return { ...s, phase: 'paused', accumulatedMs: elapsedMs(s, a.now), segmentStart: null };
    case 'resume':
      if (s.phase !== 'paused') return s;
      return { ...s, phase: 'running', segmentStart: a.now };
    case 'complete': {
      if (s.phase !== 'running' && s.phase !== 'paused') return s;
      const target = targetMs(s);
      const elapsed = elapsedMs(s, a.now);
      return {
        ...s,
        phase: 'complete',
        accumulatedMs: target != null ? Math.min(elapsed, target) : elapsed,
        segmentStart: null,
      };
    }
    case 'keepReading':
      if (s.phase !== 'complete') return s;
      // Overtime is a fresh open session, so the finished one stays saved as is.
      return {
        ...s,
        mode: { kind: 'open' },
        phase: 'running',
        startedAt: a.now,
        accumulatedMs: 0,
        segmentStart: a.now,
      };
    case 'reset':
      return initialLamp(s.bookId, s.mode);
    case 'restore':
      return a.state;
  }
}

/** `mm:ss`, or `h:mm:ss` past an hour. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  const body = `${mm}:${String(sec).padStart(2, '0')}`;
  return h ? `${h}:${body}` : body;
}

/** Sessions shorter than this are not saved, so an accidental tap leaves no trace. */
export const MIN_SESSION_SECONDS = 20;
