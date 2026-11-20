import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Hairline } from '@/components/Hairline';
import { IconButton } from '@/components/IconButton';
import { CaretLeftIcon, CaretRightIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Stat } from '@/components/Stat';
import { MoonCanvas } from '@/components/sky/Moon';
import { moonLabel } from '@/components/sky/WeekStrip';
import { useDb } from '@/data/DataProvider';
import { listEntries } from '@/data/journal';
import { useLiveQuery } from '@/data/live';
import { nightRecords, nightSessions, readingNights } from '@/data/sessions';
import { DEFAULT_SETTINGS, getSettings } from '@/data/settings';
import { moonFor } from '@/domain/moonlog';
import { neighbourNights, nightTitle, sessionPages } from '@/domain/nights';
import { nightKey } from '@/domain/time';
import { EntryItem } from '@/features/journal/EntryItem';
import { SessionRow } from '@/features/sessions/SessionRow';
import { space } from '@/theme/tokens';

/**
 * One night, opened from its star: the moon it filled, what was read, for
 * how long and how many pages, and anything written in the journal.
 */
export default function NightScreen() {
  const { night } = useLocalSearchParams<{ night: string }>();
  const db = useDb();
  const [width, setWidth] = useState(0);
  const { data: sessions } = useLiveQuery(() => nightSessions(db, night), ['sessions', 'books'], [night]);
  const { data: record } = useLiveQuery(
    async () => (await nightRecords(db, night, night))[0] ?? null,
    ['sessions', 'nights', 'journal'],
    [night],
  );
  const { data: entries } = useLiveQuery(() => listEntries(db, { night }), ['journal'], [night]);
  const { data: all } = useLiveQuery(() => readingNights(db), ['sessions']);
  const { data: settings } = useLiveQuery(() => getSettings(db), ['settings']);

  const today = nightKey();
  const moon = moonFor(record ?? undefined, night, (settings ?? DEFAULT_SETTINGS).goalMinutes);
  const { prev, next } = neighbourNights(
    (all ?? []).map((n) => n.night),
    night,
  );
  const minutes = Math.floor((sessions ?? []).reduce((s, x) => s + x.seconds, 0) / 60);
  const pages = (sessions ?? []).reduce((s, x) => s + sessionPages(x), 0);
  const go = (n: string) => router.replace({ pathname: '/night/[night]', params: { night: n } });

  return (
    <Screen
      back
      title={nightTitle(night)}
      caption={night === today ? 'Tonight' : undefined}
      accessory={
        <View style={styles.nav}>
          <IconButton
            icon={CaretLeftIcon}
            label="Night before"
            tone="mist"
            size={20}
            disabled={!prev}
            onPress={() => prev && go(prev)}
          />
          <IconButton
            icon={CaretRightIcon}
            label="Night after"
            tone="mist"
            size={20}
            disabled={!next}
            onPress={() => next && go(next)}
          />
        </View>
      }>
      <View style={styles.summary} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width ? (
          <MoonCanvas
            width={72}
            height={72}
            moons={[
              {
                key: night,
                cx: 36,
                cy: 36,
                r: 26,
                fill: moon.fill,
                full: moon.full,
                halo: moon.halo,
                today: false,
                label: moonLabel(moon, today),
              },
            ]}
          />
        ) : null}
        <View style={styles.stats}>
          <Stat value={minutes} label={minutes === 1 ? 'minute' : 'minutes'} />
          <Stat value={pages} label={pages === 1 ? 'page' : 'pages'} />
        </View>
      </View>

      {sessions && !sessions.length ? (
        <EmptyState
          heading="A quiet night"
          body="Nothing was read this night. Quiet nights are part of reading too."
        />
      ) : null}

      {sessions?.length ? (
        <Section
          title={sessions.length === 1 ? 'What you read' : `What you read, in ${sessions.length} sittings`}>
          {sessions.map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <Hairline /> : null}
              <SessionRow session={s} title={s.bookTitle ?? 'Reading'} />
            </View>
          ))}
        </Section>
      ) : null}

      {entries?.length ? (
        <Section title="In your journal">
          {entries.map((e) => (
            <EntryItem key={e.id} entry={e} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  stats: { flexDirection: 'row', gap: space.xl },
});
