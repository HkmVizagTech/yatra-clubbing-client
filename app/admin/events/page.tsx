'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/api';
import type { Event, EventStatus } from '@/lib/eventTypes';

type EventRow = Event & { registration_count: number };

const STATUS_META: Record<EventStatus, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'pill-green' },
  draft: { label: 'Draft', cls: 'pill-gray' },
  closed: { label: 'Closed', cls: 'pill-amber' },
  cancelled: { label: 'Cancelled', cls: 'pill-red' },
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
    if (!confirm(`Delete event "${name}"? This cannot be undone.`)) return;
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

  if (events.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Events</h1>
            <p className="page-subtitle">No events yet.</p>
          </div>
          <Link href="/admin/events/new" className="btn-primary text-sm">＋ New Event</Link>
        </div>
        <div className="panel py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4 text-2xl">🎪</div>
          <p className="text-stone-500 mb-4">You haven&apos;t created any events yet.</p>
          <Link href="/admin/events/new" className="btn-primary text-sm">Create your first event</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">{events.length} events · {activeCount} active</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">↻ Refresh</button>
          <Link href="/admin/events/new" className="btn-primary text-sm">＋ New Event</Link>
        </div>
      </div>

      {activeCount > 1 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ More than one event is marked active. Only one shows on the public site — keep just one active.
        </div>
      )}

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Event</th>
                <th className="th">Date</th>
                <th className="th">Venue</th>
                <th className="th">Bookings</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
                <th className="th text-right"></th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => {
                const meta = STATUS_META[e.status] || STATUS_META.draft;
                const active = e.status === 'active';
                return (
                  <tr key={e.code} className="hover:bg-stone-50/70 transition-colors">
                    <td className="td">
                      <div className="font-semibold text-stone-900">{e.name}</div>
                      <div className="text-xs text-stone-400 font-mono">/{e.code}</div>
                    </td>
                    <td className="td text-stone-600 whitespace-nowrap">{e.dates?.display || '—'}</td>
                    <td className="td text-stone-600">{e.venue || '—'}</td>
                    <td className="td">
                      <span className="font-bold text-stone-900">{e.registration_count}</span>
                      <span className="text-stone-400 text-xs"> booked</span>
                    </td>
                    <td className="td">
                      <span className={meta.cls}>{meta.label}</span>
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1.5">
                        {!active && (
                          <button
                            onClick={() => setStatus(e.code, 'active')}
                            disabled={busy !== null}
                            className="btn-ghost btn-sm text-emerald-700 hover:bg-emerald-50"
                            title="Show on public site"
                          >
                            Publish
                          </button>
                        )}
                        {active && (
                          <button
                            onClick={() => setStatus(e.code, 'closed')}
                            disabled={busy !== null}
                            className="btn-ghost btn-sm text-amber-700 hover:bg-amber-50"
                            title="Hide from public site"
                          >
                            Unpublish
                          </button>
                        )}
                        {e.status !== 'cancelled' && (
                          <button
                            onClick={() => setStatus(e.code, 'cancelled')}
                            disabled={busy !== null}
                            className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        )}
                        {e.registration_count === 0 && (
                          <button
                            onClick={() => removeEvent(e.code, e.name, e.registration_count)}
                            disabled={busy !== null}
                            className="btn-ghost btn-sm text-red-500 hover:bg-red-50"
                            title="Delete event"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="td text-right whitespace-nowrap">
                      <Link href={`/admin/events/${e.code}`} className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-stone-500 text-sm">Loading events…</p>
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