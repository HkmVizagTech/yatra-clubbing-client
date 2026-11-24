/**
 * Layered sunrise-over-the-hill scene, drawn in SVG and coloured by the trip
 * theme's CSS variables. Each layer is its own <svg> so GSAP can move them at
 * different speeds. Pure decoration.
 */
const STARS = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * n) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(12.9898) * 3040 - 800, y: r(78.233) * 430, s: 0.8 + r(39.346) * 1.6, d: r(11.135) * 4 };
});

const LAYER = { viewBox: '0 0 1440 800', preserveAspectRatio: 'xMidYMax slice' } as const;

export default function HeroIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`yt-scenery${compact ? ' is-compact' : ''}`} aria-hidden="true">
      {!compact && (
        <svg className="yt-layer yt-layer-sky" {...LAYER}>
          <defs><filter id="ys-blur"><feGaussianBlur stdDeviation="7" /></filter></defs>
          <g filter="url(#ys-blur)">
            <ellipse className="yt-cloud" cx="300" cy="170" rx="170" ry="26" />
            <ellipse className="yt-cloud" cx="430" cy="150" rx="110" ry="22" />
            <ellipse className="yt-cloud c2" cx="1130" cy="250" rx="190" ry="28" />
            <ellipse className="yt-cloud c2" cx="1000" cy="232" rx="110" ry="20" />
            <ellipse className="yt-cloud" cx="760" cy="90" rx="140" ry="20" />
          </g>
          {STARS.map((s, i) => (
            <circle key={i} className="yt-star" cx={s.x} cy={s.y} r={s.s} style={{ animationDelay: `${s.d}s` }} />
          ))}
        </svg>
      )}

      <svg className="yt-layer yt-layer-sun" {...LAYER}>
        <defs>
          <radialGradient id="ys-glow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="var(--glow1)" stopOpacity=".95" />
            <stop offset=".35" stopColor="var(--glow2)" stopOpacity=".55" />
            <stop offset="1" stopColor="var(--glow2)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ys-core" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="var(--glow1)" />
          </radialGradient>
        </defs>
        <g className="yt-sun">
          <circle cx="720" cy="440" r="330" fill="url(#ys-glow)" />
          <circle cx="720" cy="440" r="92" fill="url(#ys-core)" />
        </g>
      </svg>

      <svg className="yt-layer yt-layer-far" {...LAYER}>
        <path
          fill="var(--hill1)"
          d="M-800,560 L0,560 C120,500 220,470 340,500 C460,530 520,440 640,430 C780,420 840,500 980,490 C1120,480 1200,420 1320,450 C1380,465 1420,480 1440,490 L2240,490 L2240,800 L-800,800Z"
        />
      </svg>

      <svg className="yt-layer yt-layer-mid" {...LAYER}>
        <path
          fill="var(--hill2)"
          d="M-800,650 L0,650 C140,620 240,600 360,620 C480,640 560,590 640,540 C680,510 700,462 720,442 C760,418 800,440 840,480 C920,540 1000,590 1100,600 C1240,615 1340,590 1440,600 L2240,600 L2240,800 L-800,800Z"
        />
        {/* the temple on the summit */}
        <g transform="translate(720 442)">
          <path fill="var(--hill2)" d="M-22,0 h44 v-16 h-44z" />
          <path fill="var(--hill2)" d="M-17,-16 h34 l-5,-13 h-24z" />
          <path fill="var(--hill2)" d="M-11,-29 h22 l-4,-12 h-14z" />
          <path fill="var(--hill2)" d="M-5,-41 h10 l-5,-14z" />
          <rect x="-0.8" y="-72" width="1.6" height="18" fill="var(--glow1)" />
          <path className="yt-flag" fill="var(--glow2)" d="M0.8,-72 l24,6.5 -24,6.5z" />
        </g>
      </svg>

      <svg className="yt-layer yt-layer-near" {...LAYER}>
        <path
          fill="var(--hill3)"
          d="M-800,720 L0,720 C200,690 360,740 560,710 C760,680 900,730 1100,705 C1260,685 1360,700 1440,690 L2240,690 L2240,800 L-800,800Z"
        />
      </svg>
    </div>
  );
}
