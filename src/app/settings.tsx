import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Text } from '@/components/Text';
import { useDb } from '@/data/DataProvider';
import { listEntries } from '@/data/journal';
import { useLiveQuery } from '@/data/live';
import { DEFAULT_SETTINGS, getSettings, setSetting, type Settings } from '@/data/settings';
import { formatTime, REMINDER_TIMES } from '@/domain/reminders';
import { DEV_TOOLS } from '@/features/dev/sampleData';
import { journalAsText } from '@/features/journal/exportText';
import { remindersAllowed, syncReminders } from '@/features/reminders/reminders';
import { space } from '@/theme/tokens';

const SCHEMES: { label: string; value: Settings['scheme'] }[] = [
  { label: 'Night', value: 'night' },
  { label: 'Dawn', value: 'dawn' },
  { label: 'Match my phone', value: 'system' },
];

export default function SettingsScreen() {
  const db = useDb();
  const { data } = useLiveQuery(() => getSettings(db), ['settings']);
  const settings = data ?? DEFAULT_SETTINGS;
  const [reminderNote, setReminderNote] = useState<string | null>(null);

  async function chooseReminder(time: string | null) {
    setReminderNote(null);
    if (time && !(await remindersAllowed(true))) {
      setReminderNote(
        Platform.OS === 'web'
          ? 'Reminders work in the phone app.'
          : 'Notifications are off for Night Atlas. You can allow them in your phone’s Settings.',
      );
      return;
    }
    await setSetting(db, 'reminderTime', time);
    await syncReminders(db);
  }

  async function exportJournal() {
    const entries = await listEntries(db, { limit: 100000 });
    await Share.share({ title: 'Night Atlas journal', message: journalAsText(entries) });
  }

  return (
    <Screen back title="Settings" caption="Everything here stays on this phone.">
      <Section title="Reading goal">
        <Text tone="mist" style={styles.note}>
          {`${settings.goalMinutes} minutes a night, ${settings.weeklyTarget} full moons for a good week.`}
        </Text>
        <Link label="Change it in the Moon Log" onPress={() => router.push('/moonlog')} />
      </Section>

      <Section title="Evening reminder">
        <ChipRow>
          <Chip label="Off" selected={!settings.reminderTime} onPress={() => chooseReminder(null)} />
          {REMINDER_TIMES.map((t) => (
            <Chip
              key={t}
              label={formatTime(t)}
              selected={settings.reminderTime === t}
              onPress={() => chooseReminder(t)}
            />
          ))}
        </ChipRow>
        <Text variant="caption" style={styles.note}>
          {reminderNote ??
            'One quiet note in the evening, never on a night you have already read. No streaks, no guilt.'}
        </Text>
      </Section>

      <Section title="Sky">
        <ChipRow>
          {SCHEMES.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              selected={settings.scheme === s.value}
              onPress={() => setSetting(db, 'scheme', s.value)}
            />
          ))}
        </ChipRow>
      </Section>

      <Section title="Your words">
        <Text tone="mist" style={styles.note}>
          Your journal, books and reading nights are stored only on this phone. Nothing is uploaded, and there
          is no account. Deleting the app deletes them, so export your journal now and then.
        </Text>
        <Link label="Export your journal as text" onPress={exportJournal} tone="aurora" />
      </Section>

      <Section title="About">
        <Text tone="mist" style={styles.note}>
          Night Atlas {Constants.expoConfig?.version ?? ''}. Book facts and covers come from the Open Library
          catalog. Questions and path notes are written by Kaveesh. Pages you scan are read on your phone, and
          the photo is deleted straight away.
        </Text>
        {DEV_TOOLS ? <Link label="Dev tools" onPress={() => router.push('/dev')} /> : null}
      </Section>
    </Screen>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {children}
    </View>
  );
}

function Link({
  label,
  onPress,
  tone = 'mist',
}: {
  label: string;
  onPress: () => void;
  tone?: 'mist' | 'aurora';
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} haptic={false} style={styles.link}>
      <Text tone={tone}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingVertical: space.md },
  note: { paddingBottom: space.sm },
  link: { paddingVertical: space.md, alignSelf: 'flex-start' },
});
