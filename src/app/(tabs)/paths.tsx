import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Hairline } from '@/components/Hairline';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Constellation } from '@/components/sky/Constellation';
import { Text } from '@/components/Text';
import { CURATED_PATHS } from '@/content/paths';
import { listBooks } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { getPath, listPaths, type ReadingPathWithBooks } from '@/data/paths';
import { pathProgress } from '@/domain/paths';
import { GENRE_LABEL, GENRES } from '@/features/paths/genres';
import { space } from '@/theme/tokens';

export default function PathsScreen() {
  const db = useDb();
  const { data: paths } = useLiveQuery(async () => {
    const list = await listPaths(db);
    return (await Promise.all(list.map((p) => getPath(db, p.id)))).filter(
      (p): p is ReadingPathWithBooks => !!p,
    );
  }, ['paths']);
  const { data: shelf } = useLiveQuery(() => listBooks(db), ['books']);

  const yours = (paths ?? []).filter((p) => p.joinedAt || p.source === 'user');
  // Curated paths keep the order they are written in, easiest first.
  const seedOrder = (id: string) => CURATED_PATHS.findIndex((c) => c.id === id);
  const curated = (paths ?? [])
    .filter((p) => p.source === 'curated' && !p.joinedAt)
    .sort((a, b) => seedOrder(a.id) - seedOrder(b.id));
  // Genres in a fixed order (philosophy first), not in database order.
  const present = new Set(curated.map((p) => p.genre ?? 'any'));
  const genres = GENRES.filter((g) => present.has(g));

  return (
    <Screen title="Paths">
      {yours.length ? (
        <Section title="Your paths">
          {yours.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Hairline /> : null}
              <PathCard path={p} shelf={shelf ?? []} />
            </View>
          ))}
        </Section>
      ) : (
        <Text tone="mist">
          Follow a curated path below, or build your own from the books you want to read.
        </Text>
      )}

      {genres.map((g) => (
        <Section key={g} title={GENRE_LABEL[g] ?? 'More paths'}>
          {curated
            .filter((p) => (p.genre ?? 'any') === g)
            .map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <Hairline /> : null}
                <PathCard path={p} shelf={shelf ?? []} />
              </View>
            ))}
        </Section>
      ))}

      <View style={styles.build}>
        <Text variant="heading">Build your own path</Text>
        <Text tone="mist">Choose a few books that belong together and give them a name.</Text>
        <View style={styles.buildAction}>
          <Button kind="quiet" label="Start a path" onPress={() => router.push('/paths/new')} />
        </View>
      </View>
    </Screen>
  );
}

function PathCard({
  path,
  shelf,
}: {
  path: ReadingPathWithBooks;
  shelf: Parameters<typeof pathProgress>[1];
}) {
  const [width, setWidth] = useState(0);
  const progress = pathProgress(path.books, shelf);
  const started = progress.states.some((s) => s !== 'none');
  const caption = !path.books.length
    ? 'No books yet'
    : progress.complete
      ? `All ${progress.total} stars lit`
      : started
        ? `${progress.finished} of ${progress.total} stars lit`
        : `${progress.total} books`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${path.title}. ${caption}.`}
      accessibilityHint="Opens the path"
      haptic={false}
      onPress={() => router.push({ pathname: '/paths/[id]', params: { id: path.id } })}
      style={styles.card}>
      {path.books.length ? (
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.mini}>
          {width ? (
            <Constellation
              pathId={path.id}
              states={progress.states}
              fills={progress.fills}
              width={width}
              height={64}
            />
          ) : null}
        </View>
      ) : null}
      <Text variant="heading">{path.title}</Text>
      {path.subtitle ? <Text tone="mist">{path.subtitle}</Text> : null}
      <Text variant="caption">
        {path.source === 'user' ? `Your path, ${caption.toLowerCase()}` : caption}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs, paddingVertical: space.lg },
  mini: { height: 64, marginBottom: space.xs },
  build: { gap: space.xs },
  buildAction: { alignSelf: 'flex-start', marginTop: space.md },
});
