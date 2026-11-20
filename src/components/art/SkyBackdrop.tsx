import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Cloud, type CloudShape } from './Cloud';
import { Crescent } from './Crescent';
import { useSvgId } from './svgId';
import { StarField } from '../StarField';
import { useTheme } from '@/theme/theme';

type Placed = { x: number; y: number };
type CloudSpot = Placed & { w: number; shape: CloudShape; o: number; drift: number };

/**
 * A few hand-placed scenes, positioned as fractions of the screen so they
 * suit any phone. Each screen picks one by name, so it always looks the same.
 */
const SCENES: { moon: Placed & { size: number }; clouds: CloudSpot[] }[] = [
  {
    moon: { x: 0.8, y: 0.13, size: 40 },
    clouds: [
      { x: 0.66, y: 0.15, w: 0.32, shape: 'tall', o: 0.75, drift: 10 },
      { x: -0.06, y: 0.36, w: 0.26, shape: 'wide', o: 0.5, drift: 8 },
      { x: 0.82, y: 0.58, w: 0.16, shape: 'small', o: 0.4, drift: 6 },
    ],
  },
  {
    moon: { x: 0.84, y: 0.2, size: 30 },
    clouds: [
      { x: 0.58, y: 0.2, w: 0.24, shape: 'small', o: 0.6, drift: 8 },
      { x: 0.74, y: 0.46, w: 0.3, shape: 'wide', o: 0.45, drift: 10 },
    ],
  },
  {
    moon: { x: 0.14, y: 0.21, size: 34 },
    clouds: [
      { x: 0.7, y: 0.09, w: 0.38, shape: 'wide', o: 0.7, drift: 12 },
      { x: -0.05, y: 0.27, w: 0.3, shape: 'tall', o: 0.55, drift: 8 },
      { x: 0.76, y: 0.52, w: 0.2, shape: 'small', o: 0.4, drift: 6 },
    ],
  },
];

function pick(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return SCENES[Math.abs(h) % SCENES.length];
}

type Props = {
  /** Picks the scene, so a screen always gets the same moon and clouds. */
  scene?: string;
  /** Set false for a plain sky with stars only (busy screens, the lamp). */
  illustrated?: boolean;
  /** Star density, passed to the star field. */
  density?: number;
  /**
   * Hang the scene's moon in the sky. Off by default: most screens carry
   * their moon in the header, beside the title, where it never sits on text.
   */
  moon?: boolean;
};

/**
 * The whimsical night behind every screen: an indigo sky fading to a plum
 * floor, tiny stars, and (on most screens) a crescent moon and a few clouds.
 * It stays still while content scrolls over it; the clouds drift very slowly.
 */
export function SkyBackdrop({ scene = 'sky', illustrated = true, density = 11, moon: showMoon = false }: Props) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const id = useSvgId('sky');
  const { moon, clouds } = pick(scene);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1={0} x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.skyTop} />
            <Stop offset="0.45" stopColor={colors.night} />
            <Stop offset="1" stopColor={colors.skyFloor} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
      </Svg>
      <StarField density={density} seed={scene.length + 7} />
      {illustrated ? (
        <>
          {showMoon ? (
            <View style={[styles.abs, { left: moon.x * width - moon.size / 2, top: moon.y * height - moon.size / 2 }]}>
              <Crescent size={moon.size} />
            </View>
          ) : null}
          {clouds.map((c, i) => (
            <Cloud
              key={i}
              width={c.w * width}
              shape={c.shape}
              opacity={c.o}
              drift={c.drift}
              style={[styles.abs, { left: c.x * width, top: c.y * height }]}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
