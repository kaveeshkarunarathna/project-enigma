import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { CaretLeftIcon, CaretRightIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Stat } from '@/components/Stat';
import { MoonCanvas } from '@/components/sky/Moon';
import { moonLabel, WeekStrip } from '@/components/sky/WeekStrip';
import { Text } from '@/components/Text';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { nightRecords, paceSessions, skyStats } from '@/data/sessions';
import { setSetting } from '@/data/settings';
import { GOAL_CHOICES, moonFor, weekMessage, type MoonState } from '@/domain/moonlog';
import { readingPace } from '@/domain/pace';
import { addDays, localDateKey, monthGrid, monthName, parseNightKey } from '@/domain/time';
import { useThisWeek } from '@/features/moonlog/useMoonLog';
import { space } from '@/theme/tokens';

const TARGETS = [3, 4, 5, 6, 7];

/**
 * The Moon Log: one moon per night. Full when the goal is met, a teal halo
 * when a reflection was written too. Nothing resets and nothing turns red.
 */
export default function MoonLogScreen() {
  const db = useDb();
  const { week, today, settings } = useThisWeek();
  const [cursor, setCursor] = useState(() => {
    const d = parseNightKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const grid = monthGrid(cursor.year, cursor.month);
  const days = grid.flat().filter((d): d is string => !!d);
  const { data: records } = useLiveQuery(
    () => nightRecords(db, days[0], days[days.length - 1]),
    ['sessions', 'nights', 'journal'],
    [cursor.year, cursor.month],
  );
  const { data: stats } = useLiveQuery(() => skyStats(db), ['sessions', 'books']);
  const { data: recent } = useLiveQuery(() => paceSessions(db, addDays(today, -27)), ['sessions'], [today]);
  const pace = recent ? readingPace(recent, today) : null;
  const byNight = new Map((records ?? []).map((r) => [r.night, r]));
  const monthFull = (records ?? []).filter((r) => r.seconds >= r.goalMinutes * 60).length;
  const isCurrentMonth =
    localDateKey(new Date(cursor.year, cursor.month, 1)).slice(0, 7) === today.slice(0, 7);

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <Screen back title="Moon Log" caption="One moon a night. It fills as you read.">
      <View style={styles.week}>
        <WeekStrip week={week} today={today} size={34} />
        <Text tone="mist" style={styles.center}>
          {weekMessage(week)}
        </Text>
      </View>

      <Section
        title={`${monthName(cursor.month)} ${cursor.year}`}
        accessory={
          <View style={styles.nav}>
            <IconButton
              icon={CaretLeftIcon}
              label="Previous month"
              tone="mist"
              size={20}
              onPress={() => shift(-1)}
            />
            {!isCurrentMonth ? (
              <IconButton
                icon={CaretRightIcon}
                label="Next month"
                tone="mist"
                size={20}
                onPress={() => shift(1)}
              />
            ) : (
              <View style={styles.navSpacer} />
            )}
          </View>
        }>
        <MonthMoons
          grid={grid}
          today={today}
          month={cursor.month}
          moonAt={(night) => moonFor(byNight.get(night), night, settings.goalMinutes)}
        />
        <Text variant="caption">
          {monthFull === 0
            ? 'No full moons yet this month.'
            : `${monthFull} full ${monthFull === 1 ? 'moon' : 'moons'} this month.`}
        </Text>
      </Section>

      {pace ? (
        <Section title="Your pace">
          <View style={styles.stats}>
            <Stat
              value={pace.pagesThisWeek}
              label={pace.pagesThisWeek === 1 ? 'page this week' : 'pages this week'}
            />
            <Stat value={pace.pagesPerWeek} label="pages a week, lately" />
            {pace.pagesPerHour ? <Stat value={pace.pagesPerHour} label="pages an hour" /> : null}
          </View>
          <Text variant="caption">
            {pace.pagesPerWeek || pace.pagesThisWeek
              ? 'From the pages you log, over the last four weeks. Any pace is a good pace.'
              : 'Tell the lamp, or Log pages, where you stopped and your pages add up here.'}
          </Text>
        </Section>
      ) : null}

      <Section title="Nightly goal">
        <View style={styles.chips} accessibilityRole="radiogroup">
          {GOAL_CHOICES.map((g) => (
            <Chip
              key={g}
              label={`${g} min`}
              accessibilityLabel={`${g} minutes a night`}
              selected={settings.goalMinutes === g}
              onPress={() => setSetting(db, 'goalMinutes', g)}
            />
          ))}
        </View>
        <Text variant="caption">Small on purpose. Changing it never rewrites past moons.</Text>
      </Section>

      <Section title="Full moons for a complete week">
        <View style={styles.chips} accessibilityRole="radiogroup">
          {TARGETS.map((t) => (
            <Chip
              key={t}
              label={String(t)}
              accessibilityLabel={`${t} of 7 nights`}
              selected={settings.weeklyTarget === t}
              onPress={() => setSetting(db, 'weeklyTarget', t)}
            />
          ))}
        </View>
        <Text variant="caption">Any nights you like. There are no streaks to break.</Text>
      </Section>

      {stats ? (
        <Section title="Since you began">
          <View style={styles.stats}>
            <Stat value={stats.nightsRead} label={stats.nightsRead === 1 ? 'night read' : 'nights read'} />
            <Stat value={stats.minutesRead} label="minutes" />
            <Stat
              value={stats.booksFinished}
              label={stats.booksFinished === 1 ? 'book finished' : 'books finished'}
            />
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}

function MonthMoons({
  grid,
  today,
  month,
  moonAt,
}: {
  grid: (string | null)[][];
  today: string;
  month: number;
  moonAt: (night: string) => MoonState;
}) {
  const [width, setWidth] = useState(0);
  const row = 44;
  const step = width / 7;
  const moons = width
    ? grid.flatMap((week, i) =>
        week.flatMap((night, j) => {
          if (!night || night > today) return [];
          const m = moonAt(night);
          return [
            {
              key: night,
              cx: step * j + step / 2,
              cy: row * i + row / 2,
              r: 11,
              fill: m.fill,
              full: m.full,
              halo: m.halo,
              today: night === today,
              label: `${parseNightKey(night).getDate()} ${monthName(month)}. ${moonLabel(m, today)}`,
            },
          ];
        }),
      )
    : [];
  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.weekdays} importantForAccessibility="no-hide-descendants">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} variant="caption" style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {width ? (
        <MoonCanvas
          width={width}
          height={row * grid.length}
          moons={moons}
          onPressMoon={(night) => router.push({ pathname: '/night/[night]', params: { night } })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { gap: space.lg },
  center: { textAlign: 'center' },
  nav: { flexDirection: 'row' },
  navSpacer: { width: 44 },
  grid: { paddingVertical: space.md, minHeight: 200, gap: space.xs },
  weekdays: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontStyle: 'normal', fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingVertical: space.md },
  stats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.md },
});
