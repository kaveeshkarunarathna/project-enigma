import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Text } from '@/components/Text';
import { whisper } from '@/components/motion/Whisper';
import { lastBackupAt, makeBackup, markBackedUp } from '@/data/backup';
import { useDb } from '@/data/DataProvider';
import { listEntries } from '@/data/journal';
import { useLiveQuery } from '@/data/live';
import { DEFAULT_SETTINGS, getSettings, setSetting, type Settings } from '@/data/settings';
import { daysSinceBackup } from '@/domain/backup';
import { MEANING_DOWNLOAD_MB } from '@/domain/meaning';
import { formatTime, REMINDER_TIMES } from '@/domain/reminders';
import { shareBackup } from '@/features/backup/files';
import { DEV_TOOLS } from '@/features/dev/sampleData';
import { journalAsText } from '@/features/journal/exportText';
import { cancelMeaningDownload, turnOffMeaning, turnOnMeaning, useMeaning } from '@/features/meaning/meaning';
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
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const { data: lastBackup } = useLiveQuery(() => lastBackupAt(db), ['settings']);
  const days = daysSinceBackup(lastBackup ?? null);

  async function chooseReminder(time: string | null) {
    setReminderNote(null);
    if (time && !(await remindersAllowed(true))) {
      setReminderNote(
        Platform.OS === 'web'
          ? 'Reminders work in the phone app.'
          : 'Notifications are off for Stellibria. You can allow them in your phone’s Settings.',
      );
      return;
    }
    await setSetting(db, 'reminderTime', time);
    await syncReminders(db);
  }

  async function saveBackup() {
    setBackupNote(null);
    try {
      if (await shareBackup(await makeBackup(db))) {
        await markBackedUp(db);
        whisper('A copy of your sky is saved');
      }
    } catch {
      setBackupNote('The backup could not be made. Please try again.');
    }
  }

  async function exportJournal() {
    const entries = await listEntries(db, { limit: 100000 });
    await Share.share({ title: 'Stellibria journal', message: journalAsText(entries) });
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

      <MeaningSection />

      <Section title="Keep your sky safe">
        <Text tone="mist" style={styles.note}>
          Your books, reading nights, paths and journal are stored only on this phone. Nothing is uploaded,
          and there is no account. A backup is one file with all of it, for you to keep in Files, Drive or
          anywhere you like. Restore it on a new phone and your sky comes back.
        </Text>
        <Text variant="caption" style={styles.note}>
          {backupNote ??
            (days === null
              ? 'No backup yet.'
              : days === 0
                ? 'Last backup today.'
                : `Last backup ${days === 1 ? 'yesterday' : `${days} days ago`}.`)}
        </Text>
        <Link label="Save a backup" onPress={saveBackup} tone="aurora" />
        <Link label="Restore from a backup" onPress={() => router.push('/restore')} />
        <Link label="Export your journal as text" onPress={exportJournal} />
      </Section>

      <Section title="About">
        <Text tone="mist" style={styles.note}>
          Stellibria {Constants.expoConfig?.version ?? ''}. Book facts and covers come from the Open Library
          catalog. Questions and path notes are written by Kaveesh. Pages you scan are read on your phone, and
          the photo is deleted straight away.
        </Text>
        {DEV_TOOLS ? <Link label="Dev tools" onPress={() => router.push('/dev')} /> : null}
      </Section>
    </Screen>
  );
}

function MeaningSection() {
  const db = useDb();
  const status = useMeaning();
  if (status.phase === 'unsupported') {
    return (
      <Section title="Search by meaning">
        <Text tone="mist" style={styles.note}>
          {Platform.OS === 'web'
            ? 'Search by meaning works in the phone app. Here the journal is searched by its words.'
            : 'Search by meaning needs the full Stellibria app, not Expo Go. Here the journal is searched by its words.'}
        </Text>
      </Section>
    );
  }
  const on = status.phase === 'ready' || status.phase === 'indexing';
  return (
    <Section title="Search by meaning">
      <Text tone="mist" style={styles.note}>
        {`Find an entry by what you meant, even when you used other words: “feeling small” finds the night you wrote about the stars. A small language model (about ${MEANING_DOWNLOAD_MB} MB) is downloaded once. After that it works offline, and it reads only your own words on this phone, never the passages you quote. Nothing is sent anywhere.`}
      </Text>
      <Text variant="caption" style={styles.note}>
        {status.phase === 'downloading'
          ? `Downloading, ${Math.round(status.progress * 100)}%.`
          : status.phase === 'indexing'
            ? `On. Getting to know your journal, ${status.done} of ${status.total}.`
            : status.phase === 'ready'
              ? 'On.'
              : status.phase === 'error'
                ? status.message
                : 'Off. The journal is searched by its words.'}
      </Text>
      {status.phase === 'downloading' ? (
        <Link label="Stop the download" onPress={cancelMeaningDownload} />
      ) : on ? (
        <Link label="Turn off and remove the model" onPress={() => turnOffMeaning(db)} />
      ) : (
        <Link
          label={`Turn on (${MEANING_DOWNLOAD_MB} MB download)`}
          onPress={() => turnOnMeaning(db)}
          tone="aurora"
        />
      )}
    </Section>
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
