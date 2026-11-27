import { DeviceMotion } from 'expo-sensors';
import { createElement, useEffect } from 'react';
import {
  Easing,
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/theme';
import { motion } from '@/theme/tokens';

/** How far (radians) the phone tilts before a layer reaches its full shift. */
const RANGE = 0.45;
/**
 * Share of the way to the new reading taken each frame. Readings arrive at
 * the screen's refresh rate, so this is small: the sky follows softly, with
 * no bounce and no jitter.
 */
const EASE = 0.045;
/** How quickly the resting angle drifts to how the phone is held now. */
const DRIFT = 0.0015;

export type Tilt = { x: SharedValue<number>; y: SharedValue<number> };

/**
 * The phone's tilt as two values from -1 to 1, relative to how it was held
 * when the sky opened. Layers of the sky shift by it, the nearer the more.
 * Read on the UI thread, so the sky never waits for JavaScript.
 *
 * Also returns a `source` element to render while tilt should be live: the
 * sensor only runs while it is mounted, so the screen leaves it out while it
 * is hidden or Reduce Motion is on, and the values glide back to rest.
 */
export function useTilt(enabled = true): Tilt & { source: React.ReactElement | null } {
  const { reduceMotion } = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const live = enabled && !reduceMotion;
  useEffect(() => {
    if (live) return;
    const back = { duration: reduceMotion ? 0 : motion.enter, easing: Easing.out(Easing.cubic) };
    x.set(withTiming(0, back));
    y.set(withTiming(0, back));
  }, [live, reduceMotion, x, y]);
  return { x, y, source: live ? createElement(TiltSource, { x, y }) : null };
}

/** Eases one reading of (pitch, roll) into the tilt values. A worklet, so the sensor path stays on the UI thread. */
function step(
  pitch: number,
  roll: number,
  rest: SharedValue<{ pitch: number; roll: number } | null>,
  x: SharedValue<number>,
  y: SharedValue<number>,
  ease: number,
  drift: number,
) {
  'worklet';
  const r = rest.get() ?? { pitch, roll };
  // The resting angle drifts slowly towards how the phone is held now.
  const next = { pitch: r.pitch + (pitch - r.pitch) * drift, roll: r.roll + (roll - r.roll) * drift };
  rest.set(next);
  const tx = Math.max(-1, Math.min(1, (roll - next.roll) / RANGE));
  const ty = Math.max(-1, Math.min(1, (pitch - next.pitch) / RANGE));
  x.set(x.get() + (tx - x.get()) * ease);
  y.set(y.get() + (ty - y.get()) * ease);
}

/** Owns the rotation sensor while mounted and writes eased tilt into `x` and `y`. */
function TiltSource({ x, y }: Tilt) {
  const { sensor, isAvailable } = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' });
  const rest = useSharedValue<{ pitch: number; roll: number } | null>(null);

  useAnimatedReaction(
    () => sensor.get(),
    (v) => {
      if (isAvailable) step(v.pitch, v.roll, rest, x, y, EASE, DRIFT);
    },
  );

  // Without the rotation sensor, fall back to device motion on the JS thread
  // at 20 readings a second, so the easing per reading is larger.
  useEffect(() => {
    if (isAvailable) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    DeviceMotion.isAvailableAsync()
      .then((ok) => {
        if (!ok || cancelled) return;
        DeviceMotion.setUpdateInterval(50);
        sub = DeviceMotion.addListener(({ rotation }) => {
          if (rotation) step(rotation.beta, rotation.gamma, rest, x, y, 0.12, 0.004);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [isAvailable, rest, x, y]);

  return null;
}
