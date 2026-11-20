import type { ComponentRef, Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { fontFamily, radius, space, type } from '@/theme/tokens';

type Props = TextInputProps & {
  label?: string;
  /** Quiet helper line under the field. */
  hint?: string | null;
  /** Shown in aurora when set, instead of the hint. */
  note?: string | null;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export function TextField({ label, hint, note, style, multiline, ref, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text variant="caption">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mist}
        selectionColor={colors.aurora}
        cursorColor={colors.aurora}
        keyboardAppearance="dark"
        accessibilityLabel={label ?? rest.placeholder}
        multiline={multiline}
        {...rest}
        style={[
          styles.input,
          {
            color: colors.starlight,
            backgroundColor: colors.raised,
            borderColor: colors.hairline,
            minHeight: multiline ? 120 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
      {note ? (
        <Text variant="caption" tone="aurora">
          {note}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    ...type.body,
    fontFamily: fontFamily.body,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
