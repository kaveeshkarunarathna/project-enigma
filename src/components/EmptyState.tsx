import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Cloud } from './art/Cloud';
import { Crescent } from './art/Crescent';
import { Text } from './Text';
import { space } from '@/theme/tokens';

type Props = {
  heading: string;
  body: string;
  action?: ReactNode;
  /** A small moon resting by a cloud above the words. Off for empty states inside busy screens. */
  illustrated?: boolean;
};

/**
 * Quiet, storybook empty state: a small moon and cloud, a tracked heading,
 * one or two lines, and at most one action, all centred.
 */
export function EmptyState({ heading, body, action, illustrated = true }: Props) {
  return (
    <View style={styles.root}>
      {illustrated ? (
        <View style={styles.art}>
          <Crescent size={34} />
          <Cloud width={96} shape="small" opacity={0.85} style={styles.cloud} />
        </View>
      ) : null}
      <Text variant="heading" style={styles.center} accessibilityRole="header">
        {heading}
      </Text>
      <Text tone="mist" style={styles.center}>
        {body}
      </Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm, paddingVertical: space.xl, alignItems: 'center' },
  art: { width: 140, height: 84, alignItems: 'flex-start', justifyContent: 'flex-start', marginBottom: space.md },
  cloud: { position: 'absolute', right: 0, bottom: 0 },
  center: { textAlign: 'center', maxWidth: 300 },
  action: { marginTop: space.lg, alignSelf: 'center' },
});
