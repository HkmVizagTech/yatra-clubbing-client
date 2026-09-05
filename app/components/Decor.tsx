import type { SVGProps } from 'react';

/* ============================================================================
   Yatra Clubbing decorative motifs — pure inline SVG, no requests.
   Every ornament is aria-hidden and pointer-events:none so it never shifts
   layout or gets read by screen readers. Colours mix the event accent with
   festive teal/rose so dark pages carry real colour, not just glow.
   ========================================================================== */

type P = SVGProps<SVGSVGElement> & { uid?: string };

/* --- Temple skyline ---------------------------------------------------------
   A row of shikhara temples cut through the page base. Uses evenodd so each
   body's door opens to the page behind. `uid` keeps the gradient ids unique
   when more than one skyline is mounted on a page.                             */
export function TempleSkyline({ children, ...props }: P & { children?: never }) {
  const uid = props.uid || 'sky';
  const temples = [
    { x: 40, w: 120, h: 150 },
    { x: 205, w: 150, h: 190 },
    { x: 400, w: 100, h: 130 },
    { x: 545, w: 170, h: 210 },
    { x: 760, w: 120, h: 160 },
    { x: 925, w: 90, h: 120 },
    { x: 1060, w: 150, h: 180 },
    { x: 1260, w: 140, h: 145 },
  ];
  function templeD(x: number, w: number, h: number) {
    const dx = w * 0.5;
    const yb = h * 0.58;
    const ya = h * 0.2;
    const door = w * 0.22;
    return [
      `M${x} ${yb}V${h}H${x + w}V${yb}`,
      `C${x + dx - w * 0.3} ${yb} ${x + dx - w * 0.18} ${ya} ${x + dx} ${ya}`,
      `C${x + dx + w * 0.18} ${ya} ${x + dx + w * 0.3} ${yb} ${x + w} ${yb}`,
      `M${x + dx - door} ${h}V${h - h * 0.2}q${door} ${h * 0.17} ${door * 2} 0V${h}`,
    ].join(' ');
  }
  return (
    <svg
      viewBox="0 0 1440 220"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <g fill={`url(#${uid}-g)`} fillRule="evenodd">
        {temples.map((t, i) => <path key={i} d={templeD(t.x, t.w, t.h)} />)}
      </g>
    </svg>
  );
}

/* --- Peacock feather fan -----------------------------------------------------
   A fan of quills with gold-ringed eyes — Krishna-culture colour (teal + gold +
   rose) rather than the page accent, so it visibly widens the palette.          */
export function FeatherFan(props: P) {
  const leaves = [-34, -22, -11, 0, 11, 22, 34];
  return (
    <svg viewBox="0 0 260 190" aria-hidden="true" focusable="false" {...props}>
      {leaves.map((a, i) => (
        <g key={i} transform={`rotate(${a} 130 176)`}>
          <path
            d="M130 176C88 138 84 84 130 46C176 84 172 138 130 176Z"
            fill="rgba(45,212,191,.14)"
          />
          <path
            d="M130 156C107 128 104 92 130 68C156 92 153 128 130 156Z"
            fill="rgba(45,212,191,.10)"
          />
          <circle cx="130" cy="92" r="16" fill="rgba(244,114,182,.14)" stroke="rgba(229,161,62,.3)" strokeWidth="2" />
          <circle cx="130" cy="92" r="5" fill="rgba(229,161,62,.32)" />
          <path d="M130 176v-32" stroke="rgba(229,161,62,.22)" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

/* --- Dandiya sticks ------------------------------------------------------------
   A crossed pair of decorated sticks with banded handles and moti tips.          */
export function DandiyaPair(props: P) {
  return (
    <svg viewBox="0 0 120 260" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id="yd-stick1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(229,161,62,.28)" />
          <stop offset="1" stopColor="rgba(245,158,11,.08)" />
        </linearGradient>
        <linearGradient id="yd-stick2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(244,114,182,.2)" />
          <stop offset="1" stopColor="rgba(45,212,191,.12)" />
        </linearGradient>
      </defs>
      <g transform="rotate(-18 60 130)">
        <rect x="53" y="8" width="14" height="212" rx="7" fill="url(#yd-stick1)" />
        <circle cx="60" cy="22" r="12" fill="rgba(229,161,62,.2)" />
        <rect x="53" y="146" width="14" height="26" fill="rgba(45,212,191,.2)" />
        <rect x="53" y="178" width="14" height="26" fill="rgba(244,114,182,.2)" />
      </g>
      <g transform="rotate(18 60 130)">
        <rect x="53" y="8" width="14" height="212" rx="7" fill="url(#yd-stick2)" />
        <circle cx="60" cy="22" r="12" fill="rgba(244,114,182,.16)" />
        <rect x="53" y="146" width="14" height="26" fill="rgba(229,161,62,.2)" />
        <rect x="53" y="178" width="14" height="26" fill="rgba(45,212,191,.2)" />
      </g>
    </svg>
  );
}

/* --- Diya divider ----------------------------------------------------------------
   A horizontal lamp row for section breaks — bowls of flame floating on a line.    */
export function DiyaStrip(props: P) {
  const diyas = [2, 58, 114, 170, 226, 282, 338];
  return (
    <svg viewBox="0 0 384 44" aria-hidden="true" focusable="false" {...props}>
      <line x1="0" y1="34" x2="384" y2="34" stroke="var(--accent)" strokeOpacity="0.18" strokeWidth="1.4" />
      {diyas.map((x, i) => (
        <g key={i}>
          <path d={`M${x} 34a6 6 0 0 0 12 0h-12Z`} fill="var(--accent)" fillOpacity="0.35" />
          <path d={`M${x + 6} 27q-4-7 0-13 4 6 0 13Z`} fill="rgba(255,203,122,.85)" />
        </g>
      ))}
    </svg>
  );
}

/* --- Mango-leaf toran ------------------------------------------------------------
   A full-width garland strip of drooping leaves, for the top edge of a page.        */
export function ToranBorder(props: P) {
  return (
    <svg viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <pattern id="yc-toran" width="30" height="26" patternUnits="userSpaceOnUse">
          <path d="M15 4c5 7 6 15 1 20c-5-5-4-13 1-20Z" fill="var(--accent)" fillOpacity="0.16" />
          <path d="M15 7c4 4 5 12 1 15c-4-3-3-11 1-15Z" fill="var(--accent)" fillOpacity="0.22" />
        </pattern>
      </defs>
      <rect width="120" height="26" fill="url(#yc-toran)" />
    </svg>
  );
}