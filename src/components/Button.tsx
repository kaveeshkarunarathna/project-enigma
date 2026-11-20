import { StyleSheet, View } from 'react-native';

import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  /**
   * `primary` is solid starlight. Use it once per screen at most.
   * `quiet` is a hairline outline for everything else.
   */
  kind?: 'primary' | 'quiet';
  disabled?: boolean;
  accessibilityHint?: string;
};

export function Button({ label, onPress, kind = 'primary', disabled, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.45 : 1 }}>
      <View
        style={[
          styles.base,
          primary
            ? { backgroundColor: colors.starlight }
            : { borderColor: colors.hairline, borderWidth: StyleSheet.hairlineWidth * 2 },
        ]}>
        <Text variant="button" tone={primary ? 'onStarlight' : 'starlight'}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
