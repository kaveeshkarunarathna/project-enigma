import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { entryDate, KIND_LABEL } from './format';
import { Pressable } from '@/components/Pressable';
import { Text } from '@/components/Text';
import { getPrompt } from '@/content/prompts';
import type { JournalEntry } from '@/data/journal';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** One journal entry in the list: date and book, then the words. */
export function EntryItem({ entry }: { entry: JournalEntry }) {
  const { colors } = useTheme();
  const prompt = getPrompt(entry.promptId);
  const meta = [entryDate(entry.createdAt), entry.bookTitle].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${KIND_LABEL[entry.kind]}, ${meta}. ${entry.quoteText ?? entry.body}`}
      accessibilityHint="Opens the entry"
      haptic={false}
      onPress={() => router.push({ pathname: '/journal/[id]', params: { id: entry.id } })}
      style={styles.item}>
      <Text variant="caption">{meta}</Text>
      {entry.kind === 'quote' ? (
        <View style={[styles.quote, { borderLeftColor: colors.aurora }]}>
          <Text numberOfLines={4} style={styles.italic}>
            {entry.quoteText}
          </Text>
          {entry.quotePage ? <Text variant="caption">Page {entry.quotePage}</Text> : null}
        </View>
      ) : null}
      {entry.kind === 'reflection' && prompt ? (
        <Text variant="caption" tone="aurora" numberOfLines={2}>
          {prompt.text}
        </Text>
      ) : null}
      {entry.body ? <Text numberOfLines={4}>{entry.body}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { gap: space.xs, paddingVertical: space.lg },
  quote: { borderLeftWidth: 2, paddingLeft: space.md, gap: space.xs },
  italic: { fontFamily: 'Literata_400Regular_Italic' },
});
