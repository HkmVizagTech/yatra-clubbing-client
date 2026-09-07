'use client';

import type { EventRow } from './useEvents';
import Select from '../../components/Select';

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
    <Select
      value={value}
      onChange={onChange}
      className="w-auto"
      ariaLabel="Filter by event"
      options={[
        { value: 'all', label: 'All events' },
        ...events.map(e => ({ value: e.code, label: e.name })),
      ]}
    />
  );
}
