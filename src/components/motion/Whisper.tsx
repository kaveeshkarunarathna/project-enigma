import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '../Text';
import { useTheme } from '@/theme/theme';
import { motion, radius, space } from '@/theme/tokens';

type Note = { id: number; text: string };
let next = 1;
const listeners = new Set<(note: Note) => void>();

/** How long a whisper stays readable before it fades. */
const HOLD_MS = 2400;

/**
 * Confirms that something was kept: a short line that rises at the bottom
 * of the screen and fades on its own, with a soft success haptic. It never
 * asks for anything, so it never needs to be dismissed.
 */
export function whisper(text: string, { haptic = true }: { haptic?: boolean } = {}) {
  if (haptic) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  AccessibilityInfo.announceForAccessibility(text);
  const note = { id: next++, text };
  listeners.forEach((l) => l(note));
}

/** Where whispers appear. Rendered once, above every screen. */
export function WhisperHost() {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState<Note | null>(null);
  const t = useSharedValue(0);

  useEffect(() => {
    const listen = (n: Note) => setNote(n);
    listeners.add(listen);
    return () => {
      listeners.delete(listen);
    };
  }, []);

  useEffect(() => {
    if (!note) return;
    const ease = Easing.out(Easing.cubic);
    const fade = reduceMotion ? 0 : motion.enter;
    t.set(0);
    t.set(
      withSequence(
        withTiming(1, { duration: fade, easing: ease }),
        withDelay(HOLD_MS, withTiming(0, { duration: reduceMotion ? 0 : motion.enter * 1.5 })),
      ),
    );
    const clear = setTimeout(() => setNote(null), fade + HOLD_MS + motion.enter * 1.5 + 50);
    return () => clearTimeout(clear);
  }, [note, reduceMotion, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: reduceMotion ? 0 : (1 - t.get()) * motion.rise }],
  }));

  if (!note) return null;
  return (
    <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + space.xl + 72 }]}>
      <Animated.View
        style={[styles.note, { backgroundColor: colors.raised, borderColor: colors.hairline }, style]}>
        <View style={[styles.spark, { backgroundColor: colors.candlelight }]} />
        <Text variant="body">{note.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.gutter },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  spark: { width: 6, height: 6, borderRadius: 3 },
});
