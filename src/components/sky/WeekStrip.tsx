import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MoonCanvas } from './Moon';
import { Text } from '@/components/Text';
import type { MoonState, WeekSummary } from '@/domain/moonlog';
import { weekdayInitial } from '@/domain/time';
import { space } from '@/theme/tokens';

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function moonLabel(m: MoonState, today: string): string {
  const day = WEEKDAY[new Date(`${m.night}T12:00:00`).getDay()];
  const when = m.night === today ? `Tonight, ${day}` : day;
  if (!m.read) return `${when}: new moon, no reading yet`;
  if (m.halo) return `${when}: full moon with a reflection`;
  if (m.full) return `${when}: full moon`;
  return `${when}: moon ${Math.round(m.fill * 100)} percent full`;
}

/** Mon to Sun moons with weekday initials, in one canvas. Tonight gets a faint ring. */
export function WeekStrip({ week, today, size = 30 }: { week: WeekSummary; today: string; size?: number }) {
  const [width, setWidth] = useState(0);
  const height = size * 1.7;
  const step = width / 7;
  const moons = width
    ? week.moons.map((m, i) => ({
        key: m.night,
        cx: step * i + step / 2,
        cy: height / 2,
        r: size / 2,
        fill: m.fill,
        full: m.full,
        halo: m.halo,
        today: m.night === today,
        label: moonLabel(m, today),
      }))
    : [];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.root}>
      {width ? <MoonCanvas width={width} height={height} moons={moons} /> : <View style={{ height }} />}
      <View style={styles.initials} importantForAccessibility="no-hide-descendants">
        {week.moons.map((m) => (
          <Text
            key={m.night}
            variant="caption"
            tone={m.night === today ? 'starlight' : 'mist'}
            style={styles.initial}>
            {weekdayInitial(m.night)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  initials: { flexDirection: 'row' },
  initial: { flex: 1, textAlign: 'center', fontStyle: 'normal', fontSize: 12 },
});
