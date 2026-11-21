/**
 * Stellibria design tokens, "Whimsical Night" look.
 *
 * A storybook night: an indigo sky fading to a plum floor, tiny stars, a
 * flat sand-coloured moon and soft plum clouds, all drawn as vectors. Titles
 * are wide-tracked Lato capitals in warm cream; small metadata is muted.
 * Content is separated by space and hairlines. One starlight button per
 * screen. No gold anywhere: candlelight is only ever a glow.
 */

export type Palette = {
  /** Screen background. */
  night: string;
  /** Slightly raised surface for sheets and inputs. */
  raised: string;
  /** Thin separators between groups of content. */
  hairline: string;
  /** Primary text and the one primary button per screen. */
  starlight: string;
  /** Text that sits on a starlight button. */
  onStarlight: string;
  /** Secondary text, inactive icons. */
  mist: string;
  /** Thinking, reflection and labels (teal). */
  aurora: string;
  /** Warm glow around stars and lit windows. Never text, never buttons. */
  candlelight: string;
  /** Faint background stars. */
  faintStar: string;
  /** Top of the sky gradient. `night` is the middle. */
  skyTop: string;
  /** Bottom of the sky gradient: the warm plum floor. */
  skyFloor: string;
  /** Lit top of a cloud; clouds fade from this to nothing. */
  cloud: string;
  /** Body of the cloud bank at the foot of the screen. */
  cloudDeep: string;
  /** The flat crescent moon in the illustrations. */
  moon: string;
};

export const night: Palette = {
  night: '#15153A',
  raised: '#211E46',
  hairline: 'rgba(234, 219, 193, 0.12)',
  starlight: '#EADBC1',
  onStarlight: '#17163A',
  mist: '#A79DBB',
  aurora: '#8FD0C0',
  candlelight: '#E9D2AE',
  faintStar: 'rgba(243, 230, 204, 0.7)',
  skyTop: '#1A1A3E',
  skyFloor: '#211838',
  cloud: '#4C3B5E',
  cloudDeep: '#1F1935',
  moon: '#D8BF97',
};

/** Light "dawn" mode. Same roles, morning sky. */
export const dawn: Palette = {
  night: '#E9EEF4',
  raised: '#F4F6F9',
  hairline: 'rgba(20, 32, 58, 0.12)',
  starlight: '#1E1B44',
  onStarlight: '#F3EBD8',
  mist: '#5B5F82',
  aurora: '#2F7F70',
  candlelight: '#C9A774',
  faintStar: 'rgba(20, 32, 58, 0.25)',
  skyTop: '#DCE3F0',
  skyFloor: '#EFE8EE',
  cloud: '#FFFFFF',
  cloudDeep: '#F4EEF2',
  moon: '#C9A774',
};

/** 4-point spacing scale. Side margins are always `space.gutter`. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  gutter: 20,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  pill: 999,
} as const;

export const fontFamily = {
  /** Wide-tracked capitals: titles, labels, buttons. */
  display: 'Lato_700Bold',
  body: 'Lato_400Regular',
  light: 'Lato_300Light',
  bold: 'Lato_700Bold',
  /** Reading and writing keep a serif, so the journal still feels like a notebook. */
  serif: 'Literata_400Regular',
  serifItalic: 'Literata_400Regular_Italic',
} as const;

/** Letter spacing as a share of the font size, like CSS `em`. */
const track = (size: number, em: number) => Math.round(size * em * 10) / 10;

/**
 * Type scale. Rule: at most three of these sizes on one screen.
 * Titles, labels and buttons are uppercase and widely tracked; body and
 * captions stay in normal case so longer text is easy to read.
 */
export const type = {
  /** Big numbers: the lamp's clock, the page stepper. */
  hero: { fontFamily: fontFamily.light, fontSize: 56, lineHeight: 64, letterSpacing: track(56, 0.04) },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: track(24, 0.2),
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: track(15, 0.16),
    textTransform: 'uppercase',
  },
  /** Small tracked capitals above a group: "IN YOUR HANDS", "THIS WEEK". */
  label: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: track(11, 0.3),
    textTransform: 'uppercase',
  },
  /** A stat's number. */
  number: { fontFamily: fontFamily.light, fontSize: 26, lineHeight: 32, letterSpacing: track(26, 0.04) },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24, letterSpacing: 0.2 },
  caption: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19, letterSpacing: 0.3 },
  /** Journal writing, prompts and quotes. */
  prose: { fontFamily: fontFamily.serifItalic, fontSize: 17, lineHeight: 26 },
  button: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: track(12, 0.14),
    textTransform: 'uppercase',
  },
  /** Choice chips keep normal case: they often hold book titles. */
  chip: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 20, letterSpacing: 0.3 },
} as const;

export type TypeVariant = keyof typeof type;

/** Motion. Calm by default; everything collapses to instant with Reduce Motion. */
export const motion = {
  press: { damping: 18, stiffness: 260, mass: 0.6 },
  pressScale: 0.97,
  fade: 240,
  /** A screen's content rising into place as it opens. */
  enter: 460,
  /** How far content rises, in points. Small on purpose. */
  rise: 10,
  /** Gap between the header and the body settling in. */
  stagger: 90,
  /** Selection changes: chips, sentences, toggles. */
  select: 180,
  /** Numbers counting up to a new value. */
  count: 700,
  /** Lines and rings drawing themselves in. */
  draw: 1200,
  /** Ambient loops are slow and never flash. */
  ambientMs: 45_000,
  /** One full twinkle cycle for the whole sky; each star twinkles a few times in it. */
  twinkleMs: 60_000,
} as const;
