'use client';

import { useEffect, useState } from 'react';

function parts(to: number) {
  const s = Math.max(0, Math.floor((to - Date.now()) / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: s === 0,
  };
}

export default function YtCountdown({ to }: { to: string }) {
  const target = Date.parse(to);
  const [t, setT] = useState<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    setT(parts(target));
    const id = setInterval(() => setT(parts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!Number.isFinite(target) || (t && t.done)) return null;

  const cells: [string, number | undefined][] = [['Days', t?.d], ['Hours', t?.h], ['Mins', t?.m], ['Secs', t?.s]];
  return (
    <div className="yt-count" aria-label="Time until the yatra begins">
      {cells.map(([k, v]) => (
        <div key={k} className="yt-count-cell">
          <b>{v == null ? '--' : String(v).padStart(2, '0')}</b>
          <span>{k}</span>
        </div>
      ))}
    </div>
  );
}
