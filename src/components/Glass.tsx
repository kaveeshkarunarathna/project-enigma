import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useSvgId } from './art/svgId';
import type { Tilt } from '@/features/sky/useTilt';
import { useTheme } from '@/theme/theme';

/**
 * A pane of night glass: a translucent indigo tint that lets the sky show
 * through, a cool sheen across its top edge where it catches the moon, and
 * a fine bright rim. It floats: with `tilt` it drifts a few points against
 * the sky behind it, as something nearer the reader would. No blur, so it
 * costs nothing to draw and looks the same on every phone.
 */
export function Glass({
  children,
  style,
  radius = 24,
  tilt,
  strength = 1,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  /** When given, the pane floats a little against the sky as the phone tilts. */
  tilt?: Tilt;
  /** 1 for a card, less for a quieter pane. */
  strength?: number;
}) {
  const { colors, scheme } = useTheme();
  const sheen = useSvgId('glass-sheen');
  const glow = useSvgId('glass-glow');
  const float = useAnimatedStyle(() =>
    tilt ? { transform: [{ translateX: tilt.x.get() * 3 }, { translateY: tilt.y.get() * 3 }] } : {},
  );
  const tint =
    scheme === 'night' ? `rgba(38, 34, 84, ${0.5 * strength})` : `rgba(255, 250, 240, ${0.55 * strength})`;
  return (
    <Animated.View
      style={[
        styles.pane,
        {
          borderRadius: radius,
          backgroundColor: tint,
          borderColor: scheme === 'night' ? 'rgba(234, 219, 193, 0.16)' : colors.hairline,
        },
        float,
        style,
      ]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={sheen} x1="0" y1="0" x2="0.35" y2="1">
              <Stop offset="0" stopColor="#E8E4FF" stopOpacity={0.14 * strength} />
              <Stop offset="0.45" stopColor="#E8E4FF" stopOpacity={0.03 * strength} />
              <Stop offset="1" stopColor="#E8E4FF" stopOpacity={0} />
            </LinearGradient>
            <RadialGradient id={glow} cx="0.15" cy="0" r="0.9">
              <Stop offset="0" stopColor={colors.aurora} stopOpacity={0.1 * strength} />
              <Stop offset="1" stopColor={colors.aurora} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${sheen})`} />
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${glow})`} />
        </Svg>
        {/* The bright rim along the top edge, where the light catches. */}
        <View style={[styles.rim, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pane: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowColor: '#05051A',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  rim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
});
