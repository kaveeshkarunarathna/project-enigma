/**
 * Night Atlas design tokens.
 *
 * Minimal look by default: a flat night, sparse faint stars, content
 * separated by hairlines and space. One glowing hero and one starlight
 * button per screen. No gold anywhere: candlelight is only ever a glow.
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
};

export const night: Palette = {
  night: '#0C1322',
  raised: '#131D31',
  hairline: 'rgba(243, 235, 216, 0.10)',
  starlight: '#F3EBD8',
  onStarlight: '#0C1322',
  mist: '#93A1BB',
  aurora: '#86CDBE',
  candlelight: '#E9D2AE',
  faintStar: 'rgba(243, 235, 216, 0.55)',
};

/** Light "dawn" mode. Same roles, morning sky. */
export const dawn: Palette = {
  night: '#E9EEF4',
  raised: '#F4F6F9',
  hairline: 'rgba(20, 32, 58, 0.12)',
  starlight: '#14203A',
  onStarlight: '#F3EBD8',
  mist: '#5B6A85',
  aurora: '#2F7F70',
  candlelight: '#C9A774',
  faintStar: 'rgba(20, 32, 58, 0.25)',
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
  display: 'Gloock_400Regular',
  body: 'Literata_400Regular',
  bodyItalic: 'Literata_400Regular_Italic',
  medium: 'Literata_500Medium',
  semibold: 'Literata_600SemiBold',
} as const;

/**
 * Type scale. Rule: at most three of these sizes on one screen.
 * Captions are Literata italic in sentence case, never all-caps labels.
 */
export const type = {
  hero: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 46 },
  title: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.bodyItalic, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 20 },
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
