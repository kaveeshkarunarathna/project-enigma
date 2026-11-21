import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/BookCover';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { addBook, setBookStatus, type BookStatus } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { formatYear } from '@/features/books/format';
import { formatIsbn, toIsbn13 } from '@/domain/isbn';
import { CatalogError, coverUrl, lookupIsbn, type EditionBook } from '@/services/openLibrary';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

type State =
  | { name: 'scanning' }
  | { name: 'looking'; isbn: string }
  | { name: 'found'; book: EditionBook }
  | { name: 'missing'; isbn: string }
  | { name: 'error'; isbn: string; message: string };

/**
 * Add a paper book by scanning the barcode on its back cover. The ISBN finds
 * the reader's exact edition, so page numbers in the app match the pages in
 * their hands. The camera only reads the barcode; no picture is taken.
 */
export default function BarcodeScreen() {
  const db = useDb();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ isbn?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<State>({ name: 'scanning' });
  const [typed, setTyped] = useState(params.isbn ?? '');
  const [busy, setBusy] = useState(false);
  const handled = useRef<string | null>(null);

  async function look(isbn: string) {
    setState({ name: 'looking', isbn });
    try {
      const book = await lookupIsbn(isbn);
      setState(book ? { name: 'found', book } : { name: 'missing', isbn });
    } catch (e) {
      setState({
        name: 'error',
        isbn,
        message: e instanceof CatalogError ? e.message : 'Something went wrong. Please try again.',
      });
    }
  }

  function onScanned(result: BarcodeScanningResult) {
    const isbn = toIsbn13(result.data);
    if (!isbn || handled.current === isbn) return;
    handled.current = isbn;
    Haptics.selectionAsync().catch(() => {});
    look(isbn);
  }

  function again() {
    handled.current = null;
    setState({ name: 'scanning' });
  }

  async function add(book: EditionBook, status: BookStatus) {
    setBusy(true);
    try {
      const saved = await addBook(db, {
        isbn: book.isbn,
        olWorkKey: book.workKey,
        title: book.title,
        author: book.author,
        coverUrl: coverUrl(book.coverId, 'L'),
        firstPublished: book.firstPublished,
        pageCount: book.pageCount,
        status,
      });
      if (status === 'reading' && saved.status !== 'reading') await setBookStatus(db, saved.id, 'reading');
      router.replace({ pathname: '/book/[id]', params: { id: saved.id } });
    } finally {
      setBusy(false);
    }
  }

  const typedIsbn = toIsbn13(typed);
  const canScan = Platform.OS !== 'web' && permission?.granted;

  return (
    <Screen
      back
      title="Scan the barcode"
      caption="On the back cover. It finds your edition, so page numbers match your book.">
      {state.name === 'scanning' ? (
        canScan ? (
          <View style={[styles.camera, { borderColor: colors.hairline }]}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
              onBarcodeScanned={onScanned}
            />
            <View pointerEvents="none" style={[styles.guide, { borderColor: colors.aurora }]} />
          </View>
        ) : Platform.OS !== 'web' ? (
          <View style={styles.block}>
            <Text tone="mist">
              The camera reads the barcode on the spot. Nothing is photographed or kept.
            </Text>
            <View style={styles.actions}>
              <Button
                label="Allow the camera"
                onPress={async () => {
                  const r = await requestPermission();
                  if (!r.granted && !r.canAskAgain) {
                    setState({
                      name: 'error',
                      isbn: '',
                      message:
                        'The camera is off for Stellibria. You can allow it in Settings, or type the ISBN.',
                    });
                  }
                }}
              />
            </View>
          </View>
        ) : (
          <Text tone="mist">Scanning works in the phone app. Type the ISBN below instead.</Text>
        )
      ) : null}

      {state.name === 'looking' ? (
        <View style={styles.row} accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <Text tone="mist">Looking up {formatIsbn(state.isbn)}…</Text>
        </View>
      ) : null}

      {state.name === 'found' ? (
        <View style={styles.block}>
          <View style={styles.found}>
            <BookCover uri={coverUrl(state.book.coverId, 'M')} title={state.book.title} width={84} />
            <View style={styles.foundText}>
              <Text variant="heading">{state.book.title}</Text>
              {state.book.author ? <Text tone="mist">{state.book.author}</Text> : null}
              <Text variant="caption">
                {[
                  state.book.pageCount
                    ? `${state.book.pageCount} pages in this edition`
                    : 'Page count unknown',
                  state.book.publisher,
                  state.book.firstPublished
                    ? `first published ${formatYear(state.book.firstPublished)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button label="Start reading" onPress={() => add(state.book, 'reading')} disabled={busy} />
            <Button
              kind="quiet"
              label="Want to read"
              onPress={() => add(state.book, 'want')}
              disabled={busy}
            />
          </View>
          <Link label="Not this book? Scan again" onPress={again} />
        </View>
      ) : null}

      {state.name === 'missing' ? (
        <View style={styles.block}>
          <Text tone="mist">
            The catalog does not know {formatIsbn(state.isbn)} yet. Add it by hand; the page count is on the
            last page.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Add it by hand"
              onPress={() => router.replace({ pathname: '/book/new', params: { isbn: state.isbn } })}
            />
          </View>
          <Link label="Scan again" onPress={again} />
        </View>
      ) : null}

      {state.name === 'error' ? (
        <View style={styles.block}>
          <Text tone="aurora">{state.message}</Text>
          {state.isbn ? (
            <View style={styles.actions}>
              <Button kind="quiet" label="Try again" onPress={() => look(state.isbn)} />
            </View>
          ) : null}
          <Link label="Scan again" onPress={again} />
        </View>
      ) : null}

      {state.name === 'scanning' || state.name === 'error' ? (
        <View style={styles.block}>
          <TextField
            label="Or type the ISBN"
            value={typed}
            onChangeText={setTyped}
            keyboardType="number-pad"
            placeholder="978…"
            hint="Above the barcode, 10 or 13 digits."
            note={
              typed.replace(/\D/g, '').length >= 10 && !typedIsbn ? 'That number does not check out.' : null
            }
          />
          <View style={styles.actions}>
            <Button
              kind="quiet"
              label="Look it up"
              onPress={() => typedIsbn && look(typedIsbn)}
              disabled={!typedIsbn}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" haptic={false} onPress={onPress} style={styles.link}>
      <Text tone="mist">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  camera: {
    height: 260,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: { width: '72%', height: 96, borderWidth: 1.5, borderRadius: radius.sm, opacity: 0.8 },
  block: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  found: { flexDirection: 'row', gap: space.lg },
  foundText: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  link: { paddingVertical: space.sm, alignSelf: 'flex-start' },
});
