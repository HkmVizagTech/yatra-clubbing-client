'use client';

import type { EventRow } from './useEvents';

/**
 * The trip an admin most likely wants first: the most recently created trip that
 * hasn't ended; if every trip has ended, the one that ran most recently.
 */
export function latestTripCode(events: EventRow[]): string | null {
  const created = (e: EventRow) => Date.parse(e.createdAt || '') || 0;
  const started = (e: EventRow) => Date.parse(e.dates?.start || '') || 0;
  const current = events.filter(e => !e.ended).sort((a, b) => created(b) - created(a));
  if (current.length) return current[0].code;
  const past = [...events].sort((a, b) => started(b) - started(a) || created(b) - created(a));
  return past[0]?.code ?? null;
}

/**
 * Trip switcher for the admin pages.
 *   • "All trips" and every trip that has NOT ended are buttons.
 *   • Trips whose date has passed are tucked into a "Past trips" dropdown, so
 *     old events don't crowd the row.
 * `counts` maps a trip code (and "all") to the number shown on its button.
 */
export default function TripTabs({
  events,
  value,
  onChange,
  counts,
}: {
  events: EventRow[];
  value: string;
  onChange: (code: string) => void;
  counts?: Record<string, number>;
}) {
  const current = events.filter(e => !e.ended);
  const past = events.filter(e => e.ended);
  const pastSelected = past.some(e => e.code === value);

  const dot = (status: string) =>
    status === 'active' ? 'bg-emerald-500' : status === 'cancelled' ? 'bg-red-400' : status === 'closed' ? 'bg-amber-400' : 'bg-stone-300';

  const chip = (active: boolean) =>
    `shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
      active ? 'bg-stone-900 text-white border-stone-900 shadow-sm' : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300'
    }`;
  const badge = (active: boolean) => `text-xs rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20' : 'bg-stone-100 text-stone-500'}`;

  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 w-max sm:w-auto sm:flex-wrap pb-1" role="tablist" aria-label="Choose a trip">
        <button role="tab" aria-selected={value === 'all'} onClick={() => onChange('all')} className={chip(value === 'all')}>
          All trips
          {counts && counts.all !== undefined && <span className={badge(value === 'all')}>{counts.all}</span>}
        </button>

        {current.map(e => {
          const active = value === e.code;
          return (
            <button key={e.code} role="tab" aria-selected={active} onClick={() => onChange(e.code)} className={chip(active)}>
              <span className={`w-2 h-2 rounded-full ${dot(e.status)}`} aria-hidden="true" />
              <span className="max-w-[12rem] truncate">{e.name}</span>
              {counts && counts[e.code] !== undefined && <span className={badge(active)}>{counts[e.code]}</span>}
            </button>
          );
        })}

        {past.length > 0 && (
          <label className={`relative ${chip(pastSelected)} cursor-pointer pr-9`}>
            <span className="sr-only">Past trips</span>
            <span className="pointer-events-none max-w-[13rem] truncate">
              {pastSelected ? past.find(e => e.code === value)?.name : `Past trips (${past.length})`}
            </span>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] opacity-70" aria-hidden="true">▾</span>
            <select
              aria-label="Past trips"
              value={pastSelected ? value : ''}
              onChange={e => { if (e.target.value) onChange(e.target.value); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="" disabled>Past trips ({past.length})</option>
              {past.map(e => (
                <option key={e.code} value={e.code}>
                  {e.name}{counts && counts[e.code] !== undefined ? ` · ${counts[e.code]} booked` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
