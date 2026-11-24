/**
 * Each trip gets its own look. A theme is just a set of colours that the page's
 * CSS variables read, so a new trip needs a palette here, not new CSS.
 *
 *   dusk   — midnight purple to maroon, saffron sun (the Ramateertham look)
 *   dawn   — Rama-blue sky, saffron sunrise (hill temples, Ramayana trails)
 *   grove  — deep forest and brass (nature / vana trips)
 *   ember  — maroon dusk and flame orange (evening / aarti / festival trips)
 *
 * Pick a theme per trip by code in TRIP_THEME; any other code is assigned one
 * deterministically so it never looks like a blank default.
 */
export interface TripTheme {
  id: string;
  mode: 'light' | 'dark';          // hero: dark ink on a bright sky, or white text on a dark one
  deep: [string, string];          // dark sections (passes, closing)
  sky: [string, string, string];   // top → bottom of the hero sky
  glow: [string, string];          // sun core / horizon glow
  hills: [string, string, string]; // far → near silhouettes
  accent: string;                  // accent on light sections
  accent2: string;                 // secondary accent (cards, icons)
  gold: string;                    // highlight on dark sections
  ivory: string;
  ivory2: string;
  ink: string;
  muted: string;
  line: string;
  card?: string;                   // card surface (defaults to white)
  solid?: string;                  // opaque card surface (timeline nodes, bars)
}

export const THEMES: Record<string, TripTheme> = {
  dusk: {
    id: 'dusk',
    mode: 'dark',
    deep: ['#140D24', '#3A1730'],
    sky: ['#140D24', '#2B1236', '#6A2A22'],
    glow: ['#FFE3A3', '#F2A03C'],
    hills: ['#5B2A66', '#35163F', '#1A0D26'],
    accent: '#D9700A',
    accent2: '#5A2A6B',
    gold: '#F2B544',
    ivory: '#F5EAD8',
    ivory2: '#EDDFC7',
    ink: '#2A1A10',
    muted: '#6F5E4E',
    line: '#E2D1B0',
    card: '#FBF4E6',
    solid: '#FBF4E6',
  },
  dawn: {
    id: 'dawn',
    mode: 'light',
    deep: ['#12264F', '#1F4283'],
    sky: ['#8FC6EA', '#FFE3BC', '#FFC187'],
    glow: ['#FFF7DC', '#FF9F43'],
    hills: ['#A6C6E6', '#6D9BCB', '#35639B'],
    accent: '#E0720F',
    accent2: '#1E3A6E',
    gold: '#FFB84D',
    ivory: '#FFFBF3',
    ivory2: '#FFF1DC',
    ink: '#14264A',
    muted: '#5B6A86',
    line: '#F0E3CC',
  },
  // Settled mid-tones: muted indigo sky melting into warm peach, soft sand surfaces,
  // a terracotta-saffron accent. Nothing is near-black and nothing is stark white.
  twilight: {
    id: 'twilight',
    mode: 'dark',
    deep: ['#3B3860', '#2F2C4D'],
    sky: ['#3C3A68', '#7C5F86', '#E9A976'],
    glow: ['#FFEBC4', '#F2A65E'],
    hills: ['#7A6A96', '#5A4E7C', '#403A62'],
    accent: '#C96B2B',
    accent2: '#4A4678',
    gold: '#F3C06E',
    ivory: '#F7F0E5',
    ivory2: '#EEE3D1',
    ink: '#2B2438',
    muted: '#6A6172',
    line: '#E1D4BF',
    card: '#FBF7EE',
    solid: '#FBF7EE',
  },
  grove: {
    id: 'grove',
    mode: 'dark',
    deep: ['#071510', '#12362A'],
    sky: ['#071510', '#0F2A20', '#1F5A3D'],
    glow: ['#F7E8BD', '#D6BB78'],
    hills: ['#1B4A34', '#10281D', '#0A1511'],
    accent: '#1F5A3D',
    accent2: '#B4893A',
    gold: '#D6BB78',
    ivory: '#FAF8F3',
    ivory2: '#F1EEE4',
    ink: '#14281F',
    muted: '#5E6B63',
    line: '#E3E0D2',
  },
  ember: {
    id: 'ember',
    mode: 'dark',
    deep: ['#1E0B14', '#5A1F26'],
    sky: ['#1E0B14', '#4A1722', '#9A3A22'],
    glow: ['#FFE0A0', '#FF8A3D'],
    hills: ['#6A2420', '#3A1318', '#1E0B14'],
    accent: '#B8431C',
    accent2: '#7A1F2B',
    gold: '#FFB868',
    ivory: '#FFF8F0',
    ivory2: '#F9EBDB',
    ink: '#2E1510',
    muted: '#7A5A50',
    line: '#EEDCCB',
  },
};

const TRIP_THEME: Record<string, string> = {
  RT26: 'dusk',
};

export function themeFor(code: string): TripTheme {
  const mapped = TRIP_THEME[code.toUpperCase()];
  if (mapped && THEMES[mapped]) return THEMES[mapped];
  const keys = Object.keys(THEMES);
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return THEMES[keys[h % keys.length]];
}

export function themeVars(t: TripTheme): Record<string, string> {
  return {
    '--sky1': t.sky[0], '--sky2': t.sky[1], '--sky3': t.sky[2],
    '--deep1': t.deep[0], '--deep2': t.deep[1],
    '--glow1': t.glow[0], '--glow2': t.glow[1],
    '--hill1': t.hills[0], '--hill2': t.hills[1], '--hill3': t.hills[2],
    '--yt-accent': t.accent, '--yt-accent2': t.accent2, '--yt-gold': t.gold,
    '--yt-ivory': t.ivory, '--yt-ivory-2': t.ivory2,
    '--yt-card': t.card || '#fff', '--yt-solid': t.solid || '#fff',
    '--yt-ink': t.ink, '--yt-muted': t.muted, '--yt-line': t.line,
  };
}
