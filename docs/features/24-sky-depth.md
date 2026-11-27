# Phase 24: Depth in the sky

**Status:** shipped

The sky had the right pieces but read flat: every layer equally sharp,
equally bright, moving by the same kind of offset. Depth comes from
difference between layers, so this phase makes far things smaller, dimmer,
bluer, softer and slower, and near things larger, warmer, sharper and
quicker to answer the hand. Plan and research: the "Stellibria: adding
depth to the Sky" doc. Sky tab only for now.

## Planes, back to front

| Plane | What is on it | Share of drag and zoom (`k`) | Tilt shift |
| --- | --- | --- | --- |
| Far | Tiny cool soft stars, baked; 40 twinkle | 0.15 | 1.8 pt |
| Milky Way | Shader band with dust lanes, nebula, grain; band stars and dust, baked | 0.3 | 4.2 pt |
| Moon | The crescent | 0.06 (it is farthest of all) | 5 pt |
| Your stars | The star chart | 1 (taps land where they look) | 7 pt |
| Clouds | The two banks, sliding sideways only | 1.2 | 12 pt |
| Near | Corner clouds and four or five huge faint plum motes | 1.4 (corners capped) | up to 16 pt |

Values live in `depth` in `src/theme/tokens.ts`. `usePlane` in
`src/features/sky/depth.ts` applies them to a view; the backdrop applies
the same rule as Skia transforms.

## Depth inside the constellations

Every constellation and every star has a distance `z` (0 near, 1 far).
Complete constellations hang nearer, ones still being read farther back,
and each star sits a little nearer or farther than its constellation (a
seeded stream per path, the same on every phone).

- Near stars are up to 40% bigger, brighter and warmer; far ones smaller,
  fainter, bluer, with a wider and softer halo and a slightly blurred core.
- Lines fade toward their far end and are thinner farther back. Names are
  smaller and dimmer for far constellations.
- With tilt and drag, things nearer than the middle slide a little more and
  farther ones a little less (`depthShift`), so each shape changes subtly
  and constellations pass one another. Taps are tested against where a star
  is seen, not where it was laid out.

## Light

Stars have a tiny hot core, their own colour (cool for short books, warm
candle for long ones) and a halo drawn with a screen blend, so overlapping
light adds up. Finished constellation lines carry a faint outer glow. Only
the book finished last breathes, once every 7 seconds.

## Motion that answers the hand

- **Tilt** runs on the UI thread with Reanimated's rotation sensor, eased
  every frame, its rest angle drifting to how the phone is held. The sensor
  is mounted only while the Sky is on screen. Without the rotation sensor it
  falls back to expo-sensors device motion.
- **Drag** moves each plane by its share; a flick glides to rest.
- **Choosing a star** dims the backdrop 35% and cross-fades it to a
  pre-softened copy (no animated blur), the star grows 8% and the chosen
  constellation comes forward a little. Completing a constellation while
  the sky is open gives one soft haptic.

## Performance

One Skia canvas for the backdrop. Far stars, band stars and dust are baked
once into images (sharp copies at 2x, soft copies at 1x); the Milky Way
shader is drawn once at half size into an image when the night's mood
changes. Per frame the backdrop draws a gradient, a few images and 40
circles. No blur radius is ever animated.

## Reduce Motion

No tilt (the sensor is not mounted), no drag parallax for the backdrop, no
twinkle, no breathing, no growth, no soft cross-fade and no fling. The
static depth stays (size, brightness, colour, softness), choosing only dims,
and the reader's own stars still follow the finger.

## Not yet

- Optional quiet star tones (off by default) from the plan.
- Tilt and Reduce Motion checked on a real iPhone (the simulator has no
  rotation sensor), and frame time on a mid-range Android.
