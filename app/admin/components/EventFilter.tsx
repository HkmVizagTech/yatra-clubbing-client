'use client';

import type { EventRow } from './useEvents';

export default function EventFilter({
  events,
  value,
  onChange,
}: {
  events: EventRow[];
  value: string;
  onChange: (code: string) => void;
}) {
  if (events.length === 0) return null;
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 rounded-xl border border-black/10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/30 font-medium text-bark"
    >
      <option value="all">All events</option>
      {events.map(e => (
        <option key={e.code} value={e.code}>{e.name}</option>
      ))}
    </select>
  );
}
