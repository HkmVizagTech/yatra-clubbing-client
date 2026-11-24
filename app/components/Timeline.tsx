'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bus, Compass, Flower2, Heart, Landmark, Mountain, Music2, Sparkles, Sunrise, Users, Utensils,
} from 'lucide-react';

type Item = { time: string; title: string; description: string };

/** Choose an icon from the words in a stop's title. */
function stopIcon(title: string, i: number) {
  const t = title.toLowerCase();
  if (/(temple|darshan|mandir|shrine|aarti|arati)/.test(t)) return <Landmark />;
  if (/(depart|board|bus|coach|travel|return|reach|arriv)/.test(t)) return <Bus />;
  if (/(trek|hill|climb|walk|mountain)/.test(t)) return <Mountain />;
  if (/(kirtan|bhajan|chant|music|sing|japa)/.test(t)) return <Music2 />;
  if (/(prasad|feast|lunch|food|meal|breakfast)/.test(t)) return <Utensils />;
  if (/(story|stories|pastime|talk|session|class)/.test(t)) return <Flower2 />;
  if (/(friend|meet|group|connect)/.test(t)) return <Users />;
  if (/(seva|service)/.test(t)) return <Heart />;
  if (/(sunrise|morning|welcome|begin)/.test(t)) return <Sunrise />;
  return [<Sparkles key="a" />, <Compass key="b" />][i % 2];
}

/**
 * The day as a winding route: a centre spine that fills with colour as you
 * scroll, with stops alternating left and right (stacked on phones). Each
 * stop has an icon node, a time pill and a card.
 */
export default function Timeline({ items }: { items: Item[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState(0);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const on = () => {
      const r = el.getBoundingClientRect();
      const line = window.innerHeight * 0.62;
      setFill(Math.min(1, Math.max(0, (line - r.top) / r.height)));
      let a = -1;
      el.querySelectorAll<HTMLElement>('[data-step]').forEach((n, i) => {
        if (n.getBoundingClientRect().top < line) a = i;
      });
      setActive(a);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);

  return (
    <div className="yt-route-tl" ref={root}>
      <div className="yt-rt-spine" aria-hidden="true">
        <i style={{ transform: `scaleY(${fill})` }} />
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          data-step
          className={`yt-rt-item ${i % 2 === 0 ? 'is-left' : 'is-right'}${i <= active ? ' is-on' : ''}`}
        >
          <span className="yt-rt-node" aria-hidden="true">{stopIcon(it.title, i)}</span>
          <div className="yt-rt-card">
            <span className="yt-rt-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="yt-rt-time">{it.time}</span>
            <h4>{it.title}</h4>
            {it.description && <p>{it.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
