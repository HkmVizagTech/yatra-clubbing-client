import type { CSSProperties } from 'react';

/**
 * Hand-drawn doodle icons (stroke only, rounded, a little wobbly on purpose).
 * Decorative: always aria-hidden, never intercept pointer events. Colour comes
 * from the surrounding section via `currentColor`.
 */
const D: Record<string, { vb: string; paths: string[]; dots?: [number, number, number][] }> = {
  sun: {
    vb: '0 0 64 64',
    paths: [
      'M32 21c6.5 0 11 4.6 11 11s-4.5 11-11 11-11.4-4.6-11-11 4.8-11 11-11z',
      'M32 6v7M32 51v7M6 32h7M51 32h7M13.5 13.5l5 5M45.5 45.5l5 5M50.5 13.5l-5 5M18.5 45.5l-5 5',
    ],
  },
  star: {
    vb: '0 0 64 64',
    paths: ['M32 7c2.4 13 6.5 17.4 20 21-13.5 3.6-17.6 8-20 21-2.4-13-6.5-17.4-20-21 13.5-3.6 17.6-8 20-21z'],
  },
  squiggle: {
    vb: '0 0 120 24',
    paths: ['M4 14c9-13 17 12 27 0s18 12 28 0 17 12 27 0 18 12 28 0'],
  },
  flag: {
    vb: '0 0 64 64',
    paths: ['M18 58V8', 'M18 11c11-5 17 5 29 0v19c-12 5-18-5-29 0'],
  },
  temple: {
    vb: '0 0 64 64',
    paths: [
      'M8 57h48',
      'M15 57V41h34v16',
      'M22 41V31h20v10',
      'M28 31V23h8v8',
      'M32 23V9',
      'M32 9l9 3.5-9 3.5',
      'M28 57v-8a4 4 0 018 0v8',
    ],
  },
  lotus: {
    vb: '0 0 64 64',
    paths: [
      'M32 50c-10-1-18-9-20-19 8 0 15 5 20 19z',
      'M32 50c10-1 18-9 20-19-8 0-15 5-20 19z',
      'M32 50c-9-9-9-24 0-36 9 12 9 27 0 36z',
      'M10 55c9 3 35 3 44 0',
    ],
  },
  feet: {
    vb: '0 0 64 64',
    paths: [
      'M19 24c-4.4 0-6 6.2-5 12s4 8.4 7 6.4 3-8 2-13-1.2-5.4-4-5.4z',
      'M22.5 48.5c-1 0-2 1-2 2s1 2 2 2 2-1 2-2-1-2-2-2z',
      'M43 10c-4.4 0-6 6.2-5 12s4 8.4 7 6.4 3-8 2-13-1.2-5.4-4-5.4z',
      'M46.5 34.5c-1 0-2 1-2 2s1 2 2 2 2-1 2-2-1-2-2-2z',
    ],
  },
  mountain: {
    vb: '0 0 64 64',
    paths: ['M5 52 25 17l11 17 6-8 17 26z', 'M19 30l5 7 4-5 4 6'],
  },
  arrow: {
    vb: '0 0 64 64',
    paths: ['M7 46c9-26 31-32 47-19', 'M43 19l11 8-12 6'],
  },
  heart: {
    vb: '0 0 64 64',
    paths: ['M32 53C13 39 11 26 18 19.5c6-5.5 12-2 14 4.5 2-6.500 8.500-10 14-4.500C53 26 51 39 32 53z'],
  },
  cloud: {
    vb: '0 0 64 64',
    paths: ['M17 46c-9 0-11-13-2-15 1-11 15-15 22-7 9-4 17 5 12 13 6.500 0 6 9 0 9z'],
  },
  bus: {
    vb: '0 0 64 64',
    paths: ['M8 17h42a6 6 0 016 6v21H8z', 'M8 31h48', 'M23 17v14M38 17v14', 'M21 44a5 5 0 100 .1', 'M43 44a5 5 0 100 .1', 'M8 44h8M26 44h12M48 44h8'],
  },
  sparks: {
    vb: '0 0 64 64',
    paths: ['M12 14l3 3M52 10l1 5M32 54l-1-5M8 40l5-1M54 38l5 2M30 12l2 4'],
    dots: [[44, 28, 1.8], [20, 30, 1.6], [34, 40, 1.4]],
  },
};

export type DoodleName = keyof typeof D;

export default function Doodle({
  name,
  className = '',
  style,
}: {
  name: DoodleName;
  className?: string;
  style?: CSSProperties;
}) {
  const d = D[name];
  return (
    <svg
      className={`yt-doodle${className ? ` ${className}` : ''}`}
      style={style}
      viewBox={d.vb}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d.paths.map((p, i) => <path key={i} d={p} />)}
      {d.dots?.map(([cx, cy, r], i) => <circle key={`c${i}`} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />)}
    </svg>
  );
}
