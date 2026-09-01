'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/api';
import type { Event, EventStatus } from '@/lib/eventTypes';

type EventRow = Event & { registration_count: number };

const STATUS_META: Record<EventStatus, { label: string; cls: string }> = {
  active: { label: 'ACTIVE', cls: 'bg-green-100 text-green-700' },
  draft: { label: 'DRAFT', cls: 'bg-gray-100 text-gray-600' },
  closed: { label: 'CLOSED', cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'CANCELLED', cls: 'bg-red-100 text-red-700' },
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch('/api/events');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json() as { events: EventRow[] };
      setEvents(d.events || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const setStatus = useCallback(async (code: string, status: EventStatus) => {
    setBusy(code + status);
    try {
      const r = await adminFetch(`/api/events/${encodeURIComponent(code)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const d = await r.json() as { event?: Event };
      if (d.event) {
        setEvents(prev => prev.map(e => e.code === code ? { ...e, ...d.event! } as EventRow : e));
      } else {
        alert('Could not update event status.');
      }
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setBusy(null);
    }
  }, []);

  async function removeEvent(code: string, name: string, count: number) {
    if (count > 0) {
      alert('Cannot delete an event that has registrations. Close or cancel it instead.');
      return;
    }
    if (!confirm(`Delete draft event "${name}"? This cannot be undone.`)) return;
    try {
      const r = await adminFetch(`/api/events/${encodeURIComponent(code)}`, { method: 'DELETE' });
      const d = await r.json() as { deleted?: boolean };
      if (d.deleted) setEvents(prev => prev.filter(e => e.code !== code));
      else alert('Could not delete that event.');
    } catch (e) {
      alert('Error: ' + String(e));
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  const activeCount = events.filter(e => e.status === 'active').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-bark tracking-tight">Events</h1>
          <p className="text-sm text-bark-light mt-0.5">
            {events.length} events · {activeCount} active
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">↻ Refresh</button>
          <Link href="/admin/events/new" className="btn-primary text-sm">＋ New Event</Link>
        </div>
      </div>

      {activeCount > 1 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ More than one event is marked active. Only one event shows on the public site — consider keeping only one active.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream/80 text-bark-light text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                <th className="text-left px-5 py-3 font-semibold">Event</th>
                <th className="text-left px-5 py-3 font-semibold">Date</th>
                <th className="text-left px-5 py-3 font-semibold">Venue</th>
                <th className="text-left px-5 py-3 font-semibold">Bookings</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Actions</th>
                <th className="text-right px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => {
                const meta = STATUS_META[e.status] || STATUS_META.draft;
                return (
                  <tr key={e.code} className={`border-b border-black/[0.04] hover:bg-cream/60 transition-colors ${i % 2 === 1 ? 'bg-cream/30' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="font-bold text-bark">{e.name}</div>
                      <div className="text-xs text-bark-light font-mono">/{e.code}</div>
                      {activeCount === 0 && e.status === 'active' && (
                        <div className="text-[11px] text-amber-600 mt-0.5">No other active event</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-bark-light whitespace-nowrap">{e.dates.display || '—'}</td>
                    <td className="px-5 py-4 text-bark-light">{e.venue || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-bark">{e.registration_count}</span>
                      <span className="text-bark-light text-xs"> booked</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`pill ${meta.cls}`}>{meta.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {e.status !== 'active' && (
                          <button
                            onClick={() => setStatus(e.code, 'active')}
                            disabled={busy !== null}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 transition-colors"
                            title="Show on public site"
                          >
                            Show
                          </button>
                        )}
                        {e.status === 'active' && (
                          <button
                            onClick={() => setStatus(e.code, 'closed')}
                            disabled={busy !== null}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 transition-colors"
                            title="Hide from public site"
                          >
                            Hide
                          </button>
                        )}
                        {e.status !== 'cancelled' && (
                          <button
                            onClick={() => setStatus(e.code, 'cancelled')}
                            disabled={busy !== null}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        {e.registration_count === 0 && (
                          <button
                            onClick={() => removeEvent(e.code, e.name, e.registration_count)}
                            disabled={busy !== null}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                            title="Delete draft event"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link href={`/admin/events/${e.code}`} className="text-sm font-medium text-gold-dark hover:underline">
                        Edit →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-bark-light">
                    No events yet.{" "}
                    <Link href="/admin/events/new" className="text-gold-dark font-medium hover:underline">Create your first event</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-bark-light text-sm">Loading events…</p>
      </div>
    </div>
  );
}

function ErrorBox({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-2">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={onRetry} className="btn-ghost text-sm">Retry</button>
      </div>
    </div>
  );
}
