import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { space } from '@/theme/tokens';

type Props = { heading: string; body: string; action?: ReactNode };

/** Quiet empty state: a heading, one or two lines, and at most one action. */
export function EmptyState({ heading, body, action }: Props) {
  return (
    <View style={styles.root}>
      <Text variant="heading">{heading}</Text>
      <Text tone="mist">{body}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm, paddingVertical: space.xl },
  action: { marginTop: space.lg, alignSelf: 'flex-start' },
});
