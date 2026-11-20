import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { entryDate, KIND_LABEL } from './format';
import { Pressable } from '@/components/Pressable';
import { Text } from '@/components/Text';
import type { JournalEntry } from '@/data/journal';
import { space } from '@/theme/tokens';

/** One journal entry in the list: the words, then one small line with the date and book. */
export function EntryItem({ entry }: { entry: JournalEntry }) {
  const meta = [
    entryDate(entry.createdAt),
    entry.bookTitle,
    entry.kind === 'quote' && entry.quotePage ? `page ${entry.quotePage}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${KIND_LABEL[entry.kind]}, ${meta}. ${entry.quoteText ?? entry.body}`}
      accessibilityHint="Opens the entry"
      haptic={false}
      onPress={() => router.push({ pathname: '/journal/[id]', params: { id: entry.id } })}
      style={styles.item}>
      {entry.kind === 'quote' ? (
        <Text variant="prose" numberOfLines={4}>
          “{entry.quoteText}”
        </Text>
      ) : null}
      {entry.body ? (
        <Text variant={entry.kind === 'quote' ? 'body' : 'prose'} numberOfLines={4}>
          {entry.body}
        </Text>
      ) : null}
      <Text variant="caption">{meta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { gap: space.xs, paddingVertical: space.lg },
});
