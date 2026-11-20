import { StyleSheet, View } from 'react-native';

import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

type Props = { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string };

/** A small choice pill. Selected is a soft starlight outline, never a fill. */
export function Chip({ label, selected, onPress, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}>
      <View
        style={[
          styles.chip,
          {
            borderColor: selected ? colors.starlight : colors.hairline,
            backgroundColor: selected ? colors.raised : 'transparent',
          },
        ]}>
        <Text variant="button" tone={selected ? 'starlight' : 'mist'}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 52,
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
