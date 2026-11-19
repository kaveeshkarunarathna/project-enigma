import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { BookStar } from '@/components/sky/BookStar';
import { StarField } from '@/components/StarField';
import { Text } from '@/components/Text';
import { getBook } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { listSessions } from '@/data/sessions';
import { ringSize } from '@/domain/progress';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

/**
 * A finished book: its star ignites. This is one of only two celebrations in
 * the app (the other is a full moon), so it can take a slow, quiet moment.
 */
export default function IgniteScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const db = useDb();
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: book } = useLiveQuery(() => getBook(db, bookId), ['books'], [bookId]);
  const { data: sessions } = useLiveQuery(() => listSessions(db, { bookId }), ['sessions'], [bookId]);

  const glow = useSharedValue(reduceMotion ? 1 : 0);
  const text = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduceMotion) return;
    glow.set(
      withSequence(
        withTiming(1.12, { duration: 1600, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
    text.set(withDelay(1200, withTiming(1, { duration: 1200 })));
  }, [reduceMotion, glow, text]);

  const starStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, 0.2 + glow.get()),
    transform: [{ scale: 0.8 + 0.2 * glow.get() }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.get() }));

  const nights = new Set((sessions ?? []).map((s) => s.night)).size;
  const minutes = Math.floor((sessions ?? []).reduce((n, s) => n + s.seconds, 0) / 60);
  const size = Math.min(width - space.gutter * 2, 320);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.night, paddingTop: insets.top, paddingBottom: insets.bottom + space.xl },
      ]}>
      <StarField density={14} seed={23} />
      <View style={styles.center}>
        <Animated.View style={starStyle}>
          <BookStar
            size={size}
            brightness={1}
            beads={book ? ringSize(book) : 12}
            lit={book ? ringSize(book) : 12}
            accessibilityLabel={book ? `The star of ${book.title}, fully lit` : 'A fully lit star'}
          />
        </Animated.View>
        <Animated.View style={[styles.text, textStyle]}>
          <Text variant="caption">A star ignites</Text>
          <Text variant="title" style={styles.centerText} accessibilityRole="header">
            {book?.title ?? ''}
          </Text>
          {book?.author ? (
            <Text tone="mist" style={styles.centerText}>
              {book.author}
            </Text>
          ) : null}
          {sessions?.length ? (
            <Text tone="mist" style={[styles.centerText, styles.stats]}>
              {nights} {nights === 1 ? 'night' : 'nights'}, {minutes} minutes, {book?.stardust ?? 0} stardust
            </Text>
          ) : null}
        </Animated.View>
      </View>
      <View style={styles.cta}>
        <Button label="Back to tonight" onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.gutter },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl },
  text: { alignItems: 'center', gap: space.xs },
  centerText: { textAlign: 'center' },
  stats: { marginTop: space.md },
  cta: { alignSelf: 'stretch' },
});
