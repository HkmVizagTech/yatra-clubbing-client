/* ============================================================================
   JourneyScene â€” animated "the yatra journey" scenic illustration.
   ----------------------------------------------------------------------------
   Pure inline SVG (no requests, no dependencies, no hooks). A tour bus drives
   along a winding mountain road (SMIL <animateMotion> follows the real road
   path), wheels spin and the body bobs (CSS), pilgrims trek up a hill with a
   fluttering saffron flag, clouds drift and birds glide across a painted
   morning ridge layered with a temple gopuram on the far hilltop.

   Ornament layers are aria-hidden and pointer-events-free. The svg uses
   preserveAspectRatio slice so a single viewBox fills whatever frame the page
   gives it without distortion.

   This is a plain component (no hooks) â€” safe to render from server pages
   (home hero, success) or from the client booking sheet.

   Animation CSS live in app/journey.css (.yc-wheel, .yc-bob, .yc-cloud,
   .yc-bird, .yc-trek, .yc-flag, .yc-kalasha + prefers-reduced-motion).
   ========================================================================== */

interface JourneySceneProps {
  variant?: 'wide' | 'compact';
  className?: string;
}

const WIDE_ROAD =
  'M-60 308 C60 302 130 296 240 289 C360 281 400 278 500 272 C610 265 660 262 760 256 C880 248 980 236 1100 224 C1160 218 1215 212 1260 206';

const COMPACT_ROAD = 'M-30 72 C60 70 130 66 240 62 C340 58 430 52 560 48';

/* Pilgrim with walking stick; `robe` is the cloth colour, `delay` staggers the bob. */
function Trekker({ x, y, robe, delay, flag }: { x: number; y: number; robe: string; delay: string; flag?: boolean }) {
  return (
    <g className="yc-trek" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: delay }}>
      {flag ? (
        <>
          <circle cx={x} cy={y - 13} r="3.1" fill="#E0A96F" />
          <path d={`M${x - 4} ${y - 9} Q${x} ${y - 12.5} ${x + 4} ${y - 9} L${x + 2} ${y - 2.5} L${x - 2} ${y - 2.5} Z`} fill={robe} />
          <line x1={x - 12} y1={y - 1.5} x2={x - 8} y2={y - 4} stroke="#0D1B38" strokeWidth="1.4" strokeLinecap="round" />
          <line x1={x - 1} y1={y - 20} x2={x - 1} y2={y - 3} stroke="#3D2A12" strokeWidth="1.4" strokeLinecap="round" />
          <path className="yc-flag" style={{ transformOrigin: `${x - 1}px ${y - 20}px` }} d={`M${x - 1} ${y - 20} L${x + 12} ${y - 17} L${x - 1} ${y - 14} Z`} fill="#FF6610" />
        </>
      ) : (
        <>
          <circle cx={x} cy={y - 13} r="3.1" fill="#E0A96F" />
          <path d={`M${x - 4} ${y - 9} Q${x} ${y - 12.5} ${x + 4} ${y - 9} L${x + 2} ${y - 2.5} L${x - 2} ${y - 2.5} Z`} fill={robe} />
          <line x1={x - 2.5} y1={y - 1} x2={x + 2.5} y2={y - 1} stroke="#0D1B38" strokeWidth="1.4" strokeLinecap="round" />
          <line x1={x + 3} y1={y - 5} x2={x + 7.5} y2={y - 1} stroke="#4A2E10" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

/* Small dark pine tree silhouette sized by `s`. */
function Pine({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <g>
      <rect x={x - 1.4} y={y - 7} width="2.8" height="8" fill="#0E2149" />
      <path d={`M${x - 9 * s} ${y - 1} L${x} ${y - 13 * s} L${x + 9 * s} ${y - 1} Z`} fill={fill} />
      <path d={`M${x - 6.6 * s} ${y - 5} L${x} ${y - 17 * s} L${x + 6.6 * s} ${y - 5} Z`} fill={fill} />
    </g>
  );
}

export default function JourneyScene({ variant = 'wide', className = '' }: JourneySceneProps) {
  const wide = variant === 'wide';
  const u = wide ? 'ycw' : 'ycc';

  const svgClass = ['yc-scene', className].filter(Boolean).join(' ');
  if (!wide) {
    return (
      <svg
        className={['bc-mstrip', className].filter(Boolean).join(' ')}
        viewBox="0 0 520 88"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${u}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFDF6" />
            <stop offset="100%" stopColor="#FFE3A4" />
          </linearGradient>
          <radialGradient id={`${u}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,224,148,0.92)" />
            <stop offset="55%" stopColor="rgba(255,224,148,0.45)" />
            <stop offset="100%" stopColor="rgba(255,224,148,0)" />
          </radialGradient>
          <linearGradient id={`${u}-road`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D8C9A2" />
            <stop offset="100%" stopColor="#C3AF80" />
          </linearGradient>
          <linearGradient id={`${u}-hill1`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8FA1CE" />
            <stop offset="100%" stopColor="#6A7FB6" />
          </linearGradient>
          <linearGradient id={`${u}-hill2`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#46649F" />
            <stop offset="100%" stopColor="#324F8B" />
          </linearGradient>
          <linearGradient id={`${u}-bus`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2B52D" />
            <stop offset="100%" stopColor="#DE8F0F" />
          </linearGradient>
          <filter id={`${u}-soft`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <rect width="520" height="88" fill={`url(#${u}-sky)`} />

        <circle cx="452" cy="24" r="66" fill={`url(#${u}-glow)`} />
        <circle cx="452" cy="24" r="12" fill="#FFD75E" />
        <circle cx="452" cy="24" r="8" fill="#FFE9A8" />

        <g className="yc-cloud" style={{ animationDuration: '46s' }} opacity="0.85" filter={`url(#${u}-soft)`}>
          <ellipse cx="120" cy="20" rx="42" ry="11" fill="#FFFDF3" />
          <ellipse cx="92" cy="15" rx="26" ry="9" fill="#FFFDF3" />
          <ellipse cx="154" cy="16" rx="28" ry="10" fill="#FFFDF3" />
        </g>

        <path d="M0 70 L0 62 C80 44 150 54 230 40 C310 28 380 44 460 34 L520 30 L520 70 Z" fill={`url(#${u}-hill1)`} />
        <path d="M0 88 L0 66 C70 66 130 70 220 58 C300 46 380 60 470 50 C500 47 516 50 520 50 L520 88 Z" fill={`url(#${u}-hill2)`} />

        <g opacity="0.9">
          <Pine x={212} y={56} s={0.9} fill="#1B3060" />
          <Pine x={362} y={50} s={0.7} fill="#1B3060" />
          <Pine x={432} y={46} s={1} fill="#12295C" />
        </g>

        <path d="M-30 73 C60 71 130 67 240 63 C340 59 430 53 560 49" stroke="#8A6B41" strokeWidth="10" strokeLinecap="round" opacity="0.28" transform="translate(0 1.5)" fill="none" />
        <path d="M-30 72 C60 70 130 66 240 62 C340 58 430 52 560 48" stroke={`url(#${u}-road)`} strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M-30 72 C60 70 130 66 240 62 C340 58 430 52 560 48" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="8 7" fill="none" opacity="0.75" />

        <g>
          <animateMotion dur="8s" repeatCount="indefinite" rotate="auto" path={COMPACT_ROAD} />
          <g className="yc-bob">
            <rect x="-24" y="-8" width="4" height="6" rx="1" fill="#FF6B4A" opacity="0.85" />
            <rect x="20" y="-8" width="4" height="6" rx="1" fill="#FFF3B8" />
            <rect x="-23" y="-6" width="46" height="12" rx="2.5" fill={`url(#${u}-bus)`} stroke="#C47A08" strokeWidth="0.8" />
            <rect x="-21" y="-7" width="42" height="7" rx="1" fill="#EAF6FF" stroke="#12295C" strokeWidth="0.5" opacity="0.9" />
            <rect x="-21" y="-5.4" width="42" height="1.6" fill="#12295C" opacity="0.25" />
            <rect x="-23" y="2" width="46" height="4" rx="1.5" fill="#12295C" />
            <g className="yc-wheel">
              <circle cx="-15" cy="6" r="4.2" fill="#12295C" />
              <circle cx="-15" cy="6" r="2.1" fill="#E8C15E" />
              <circle cx="-15" cy="6" r="0.9" fill="#12295C" />
            </g>
            <g className="yc-wheel">
              <circle cx="15" cy="6" r="4.2" fill="#12295C" />
              <circle cx="15" cy="6" r="2.1" fill="#E8C15E" />
              <circle cx="15" cy="6" r="0.9" fill="#12295C" />
            </g>
            <circle cx="-42" cy="9" r="2" fill="#C8B184" opacity="0.5" />
            <circle cx="-38" cy="12" r="1.6" fill="#C8B184" opacity="0.4" />
          </g>
        </g>

        <g>
          <Trekker x={322} y={72} robe="#E8912B" delay="0s" flag />
          <Trekker x={368} y={64} robe="#F4E3BE" delay="0.5s" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      className={svgClass}
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${u}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF6" />
          <stop offset="52%" stopColor="#FFEFC9" />
          <stop offset="100%" stopColor="#FFE1A0" />
        </linearGradient>
        <radialGradient id={`${u}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,224,148,0.95)" />
          <stop offset="55%" stopColor="rgba(255,224,148,0.5)" />
          <stop offset="100%" stopColor="rgba(255,224,148,0)" />
        </radialGradient>
        <linearGradient id={`${u}-far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CBD4EC" />
          <stop offset="100%" stopColor="#B6C2E3" />
        </linearGradient>
        <linearGradient id={`${u}-far2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BDC8E8" />
          <stop offset="100%" stopColor="#A9B6DC" />
        </linearGradient>
        <linearGradient id={`${u}-mid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#91A3D0" />
          <stop offset="100%" stopColor="#7488BE" />
        </linearGradient>
        <linearGradient id={`${u}-near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#526FAE" />
          <stop offset="100%" stopColor="#3B5A9B" />
        </linearGradient>
        <linearGradient id={`${u}-fore`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E4C87" />
          <stop offset="100%" stopColor="#1D3566" />
        </linearGradient>
        <linearGradient id={`${u}-road`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#DECFA6" />
          <stop offset="100%" stopColor="#C7B487" />
        </linearGradient>
        <linearGradient id={`${u}-bus`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2B52D" />
          <stop offset="100%" stopColor="#DE8F0F" />
        </linearGradient>
        <filter id={`${u}-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="1200" height="320" fill={`url(#${u}-sky)`} />

      <circle cx="1010" cy="92" r="150" fill={`url(#${u}-glow)`} />
      <circle cx="1010" cy="92" r="24" fill="#FFD75E" />
      <circle cx="1010" cy="92" r="17" fill="#FFE9A8" />

      <g className="yc-cloud" style={{ animationDuration: '52s' }} opacity="0.95" filter={`url(#${u}-soft)`}>
        <ellipse cx="150" cy="58" rx="52" ry="15" fill="#FFFDF3" />
        <ellipse cx="118" cy="50" rx="32" ry="12" fill="#FFFDF3" />
        <ellipse cx="188" cy="52" rx="34" ry="13" fill="#FFFDF3" />
      </g>
      <g className="yc-cloud" style={{ animationDuration: '68s', animationDelay: '14s' }} opacity="0.8" filter={`url(#${u}-soft)`}>
        <ellipse cx="790" cy="40" rx="44" ry="12" fill="#FFF6DE" />
        <ellipse cx="758" cy="34" rx="28" ry="10" fill="#FFF6DE" />
      </g>

      <g transform="translate(210 96) scale(0.9)">
        <g className="yc-bird" style={{ animationDuration: '36s' }}>
          <path d="M1 8 Q8 1 15 7 Q22 1 29 8" fill="none" stroke="#31446F" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>
      <g transform="translate(330 84) scale(0.7)">
        <g className="yc-bird" style={{ animationDuration: '48s', animationDelay: '10s' }}>
          <path d="M1 8 Q8 1 15 7 Q22 1 29 8" fill="none" stroke="#31446F" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </g>

      <path d="M0 128 C200 110 360 128 520 104 C700 82 900 104 1100 84 C1150 80 1180 86 1200 84 L1200 190 L0 190 Z" fill={`url(#${u}-far2)`} opacity="0.8" />
      <path d="M0 178 C130 140 260 156 400 132 C540 110 700 126 840 100 C960 80 1100 116 1200 96 L1200 200 L0 200 Z" fill={`url(#${u}-far)`} opacity="0.95" />

      <path d="M0 224 C160 188 300 206 460 182 C610 160 760 176 920 152 C1040 136 1140 160 1200 148 L1200 250 L0 250 Z" fill={`url(#${u}-mid)`} />

      <path d="M0 258 C140 232 260 246 420 224 C580 204 740 224 900 204 C1040 186 1130 210 1200 200 L1200 286 L0 286 Z" fill={`url(#${u}-near)`} />

      <g>
        <rect x="982" y="196" width="120" height="10" fill="#142A52" />
        <rect x="987" y="180" width="110" height="16" fill="#101F45" />
        <path d="M994 180 L1090 180 L1082 160 L1002 160 Z" fill="#0E2149" />
        <path d="M1004 160 L1080 160 L1072 140 L1012 140 Z" fill="#0E2149" />
        <path d="M1014 140 L1070 140 L1063 122 L1021 122 Z" fill="#0E2149" />
        <path d="M1023 122 L1061 122 L1056 106 L1028 106 Z" fill="#0E2149" />
        <line x1="1042" y1="106" x2="1042" y2="88" stroke="#D9A125" strokeWidth="2.5" />
        <circle className="yc-kalasha" cx="1042" cy="83" r="4.5" fill="#F0B62E" />
        <rect x="1024" y="196" width="36" height="8" rx="3" fill="#0B1937" />
      </g>

      <path d="M0 320 C150 290 320 300 500 282 C680 266 860 282 1040 264 C1120 256 1170 266 1200 260 L1200 320 Z" fill={`url(#${u}-fore)`} />

      <g fill="#12295C">
        <Pine x={600} y={250} s={1} fill="#12295C" />
        <Pine x={466} y={264} s={0.8} fill="#162B56" />
        <Pine x={762} y={244} s={1.25} fill="#12295C" />
        <Pine x={886} y={226} s={1} fill="#0E2149" />
      </g>
      <ellipse cx="424" cy="260" rx="11" ry="5.5" fill="#162B56" />

      <g>
        <Trekker x={250} y={246} robe="#E8912B" delay="0s" flag />
        <Trekker x={298} y={243} robe="#F4E3BE" delay="0.45s" />
        <Trekker x={346} y={247} robe="#C96A5A" delay="0.9s" />
      </g>

      <path d={WIDE_ROAD} stroke="#8A6B41" strokeWidth="22" strokeLinecap="round" opacity="0.32" transform="translate(0 3.5)" fill="none" />
      <path d={WIDE_ROAD} stroke={`url(#${u}-road)`} strokeWidth="18" strokeLinecap="round" fill="none" />
      <path d={WIDE_ROAD} stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="20 16" fill="none" opacity="0.75" />

      <g>
        <animateMotion dur="15s" repeatCount="indefinite" rotate="auto" path={WIDE_ROAD} />
        <g className="yc-bob">
          <rect x="-45" y="-10" width="6" height="8" rx="1.5" fill="#FF6B4A" opacity="0.85" />
          <rect x="37" y="-10" width="6" height="8" rx="1.5" fill="#FFF3B8" />
          <rect x="-42" y="-13" width="84" height="24" rx="7" fill={`url(#${u}-bus)`} stroke="#C47A08" strokeWidth="1" />
          <rect x="-42" y="-13" width="84" height="5" rx="2.5" fill="#12295C" />
          <rect x="-42" y="-4" width="84" height="9" rx="3" fill="#12295C" />
          {[-36, -21, -6, 9].map((wx) => (
            <rect key={wx} x={wx} y="-9" width="10" height="8" rx="1.5" fill="#EAF6FF" stroke="#12295C" strokeWidth="0.7" />
          ))}
          <g className="yc-wheel">
            <circle cx="-27" cy="11" r="8" fill="#12295C" />
            <circle cx="-27" cy="11" r="4" fill="#E8C15E" />
            <circle cx="-27" cy="11" r="1.6" fill="#12295C" />
          </g>
          <g className="yc-wheel">
            <circle cx="27" cy="11" r="8" fill="#12295C" />
            <circle cx="27" cy="11" r="4" fill="#E8C15E" />
            <circle cx="27" cy="11" r="1.6" fill="#12295C" />
          </g>
          <circle cx="-62" cy="12" r="3.2" fill="#C8B184" opacity="0.5" />
          <circle cx="-55" cy="15" r="2.4" fill="#C8B184" opacity="0.4" />
        </g>
      </g>

      <ellipse cx="610" cy="326" rx="620" ry="60" fill="#FFE9B8" opacity="0.16" />
    </svg>
  );
}
