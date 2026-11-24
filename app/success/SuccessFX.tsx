'use client';

import { useEffect, useState } from 'react';

/** A one-time burst of saffron / gold / rose petals when the page opens. Pure CSS animation, no library. */
export function Confetti() {
  const [bits, setBits] = useState<{ left: number; delay: number; dur: number; size: number; hue: number; rot: number; drift: number }[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setBits(
      Array.from({ length: 46 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 3.2 + Math.random() * 2.6,
        size: 7 + Math.random() * 9,
        hue: Math.floor(Math.random() * 4),
        rot: Math.random() * 360,
        drift: (Math.random() - 0.5) * 160,
      }))
    );
    const t = setTimeout(() => setBits([]), 8000);
    return () => clearTimeout(t);
  }, []);

  if (bits.length === 0) return null;
  return (
    <div className="sx-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          className={`c${b.hue}`}
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size * 1.5,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            transform: `rotate(${b.rot}deg)`,
            ['--drift' as string]: `${b.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export function CopyRef({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="sx-copy"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* clipboard blocked */ }
      }}
    >
      {done ? 'Copied ✓' : 'Copy ID'}
    </button>
  );
}

export function ShareButton({ text, path }: { text: string; path: string }) {
  return (
    <button
      type="button"
      className="sx-btn sx-btn-ghost"
      onClick={() => {
        const url = window.location.origin + path;
        const msg = `${text}\n${url}`;
        if (navigator.share) navigator.share({ text: msg }).catch(() => {});
        else window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      }}
    >
      Invite a friend
    </button>
  );
}
