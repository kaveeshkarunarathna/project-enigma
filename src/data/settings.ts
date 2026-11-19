import type { Db } from './db';
import { notifyChanged } from './live';
import { DEFAULT_GOAL_MINUTES, DEFAULT_WEEKLY_TARGET } from '@/domain/moonlog';

export type Settings = {
  /** Nightly Moon Log goal in minutes. */
  goalMinutes: number;
  /** Full moons per week that complete the week. */
  weeklyTarget: number;
  scheme: 'night' | 'dawn' | 'system';
  /** Gentle reminder time as `HH:MM`, or null when off. */
  reminderTime: string | null;
  soundOn: boolean;
  onboarded: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  goalMinutes: DEFAULT_GOAL_MINUTES,
  weeklyTarget: DEFAULT_WEEKLY_TARGET,
  scheme: 'night',
  reminderTime: null,
  soundOn: false,
  onboarded: false,
};

export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings', []);
  const stored: Partial<Settings> = {};
  for (const { key, value } of rows) {
    if (key in DEFAULT_SETTINGS) {
      try {
        (stored as Record<string, unknown>)[key] = JSON.parse(value);
      } catch {
        // ignore a corrupt value and fall back to the default
      }
    }
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSetting<K extends keyof Settings>(db: Db, key: K, value: Settings[K]): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
  notifyChanged('settings');
}
