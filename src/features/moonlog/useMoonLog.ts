import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { nightRecords } from '@/data/sessions';
import { DEFAULT_SETTINGS, getSettings } from '@/data/settings';
import { weekSummary } from '@/domain/moonlog';
import { nightKey, weekOf } from '@/domain/time';

/** Tonight's key and this week's moons, kept live as sessions and journal change. */
export function useThisWeek() {
  const db = useDb();
  const today = nightKey();
  const { data: settings } = useLiveQuery(() => getSettings(db), ['settings']);
  const days = weekOf(today);
  const { data: records } = useLiveQuery(
    () => nightRecords(db, days[0], days[6]),
    ['sessions', 'nights', 'journal'],
    [today],
  );
  const s = settings ?? DEFAULT_SETTINGS;
  return {
    today,
    settings: s,
    week: weekSummary(records ?? [], today, s.goalMinutes, s.weeklyTarget),
    loaded: records !== undefined && settings !== undefined,
  };
}
