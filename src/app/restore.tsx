import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { makeBackup, restoreBackup, SCHEMA_VERSION } from '@/data/backup';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { describeSummary, parseBackup, summarizeBackup, type Backup } from '@/domain/backup';
import { pickBackupText } from '@/features/backup/files';
import { space } from '@/theme/tokens';

type State =
  | { name: 'start' }
  | { name: 'reading' }
  | { name: 'chosen'; backup: Backup }
  | { name: 'restoring' }
  | { name: 'done'; what: string }
  | { name: 'error'; message: string };

/**
 * Restore a backup, for example on a new phone. The file is checked whole
 * before anything is touched, and the reader sees what it holds next to
 * what this phone holds before replacing anything.
 */
export default function RestoreScreen() {
  const db = useDb();
  const [state, setState] = useState<State>({ name: 'start' });
  const { data: here } = useLiveQuery(
    async () => summarizeBackup(await makeBackup(db)),
    ['books', 'sessions', 'journal', 'paths'],
  );

  async function choose() {
    setState({ name: 'reading' });
    try {
      const text = await pickBackupText();
      if (text == null) return setState({ name: 'start' });
      const parsed = parseBackup(text, SCHEMA_VERSION);
      setState(
        parsed.ok ? { name: 'chosen', backup: parsed.backup } : { name: 'error', message: parsed.reason },
      );
    } catch {
      setState({ name: 'error', message: 'That file could not be read. Try choosing it again.' });
    }
  }

  async function restore(backup: Backup) {
    setState({ name: 'restoring' });
    try {
      await restoreBackup(db, backup);
      setState({ name: 'done', what: describeSummary(summarizeBackup(backup)) });
    } catch {
      setState({ name: 'error', message: 'Restoring failed, so nothing on this phone was changed.' });
    }
  }

  const hereText = here ? describeSummary(here) : '';
  const phoneEmpty = !!here && !here.books && !here.sessions && !here.entries;

  return (
    <Screen back title="Restore a backup" caption="Bring your sky to this phone from a backup file you kept.">
      {state.name === 'start' || state.name === 'reading' || state.name === 'error' ? (
        <View style={styles.block}>
          {state.name === 'error' ? <Text tone="aurora">{state.message}</Text> : null}
          <Text tone="mist">
            Choose a file named like stellibria-2026-11-20.json, from Files, Drive or wherever you kept it.
          </Text>
          <View style={styles.actions}>
            <Button label="Choose the backup file" onPress={choose} disabled={state.name === 'reading'} />
          </View>
        </View>
      ) : null}

      {state.name === 'chosen' ? (
        <View style={styles.block}>
          <View style={styles.compare}>
            <Text variant="caption">
              In the backup
              {state.backup.exportedAt ? `, from ${new Date(state.backup.exportedAt).toDateString()}` : ''}
            </Text>
            <Text variant="heading">{describeSummary(summarizeBackup(state.backup))}</Text>
          </View>
          {!phoneEmpty ? (
            <View style={styles.compare}>
              <Text variant="label">On this phone now</Text>
              <Text>{hereText}</Text>
              <Text tone="mist">
                Restoring replaces everything on this phone with the backup. What is here now and not in the
                backup will be gone.
              </Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={phoneEmpty ? 'Restore it' : 'Replace with the backup'}
              onPress={() => restore(state.backup)}
            />
            <Button kind="quiet" label="Not now" onPress={() => setState({ name: 'start' })} />
          </View>
        </View>
      ) : null}

      {state.name === 'restoring' ? <Text tone="mist">Restoring your sky…</Text> : null}

      {state.name === 'done' ? (
        <View style={styles.block}>
          <Text variant="heading">Your sky is back.</Text>
          <Text tone="mist">{state.what}, restored.</Text>
          <Text variant="caption">
            Downloaded classics are not kept in backups. Download them again from the shelf to read them here.
          </Text>
          <View style={styles.actions}>
            <Button label="Go to your sky" onPress={() => router.dismissTo('/')} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.lg },
  compare: { gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
