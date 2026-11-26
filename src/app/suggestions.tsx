import { StyleSheet, View } from 'react-native';

import { Hairline } from '@/components/Hairline';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { clearDismissedSuggestions, dismissedSuggestions } from '@/data/suggestions';
import { useMeaning } from '@/features/meaning/meaning';
import { SuggestionRow } from '@/features/suggest/SuggestionRow';
import { useSuggestions } from '@/features/suggest/useSuggestions';
import { space } from '@/theme/tokens';

/** More books to read next, each with the reason in one line. */
export default function SuggestionsScreen() {
  const db = useDb();
  const suggestions = useSuggestions(10);
  const meaning = useMeaning();
  const { data: dismissed } = useLiveQuery(() => dismissedSuggestions(db), ['settings']);

  return (
    <Screen back title="Next stars" caption="Chosen on this phone from what you read and write.">
      {suggestions && !suggestions.length ? (
        <Text tone="mist">Nothing new to suggest right now. Finish a book or write a little, and look again.</Text>
      ) : null}
      <View>
        {(suggestions ?? []).map((s, i) => (
          <View key={s.key}>
            {i > 0 ? <Hairline /> : null}
            <SuggestionRow suggestion={s} />
          </View>
        ))}
      </View>
      <Text variant="caption" style={styles.note}>
        {meaning.phase === 'ready'
          ? 'Suggestions listen to your finished books, your paths and the meaning of what you write in your journal. Quoted passages are never used.'
          : 'Suggestions listen to your finished books, your paths and the words in your journal. Turn on search by meaning in Settings and they listen more closely.'}
      </Text>
      {dismissed?.length ? (
        <Pressable
          accessibilityRole="button"
          haptic={false}
          onPress={() => clearDismissedSuggestions(db)}
          style={styles.link}>
          <Text tone="mist">{`Bring back ${dismissed.length === 1 ? 'the book' : `${dismissed.length} books`} you set aside`}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { paddingTop: space.md },
  link: { paddingVertical: space.md, alignSelf: 'flex-start' },
});
