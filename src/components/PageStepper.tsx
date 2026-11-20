import { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Chip } from './Chip';
import { IconButton } from './IconButton';
import { MinusIcon, PlusIcon } from './icons';
import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { fontFamily, motion, space } from '@/theme/tokens';

type Props = {
  /** The page the reader stopped on. */
  value: number;
  onChange: (page: number) => void;
  /** Where this session started, so the stepper can say how many pages were read. */
  from: number;
  /** Pages in the reader's edition, when known. */
  total: number | null;
  label?: string;
};

const JUMPS = [5, 10, 20] as const;

/**
 * "Which page did you stop on?" for a paper book, in a couple of taps: the
 * page is big and editable, minus and plus nudge it, and quick jumps add a
 * few pages at a time. It says how many pages that makes tonight.
 */
export function PageStepper({ value, onChange, from, total, label = 'Stopped on page' }: Props) {
  const { colors, reduceMotion } = useTheme();
  // The page number gives a small tick each time it moves, like a counter wheel.
  const tick = useSharedValue(1);
  const last = useRef(value);
  useEffect(() => {
    if (last.current === value) return;
    last.current = value;
    if (reduceMotion) return;
    tick.set(withSequence(withTiming(1.08, { duration: 90 }), withTiming(1, { duration: motion.fade })));
  }, [value, reduceMotion, tick]);
  const ticking = useAnimatedStyle(() => ({ transform: [{ scale: tick.get() }] }));
  const clamp = (n: number) => Math.max(0, total ? Math.min(total, n) : n);
  const read = Math.max(0, value - from);

  return (
    <View style={styles.root}>
      <Text variant="caption">{label}</Text>
      <View style={styles.row}>
        <IconButton
          icon={MinusIcon}
          label="One page back"
          tone="mist"
          onPress={() => onChange(clamp(value - 1))}
        />
        <Animated.View style={ticking}>
          <TextInput
            value={value ? String(value) : ''}
            onChangeText={(t) => onChange(clamp(parseInt(t.replace(/\D/g, ''), 10) || 0))}
            keyboardType="number-pad"
            accessibilityLabel={`${label}${total ? `, of ${total}` : ''}`}
            placeholder={String(from || 0)}
            placeholderTextColor={colors.mist}
            selectTextOnFocus
            style={[styles.input, { color: colors.starlight, borderBottomColor: colors.hairline }]}
          />
        </Animated.View>
        <IconButton
          icon={PlusIcon}
          label="One page on"
          tone="mist"
          onPress={() => onChange(clamp(value + 1))}
        />
        {total ? (
          <Text tone="mist" numberOfLines={1} style={styles.total}>
            of {total}
          </Text>
        ) : null}
      </View>
      <View style={styles.jumps}>
        {JUMPS.map((j) => (
          <Chip
            key={j}
            selected={false}
            label={`+${j}`}
            accessibilityLabel={`${j} more pages`}
            onPress={() => onChange(clamp(Math.max(value, from) + j))}
          />
        ))}
      </View>
      <Text variant="caption" tone={read ? 'aurora' : undefined} accessibilityLiveRegion="polite">
        {read ? `${read} ${read === 1 ? 'page' : 'pages'} this session` : `You were on page ${from || 0}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    width: 112,
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 48,
    textAlign: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 2,
  },
  total: { marginLeft: space.xs, flexShrink: 0 },
  jumps: { flexDirection: 'row', gap: space.sm },
});
