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
      className="select w-auto font-medium text-stone-700"
    >
      <option value="all">All events</option>
      {events.map(e => (
        <option key={e.code} value={e.code}>{e.name}</option>
      ))}
    </select>
  );
}
