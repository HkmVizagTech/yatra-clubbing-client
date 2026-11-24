'use client';

import { useState } from 'react';
import RamaDepth from './RamaDepth';

// The pictures live in /public/rama (bg, rama, fg). If none are there, the whole section stays hidden.
const LAYERS = [
  { name: 'bg', z: -1.1 },
  { name: 'rama', z: 0, fit: 'contain' as const, scale: 0.9, y: -0.04 },
  { name: 'fg', z: 0.9 },
];

export default function RamaSection({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  const [found, setFound] = useState<boolean | null>(null);
  if (found === false) return null;
  return (
    <section className="yt-sec yt-rama" id="legend" hidden={found !== true}>
      <div className="yt-wrap yt-rama-grid">
        <div className="yt-rama-frame">
          <RamaDepth layers={LAYERS} label={title} onResult={setFound} />
          <span className="yt-rama-hint" aria-hidden="true">Move to look around</span>
        </div>
        <div className="yt-rama-copy">
          <span className="yt-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      </div>
    </section>
  );
}
