import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useDb } from '@/data/DataProvider';
import { notifyChanged } from '@/data/live';
import { DEV_TOOLS, loadSampleSky } from '@/features/dev/sampleData';
import { space } from '@/theme/tokens';

/** Developer tools. Hidden in store builds. */
export default function DevScreen() {
  const db = useDb();
  const [status, setStatus] = useState<string | null>(null);

  if (!DEV_TOOLS) {
    return (
      <Screen back title="Not here">
        <EmptyState heading="Nothing to see" body="This page is only for development builds." />
      </Screen>
    );
  }

  return (
    <Screen back title="Dev tools" caption="Only in development builds.">
      <View style={styles.group}>
        <Text tone="mist">Fill the app with a month of sample reading to see every screen.</Text>
        <Button
          label="Load a sample sky"
          onPress={async () => {
            setStatus('Loading…');
            await loadSampleSky(db);
            setStatus('Done.');
            router.replace('/');
          }}
        />
        <Button
          kind="quiet"
          label="Erase everything"
          onPress={async () => {
            await db.execAsync(
              `DELETE FROM journal_entries; DELETE FROM sessions; DELETE FROM nights;
               DELETE FROM paths WHERE source = 'user'; DELETE FROM books; DELETE FROM settings;`,
            );
            notifyChanged('books', 'sessions', 'nights', 'journal', 'paths', 'settings');
            setStatus('Erased.');
          }}
        />
        {status ? <Text variant="caption">{status}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { gap: space.lg, alignItems: 'flex-start' } });
