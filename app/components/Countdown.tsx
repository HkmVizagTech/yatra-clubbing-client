'use client';

import { useEffect, useState } from 'react';

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function remaining(target: number): Parts | null {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Counts down to the event start when the admin has ticked "show countdown".
 *
 * Nothing renders on the server or on the first client paint: the value depends
 * on the current clock, so server HTML and client HTML would disagree and React
 * would report a hydration mismatch. Mounting first, then ticking, keeps the
 * markup identical on both sides. It also means the countdown simply doesn't
 * appear once the date has passed, instead of showing zeros forever.
 */
export default function Countdown({ to, label }: { to: string; label?: string }) {
  const target = Date.parse(to);
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    setParts(remaining(target));
    const id = setInterval(() => setParts(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!Number.isFinite(target) || !parts) return null;

  const cells: [string, string][] = [
    [String(parts.days), parts.days === 1 ? 'day' : 'days'],
    [pad(parts.hours), 'hrs'],
    [pad(parts.minutes), 'min'],
    [pad(parts.seconds), 'sec'],
  ];

  return (
    <div className="bc-countdown" role="timer" aria-live="off">
      {label && <div className="bc-countdown-label">{label}</div>}
      <div className="bc-countdown-cells">
        {cells.map(([value, unit]) => (
          <div className="bc-cd-cell" key={unit}>
            <span className="n">{value}</span>
            <span className="u">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
