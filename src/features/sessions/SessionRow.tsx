import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { Text } from '@/components/Text';
import type { Session } from '@/data/sessions';
import { clockTime, sessionPages } from '@/domain/nights';
import { space } from '@/theme/tokens';

/** "22 minutes, pages 40 to 58", the way a session reads back. */
export function sessionSummary(s: Session): string {
  const minutes = Math.round(s.seconds / 60);
  const pages = sessionPages(s);
  return [
    `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
    pages ? `pages ${s.pageFrom ?? 0} to ${s.pageTo}` : s.pageTo ? `stopped on page ${s.pageTo}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/** One reading session in a list. Tapping it opens it to fix or delete. */
export function SessionRow({ session, title }: { session: Session; title: string }) {
  const summary = sessionSummary(session);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${clockTime(session.startedAt)}. ${summary}.`}
      accessibilityHint="Opens the session to fix or delete it"
      haptic={false}
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      style={styles.row}>
      <View style={styles.text}>
        <Text variant="heading" numberOfLines={1}>
          {title}
        </Text>
        <Text tone="mist">{summary}</Text>
      </View>
      <Text variant="caption">{clockTime(session.startedAt)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  text: { flex: 1, gap: 2 },
});
