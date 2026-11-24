/** Yatra Clubbing mark: a sunrise behind a temple spire, a path winding toward it. */
export function YatraMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Yatra Clubbing" className="yt-logo-mark">
      <defs>
        <linearGradient id="yl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--sky3, #3B4F9C)" />
          <stop offset="1" stopColor="var(--sky1, #0B1636)" />
        </linearGradient>
        <radialGradient id="yl-sun" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="var(--glow1, #FFE3A3)" />
          <stop offset="1" stopColor="var(--glow2, #F59A3C)" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill="url(#yl-bg)" />
      {/* rays */}
      <g stroke="var(--glow1, #FFE3A3)" strokeWidth="1.6" strokeLinecap="round" opacity=".7">
        <path d="M32 8v4M15 15l3 3M49 15l-3 3M8 32h4M52 32h4" />
      </g>
      <circle cx="32" cy="31" r="12.5" fill="url(#yl-sun)" />
      {/* hills */}
      <path d="M0 50c9-9 15-13 21-13s9 3 11 5c3-3 8-7 14-7 6 0 12 4 18 15v14H0z" fill="#fff" opacity=".96" />
      {/* spire */}
      <path d="M32 17l3.6 7h-7.2z" fill="var(--hill1, #2B3C86)" />
      <path d="M29.5 24h5l1 6h-7z" fill="var(--sky3, #3B4F9C)" />
      <path d="M28 30h8v13h-8z" fill="var(--hill1, #2B3C86)" />
      <path d="M30.8 43v-5a1.2 1.2 0 0 1 2.4 0v5z" fill="var(--glow1, #FFE3A3)" />
      {/* path */}
      <path d="M26 64c4-6 3-9 6-12 3 3 2 6 6 12z" fill="var(--yt-gold, #FFC76B)" />
    </svg>
  );
}

export default function YatraLogo({ light = false, org }: { light?: boolean; org?: string }) {
  return (
    <span className={`yt-logo${light ? ' is-light' : ''}`}>
      <YatraMark />
      <span className="yt-logo-text">
        <b>Yatra Clubbing</b>
        <small>{org || 'Hare Krishna Vaikuntham'}</small>
      </span>
    </span>
  );
}
