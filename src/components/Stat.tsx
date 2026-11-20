import { StyleSheet, View } from 'react-native';

import { CountUp } from './motion/CountUp';
import { Text } from './Text';

/** A number over its label, such as "214 minutes". The number counts up as it appears. */
export function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <CountUp variant="number" value={value} />
      <Text variant="label">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { gap: 2, flexShrink: 1 },
});
