import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { cancelAnimation, Easing, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { XIcon } from '@/components/icons';
import { PageStepper } from '@/components/PageStepper';
import { Pressable } from '@/components/Pressable';
import { goBack } from '@/components/Screen';
import { BookStar } from '@/components/sky/BookStar';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { whisper } from '@/components/motion/Whisper';
import { PROMPT_AUTHOR } from '@/content/prompts';
import { getBook, setBookStatus, type Book } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { addEntry } from '@/data/journal';
import { useLiveQuery } from '@/data/live';
import { logSession, recordSessionProgress, type SessionResult } from '@/data/sessions';
import { getState, setState as saveState } from '@/data/settings';
import {
  elapsedMs,
  formatClock,
  initialLamp,
  isDue,
  LAMP_DURATIONS,
  lampReducer,
  MIN_SESSION_SECONDS,
  targetMs,
  type LampState,
} from '@/domain/lamp';
import { promptFor } from '@/domain/prompts';
import { useReaderGenre } from '@/features/paths/useReaderGenre';
import { litBeads, ringSize, sessionStardust, starBrightness, bookCompletion } from '@/domain/progress';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

const LAMP_KEY = 'lamp';
const LIGHT_TURN_MS = 14_000;
const KEEP_AWAKE_TAG = 'stellibria-lamp';

/**
 * The Lamp. Pick a length (or Open), and a light circles the book's star while
 * you read. When the time is up there is one soft haptic and the session saves
 * itself; then you can note the page you reached and a thought, or keep reading.
 */
export default function LampScreen() {
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  const db = useDb();
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: book } = useLiveQuery(
    () => (bookId ? getBook(db, bookId) : Promise.resolve(null)),
    ['books'],
    [bookId],
  );

  const [state, dispatch] = useReducer(lampReducer, initialLamp(bookId ?? null));
  const [now, setNow] = useState(() => Date.now());
  const [saved, setSaved] = useState<SessionResult | null>(null);
  const [tooShort, setTooShort] = useState(false);
  const savingRef = useRef(false);

  // Bring back a lamp that was running when the app was closed.
  useEffect(() => {
    getState<LampState>(db, LAMP_KEY).then((stored) => {
      if (
        stored &&
        stored.bookId === (bookId ?? null) &&
        (stored.phase === 'running' || stored.phase === 'paused')
      ) {
        dispatch({ type: 'restore', state: stored });
      }
    });
  }, [db, bookId]);

  // Remember a running lamp, forget it once it is done.
  useEffect(() => {
    const active = state.phase === 'running' || state.phase === 'paused';
    saveState(db, LAMP_KEY, active ? state : null).catch(() => {});
  }, [db, state]);

  const finish = useCallback(
    async (at: number) => {
      if (savingRef.current) return;
      savingRef.current = true;
      dispatch({ type: 'complete', now: at });
      const target = targetMs(state);
      const ms = Math.min(elapsedMs(state, at), target ?? Number.MAX_SAFE_INTEGER);
      const seconds = Math.round(ms / 1000);
      if (seconds < MIN_SESSION_SECONDS) {
        setTooShort(true);
        savingRef.current = false;
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const result = await logSession(db, {
        bookId: state.bookId,
        startedAt: new Date(state.startedAt ?? at - ms),
        endedAt: new Date(at),
        seconds,
      });
      setSaved(result);
      savingRef.current = false;
    },
    [db, state],
  );

  // Tick a few times a second while running; finish when the time is up.
  useEffect(() => {
    if (state.phase !== 'running') return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (isDue(state, t)) finish(t);
    };
    tick();
    const id = setInterval(tick, 500);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [state, finish]);

  // The lamp light circling the star.
  const angle = useSharedValue(-Math.PI / 2);
  useEffect(() => {
    if (state.phase === 'running' && !reduceMotion) {
      const from = angle.get();
      angle.set(
        withRepeat(
          withTiming(from + Math.PI * 2, { duration: LIGHT_TURN_MS, easing: Easing.linear }),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(angle);
    }
    return () => cancelAnimation(angle);
  }, [state.phase, reduceMotion, angle]);

  const running = state.phase === 'running' || state.phase === 'paused';
  useKeepAwakeWhile(running);

  const elapsed = elapsedMs(state, now);
  const target = targetMs(state);
  const clock =
    state.phase === 'setup'
      ? formatClock(target ?? 0)
      : target != null && state.phase !== 'complete'
        ? formatClock(target - elapsed)
        : formatClock(elapsed);
  const liveStardust = sessionStardust(Math.floor(elapsed / 1000), 0);

  const progress = book ? { ...book, finished: book.status === 'finished' } : null;
  const starSize = Math.min(width - space.gutter * 2, 320);

  return (
    <View style={[styles.root, { backgroundColor: running ? '#070B15' : colors.night }]}>
      <StatusBar hidden={running} style="light" />
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <IconButton
          icon={XIcon}
          label={running ? 'Close the lamp. Your time keeps counting.' : 'Close'}
          tone="mist"
          onPress={goBack}
        />
        <Text variant="caption" numberOfLines={1} style={styles.topTitle}>
          {book ? book.title : 'Reading without a book'}
        </Text>
        <View style={styles.topSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.center}>
            <BookStar
              size={starSize}
              brightness={progress ? starBrightness(bookCompletion(progress), !!book?.startedAt) : 0.6}
              beads={book ? ringSize(book) : 12}
              lit={progress ? litBeads(progress) : 0}
              spin={!running}
              lampAngle={state.phase === 'setup' ? undefined : angle}
              accessibilityLabel={book ? `The star of ${book.title}` : 'A reading star'}
            />
            <Text
              variant="hero"
              accessibilityRole="timer"
              accessibilityLabel={`${clock} ${target != null ? 'left' : 'read'}`}>
              {clock}
            </Text>
            <Text variant="caption">
              {state.phase === 'setup'
                ? 'Choose how long, or read open-ended.'
                : state.phase === 'paused'
                  ? 'Paused. The lamp waits for you.'
                  : state.phase === 'complete'
                    ? 'read this session'
                    : `${liveStardust} stardust gathering`}
            </Text>
          </View>

          {state.phase === 'setup' ? (
            <View style={styles.controls}>
              <View style={styles.chips} accessibilityRole="radiogroup">
                {LAMP_DURATIONS.map((m) => (
                  <Chip
                    key={m}
                    label={String(m)}
                    accessibilityLabel={`${m} minutes`}
                    selected={state.mode.kind === 'countdown' && state.mode.minutes === m}
                    onPress={() => dispatch({ type: 'choose', mode: { kind: 'countdown', minutes: m } })}
                  />
                ))}
                <Chip
                  label="Open"
                  accessibilityLabel="Open-ended, counts up"
                  selected={state.mode.kind === 'open'}
                  onPress={() => dispatch({ type: 'choose', mode: { kind: 'open' } })}
                />
              </View>
              <Button label="Light the lamp" onPress={() => dispatch({ type: 'start', now: Date.now() })} />
            </View>
          ) : null}

          {running ? (
            <View style={styles.row}>
              {state.phase === 'running' ? (
                <Button
                  kind="quiet"
                  label="Pause"
                  onPress={() => dispatch({ type: 'pause', now: Date.now() })}
                />
              ) : (
                <Button label="Resume" onPress={() => dispatch({ type: 'resume', now: Date.now() })} />
              )}
              <Button
                kind="quiet"
                label="End"
                accessibilityHint="Ends the session. Every minute still counts."
                onPress={() => finish(Date.now())}
              />
            </View>
          ) : null}

          {state.phase === 'complete' && tooShort ? (
            <View style={styles.after}>
              <Text variant="heading">Too short to count</Text>
              <Text tone="mist">
                Sessions under 20 seconds are not saved. The lamp is ready when you are.
              </Text>
              <View style={styles.row}>
                <Button
                  label="Try again"
                  onPress={() => {
                    setTooShort(false);
                    dispatch({ type: 'reset' });
                  }}
                />
                <Button kind="quiet" label="Close" onPress={goBack} />
              </View>
            </View>
          ) : null}

          {state.phase === 'complete' && saved ? (
            <AfterSession
              result={saved}
              book={book ?? null}
              onKeepReading={() => {
                setSaved(null);
                dispatch({ type: 'keepReading', now: Date.now() });
              }}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function useKeepAwakeWhile(active: boolean) {
  useEffect(() => {
    if (!active) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [active]);
}

function AfterSession({
  result,
  book,
  onKeepReading,
}: {
  result: SessionResult;
  book: Book | null;
  onKeepReading: () => void;
}) {
  const db = useDb();
  const hasBook = !!book;
  const hasChapters = !!book?.chapterCount;
  // Pages first: the stepper starts on the page the reader was on before tonight.
  const fromPage = book?.currentPage ?? 0;
  const [page, setPage] = useState(fromPage);
  const [chapters, setChapters] = useState(0);
  const [thought, setThought] = useState('');
  const genre = useReaderGenre(result.session.bookId);
  const prompt = promptFor(result.session.night, genre);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const minutes = Math.max(1, Math.round(result.session.seconds / 60));

  async function done() {
    setBusy(true);
    try {
      const pageTo = page > fromPage ? page : 0;
      let markFinished = finished;
      if (hasBook && (pageTo > 0 || chapters > 0)) {
        const p = await recordSessionProgress(db, result.session.id, {
          pageTo: pageTo > 0 ? pageTo : null,
          chaptersCompleted: chapters,
        });
        if (p.reachedEnd) markFinished = true;
      }
      if (markFinished && result.session.bookId) await setBookStatus(db, result.session.bookId, 'finished');
      if (thought.trim()) {
        await addEntry(db, {
          kind: 'reflection',
          body: thought,
          promptId: prompt.id,
          bookId: result.session.bookId,
          sessionId: result.session.id,
        });
      }
      if (markFinished && result.session.bookId) {
        router.replace({ pathname: '/ignite', params: { bookId: result.session.bookId } });
      } else {
        whisper(thought.trim() ? 'Your night and your thought are kept' : "Tonight's star is in your sky", {
          haptic: false,
        });
        goBack();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.after}>
      <View style={styles.afterHead}>
        <Text variant="heading">
          {result.firstOfNight ? 'A new star in your sky' : 'Tonight’s moon is fuller'}
        </Text>
        <Text tone="mist">
          {minutes} {minutes === 1 ? 'minute' : 'minutes'} saved to tonight, and {result.session.stardust}{' '}
          stardust
          {hasBook ? ' for this book.' : '.'}
        </Text>
      </View>

      {hasBook ? (
        <View style={styles.fields}>
          <PageStepper value={page} onChange={setPage} from={fromPage} total={book?.pageCount ?? null} />
          {hasChapters ? (
            <View style={styles.stepper}>
              <Text tone="mist" style={styles.flex}>
                Chapters finished
              </Text>
              <Button kind="quiet" label="−" onPress={() => setChapters((c) => Math.max(0, c - 1))} />
              <Text variant="heading" accessibilityLabel={`${chapters} chapters`}>
                {chapters}
              </Text>
              <Button kind="quiet" label="+" onPress={() => setChapters((c) => c + 1)} />
            </View>
          ) : null}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: finished }}
            onPress={() => setFinished((f) => !f)}
            style={styles.check}>
            <Text tone={finished ? 'aurora' : 'mist'}>
              {finished ? 'I finished this book' : 'Did you finish the book?'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.question}>
        <Text variant="caption">Tonight’s question, if you like</Text>
        <Text style={styles.questionText}>{prompt.text}</Text>
        <Text variant="caption">{PROMPT_AUTHOR}</Text>
      </View>
      <TextField
        accessibilityLabel={`Your answer to: ${prompt.text}`}
        placeholder="A line or two. It stays on your phone."
        value={thought}
        onChangeText={setThought}
        multiline
        hint="Answering adds a teal halo to tonight’s moon."
      />

      <View style={styles.row}>
        <Button label="Done" onPress={done} disabled={busy} />
        <Button kind="quiet" label="Keep reading" onPress={onKeepReading} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm },
  topTitle: { flex: 1, textAlign: 'center' },
  topSpacer: { width: 44 },
  body: { paddingHorizontal: space.gutter, gap: space.xl, flexGrow: 1 },
  center: { alignItems: 'center', gap: space.sm, paddingTop: space.md },
  controls: { gap: space.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  after: { gap: space.xl },
  afterHead: { gap: space.xs },
  fields: { gap: space.lg },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  check: { paddingVertical: space.sm, alignSelf: 'flex-start' },
  question: { gap: space.xs },
  questionText: { fontFamily: 'Literata_400Regular_Italic', fontSize: 18, lineHeight: 26 },
});
