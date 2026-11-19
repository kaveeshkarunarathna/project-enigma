import { clamp01 } from './progress';
import { weekOf } from './time';

/**
 * Moon Log: one moon per night.
 *
 * - The moon fills with minutes read against a small goal the reader picks.
 * - A full moon means the goal was met. A teal halo means goal plus a reflection.
 * - A night without reading is a thin new moon. Never red, never "broken".
 * - Instead of streaks there is a weekly target (default 4 of 7 nights).
 *   Counts only ever go up.
 */

export const GOAL_CHOICES = [5, 10, 15, 30] as const;
export const DEFAULT_GOAL_MINUTES = 10;
export const DEFAULT_WEEKLY_TARGET = 4;

export type NightRecord = {
  night: string;
  seconds: number;
  goalMinutes: number;
  reflected: boolean;
};

export type MoonState = {
  night: string;
  /** 0..1 how full the moon is. */
  fill: number;
  full: boolean;
  /** Goal met and a reflection written. */
  halo: boolean;
  /** Any reading at all that night. */
  read: boolean;
};

export function moonFor(record: NightRecord | undefined, night: string, goalMinutes: number): MoonState {
  const seconds = record?.seconds ?? 0;
  const goal = Math.max(record?.goalMinutes ?? goalMinutes, 1);
  const fill = clamp01(seconds / (goal * 60));
  const full = fill >= 1;
  return {
    night,
    fill,
    full,
    halo: full && !!record?.reflected,
    read: seconds > 0,
  };
}

export type WeekSummary = {
  moons: MoonState[];
  fullMoons: number;
  nightsRead: number;
  target: number;
  targetMet: boolean;
};

/** The Mon..Sun week strip for the week containing `night`. */
export function weekSummary(
  records: NightRecord[],
  night: string,
  goalMinutes: number,
  target = DEFAULT_WEEKLY_TARGET,
): WeekSummary {
  const byNight = new Map(records.map((r) => [r.night, r]));
  const moons = weekOf(night).map((key) => moonFor(byNight.get(key), key, goalMinutes));
  const fullMoons = moons.filter((m) => m.full).length;
  return {
    moons,
    fullMoons,
    nightsRead: moons.filter((m) => m.read).length,
    target,
    targetMet: fullMoons >= target,
  };
}

/** Gentle copy for the week strip. Never mentions what was missed. */
export function weekMessage(summary: WeekSummary): string {
  const { fullMoons, target } = summary;
  if (fullMoons === 0) return `Any ${target} nights this week. Start whenever you like.`;
  if (fullMoons >= target) {
    return fullMoons === 7 ? 'Seven full moons. A whole week of reading.' : `${fullMoons} full moons. Your week is complete.`;
  }
  const left = target - fullMoons;
  return `${fullMoons} of ${target} full moons. ${left} more ${left === 1 ? 'night' : 'nights'} this week.`;
}
