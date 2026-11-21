import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Db } from '@/data/db';
import { listSessions } from '@/data/sessions';
import { getSettings } from '@/data/settings';
import { planReminders } from '@/domain/reminders';
import { nightKey } from '@/domain/time';

/**
 * Local notifications only: scheduled on the phone, no server and no push
 * token. Every scheduled notification belongs to this feature, so planning
 * again starts by clearing them all.
 */
const CHANNEL = 'evening';
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function remindersAllowed(ask: boolean): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !ask) return current.granted;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return asked.granted;
}

let syncing: Promise<void> = Promise.resolve();

/** Plans the next week of reminders from the settings and tonight's reading. */
export function syncReminders(db: Db): Promise<void> {
  // Run one after another, so two quick changes cannot interleave.
  syncing = syncing.then(() => planAgain(db)).catch(() => {});
  return syncing;
}

async function planAgain(db: Db) {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const { reminderTime } = await getSettings(db);
  if (!reminderTime || !(await remindersAllowed(false))) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Evening reminder',
      description: 'One quiet note at the time you choose.',
      importance: AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: null,
      enableVibrate: false,
    });
  }

  const readTonight = (await listSessions(db, { night: nightKey(), limit: 1 })).length > 0;
  for (const r of planReminders(new Date(), reminderTime, { readTonight })) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Stellibria', body: r.body, sound: false },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL },
    });
  }
}
