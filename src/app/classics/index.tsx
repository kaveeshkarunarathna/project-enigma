import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Hairline } from '@/components/Hairline';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Text } from '@/components/Text';
import { CLASSICS, type Classic } from '@/content/classics';
import { listClassicTexts, type ClassicText } from '@/data/classics';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { GENRE_LABEL, GENRES } from '@/features/paths/genres';
import { space } from '@/theme/tokens';

/** The free library: public-domain classics to download and read in the app. */
export default function ClassicsScreen() {
  const db = useDb();
  const { data: texts } = useLiveQuery(() => listClassicTexts(db), ['classics']);
  const byId = new Map((texts ?? []).map((t) => [t.classicId, t]));
  const genres = GENRES.filter((g) => CLASSICS.some((c) => c.genre === g));

  return (
    <Screen
      back
      title="Free classics"
      caption="Out of copyright, so free to read here. Each downloads once, then works offline.">
      {genres.map((g) => (
        <Section key={g} title={GENRE_LABEL[g]}>
          {CLASSICS.filter((c) => c.genre === g).map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Hairline /> : null}
              <ClassicRow classic={c} text={byId.get(c.id) ?? null} />
            </View>
          ))}
        </Section>
      ))}
      <Text variant="caption">
        Texts from Project Gutenberg’s volunteers, who prepare public-domain books for everyone.
      </Text>
    </Screen>
  );
}

function ClassicRow({ classic, text }: { classic: Classic; text: ClassicText | null }) {
  const state = !text
    ? `About ${classic.hours} ${classic.hours === 1 ? 'hour' : 'hours'}`
    : text.chaptersRead >= text.chapterCount
      ? 'Finished'
      : text.chaptersRead
        ? `On your phone, ${text.chaptersRead} of ${text.chapterCount} chapters read`
        : 'On your phone';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${classic.title}, ${classic.author}. ${state}.`}
      accessibilityHint={text ? 'Opens the book' : 'Shows how to download it'}
      haptic={false}
      onPress={() => router.push({ pathname: '/classics/[id]', params: { id: classic.id } })}
      style={styles.row}>
      <Text variant="heading">{classic.title}</Text>
      <Text tone="mist">{classic.author}</Text>
      <Text variant="caption">{classic.note}</Text>
      <Text variant="caption" tone={text ? 'aurora' : undefined}>
        {state}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2, paddingVertical: space.md },
});
