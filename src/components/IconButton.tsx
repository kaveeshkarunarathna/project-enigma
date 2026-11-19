import { StyleSheet } from 'react-native';

import type { Icon } from './icons';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/theme';

type Props = {
  icon: Icon;
  label: string;
  onPress: () => void;
  tone?: 'starlight' | 'mist' | 'aurora';
  size?: number;
};

/** A 44pt round icon button with an accessible label. */
export function IconButton({ icon: I, label, onPress, tone = 'starlight', size = 24 }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={styles.button}>
      <I size={size} weight="light" color={colors[tone]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
