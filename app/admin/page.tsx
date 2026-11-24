'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Registration } from '@/lib/types';
import { inr, fmtDate, getStudentStatus, buildChartData, genderLabel, isWhatsappConfirmed } from '@/lib/utils';
import { adminFetch } from '@/lib/api';
import { eventPath } from '@/lib/links';
import { useAdmin } from './AdminContext';
import { useEvents, type EventRow } from './components/useEvents';
import TripTabs, { latestTripCode } from './components/TripTabs';

type Scope = 'all' | string;

const STATUS_PILL: Record<string, string> = {
  active: 'pill-green', draft: 'pill-gray', closed: 'pill-amber', cancelled: 'pill-red',
};
const statusLabel = (e: { status: string; ended?: boolean }) =>
  e.status === 'closed' && e.ended ? 'Ended' : (STATUS_LABEL[e.status] || e.status);
const STATUS_LABEL: Record<string, string> = {
  active: 'Live', draft: 'Draft', closed: 'Closed', cancelled: 'Cancelled',
};

/** Aggregate paid bookings. Abandoned pre-saved rows are excluded everywhere. */
function summarise(regs: Registration[]) {
  const paid = regs.filter(r => r.payment_status === 'paid');
  const isG = (r: Registration, g: string) => String(r.gender || '').toLowerCase() === g;
  const students = paid.filter(r => r.qty_student > 0);
  const working = paid.filter(r => r.qty_student <= 0);
  const sum = (rows: Registration[]) => rows.reduce((s, r) => s + (r.total || 0), 0);
  return {
    paid: paid.length,
    revenue: sum(paid),
    students: students.length,
    working: working.length,
    studentRevenue: sum(students),
    workingRevenue: sum(working),
    returning: paid.filter(r => r.returning_attendee).length,
    awaitingPayment: regs.filter(r => r.payment_status === 'pending').length,
    idsToVerify: paid.filter(r => getStudentStatus(r) === 'pending').length,
    male: paid.filter(r => isG(r, 'male')).length,
    female: paid.filter(r => isG(r, 'female')).length,
    whatsapp: paid.filter(isWhatsappConfirmed).length,
  };
}

function audienceOf(e: EventRow): { label: string; icon: string } {
  const stu = (e.tickets || []).some(t => t.requiresStudentId);
  const wrk = (e.tickets || []).some(t => !t.requiresStudentId);
  if (stu && wrk) return { label: 'Students & working professionals', icon: '👥' };
  if (stu) return { label: 'Students only', icon: '🎓' };
  if (wrk) return { label: 'Working professionals', icon: '💼' };
  return { label: 'No passes yet', icon: '🎟️' };
}

export default function DashboardPage() {
  const { can } = useAdmin();
  const canMoney = can('dashboard:revenue');
  const canEditTrips = can('events:write');
  const canSeeTrip = can('events:read');
  const { events, loading: loadingEvents } = useEvents();

  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [scope, setScope] = useState<Scope>('all');
  const [scopeChosen, setScopeChosen] = useState(false);
  const [listCount, setListCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch('/api/registrations');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json() as { registrations: Registration[] };
      setRegs(d.registrations || []);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Open on the latest (or live) trip so the numbers are about the trip in front of you.
  useEffect(() => {
    if (loadingEvents || scopeChosen || events.length === 0) return;
    setScopeChosen(true);
    const c = latestTripCode(events);
    if (c) setScope(c);
  }, [loadingEvents, events, scopeChosen]);

  const trip = useMemo(() => events.find(e => e.code === scope) || null, [events, scope]);
  const scoped = useMemo(() => (scope === 'all' ? regs : regs.filter(r => r.event_code === scope)), [regs, scope]);
  const stats = useMemo(() => summarise(scoped), [scoped]);
  const perTrip = useMemo(() => {
    const m = new Map<string, ReturnType<typeof summarise>>();
    for (const e of events) m.set(e.code, summarise(regs.filter(r => r.event_code === e.code)));
    return m;
  }, [events, regs]);
  const chartData = useMemo(() => buildChartData(scoped), [scoped]);
  const pendingIds = useMemo(
    () => scoped.filter(r => r.payment_status === 'paid' && getStudentStatus(r) === 'pending').slice(0, 5),
    [scoped]
  );
  const recent = useMemo(() => scoped.slice(0, 8), [scoped]);

  // How many numbers are on the selected trip's returning list.
  const hasReturningPrice = !!trip && (trip.tickets || []).some(t => Number(t.returningPrice) > 0);
  useEffect(() => {
    setListCount(null);
    if (!trip || !hasReturningPrice || !canSeeTrip) return;
    let cancelled = false;
    adminFetch(`/api/events/${encodeURIComponent(trip.code)}/attendees`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setListCount(d.count ?? 0); })
      .catch(() => { /* optional detail */ });
    return () => { cancelled = true; };
  }, [trip, hasReturningPrice, canSeeTrip]);

  if (loading && regs.length === 0 && loadingEvents) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  const showReturning = stats.returning > 0 || events.some(e => (scope === 'all' || e.code === scope) && (e.tickets || []).some(t => Number(t.returningPrice) > 0));
  const total = stats.students + stats.working;
  // Only show student / working breakdowns when the trip actually has both kinds of people.
  const scopeTix = trip ? (trip.tickets || []) : events.flatMap(e => e.tickets || []);
  const hasStudents = scopeTix.some(t => t.requiresStudentId) || scoped.some(r => r.qty_student > 0);
  const hasWorking = scopeTix.some(t => !t.requiresStudentId) || scoped.some(r => r.qty_student <= 0);
  const showAudience = hasStudents && hasWorking;
  const showJoin = showAudience || showReturning;
  const studentPct = total ? Math.round((stats.students / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {events.length} {events.length === 1 ? 'trip' : 'trips'}
            {updatedAt && <> · updated {updatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</>}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={load} disabled={loading} className="btn-ghost text-sm">{loading ? 'Refreshing…' : '↻ Refresh'}</button>
          {canEditTrips && <Link href="/admin/events/new" className="btn-primary text-sm">＋ New trip</Link>}
        </div>
      </div>

      {/* Trip switcher: current trips as buttons, ended ones in a dropdown */}
      {events.length > 0 && (
        <TripTabs
          events={events}
          value={scope}
          onChange={c => { setScopeChosen(true); setScope(c); }}
          counts={{ all: regs.filter(r => r.payment_status === 'paid').length, ...Object.fromEntries(events.map(e => [e.code, perTrip.get(e.code)?.paid ?? 0])) }}
        />
      )}

      {/* Overview: every trip at a glance, or the selected trip's header */}
      {scope === 'all' && events.some(e => !e.ended) && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {events.filter(e => !e.ended).map(e => {
            const s = perTrip.get(e.code)!;
            const a = audienceOf(e);
            const sTotal = s.students + s.working;
            const stuT = (e.tickets || []).some(t => t.requiresStudentId);
            const both = stuT && (e.tickets || []).some(t => !t.requiresStudentId);
            return (
              <button key={e.code} onClick={() => setScope(e.code)} className="panel !p-4 sm:!p-5 text-left hover:border-amber-300 hover:shadow-md transition group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-stone-900 truncate group-hover:text-amber-700">{e.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5 truncate">{e.dates?.display || 'Date not set'}</div>
                  </div>
                  <span className={STATUS_PILL[e.status] || 'pill-gray'}>{statusLabel(e)}</span>
                </div>
                <div className="mt-3 text-xs text-stone-500 flex items-center gap-1.5"><span aria-hidden="true">{a.icon}</span>{a.label}</div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini value={s.paid} label="Paid" />
                  {both ? (
                    <>
                      <Mini value={s.students} label="Students" />
                      <Mini value={s.working} label="Working" />
                    </>
                  ) : (
                    <>
                      <Mini value={s.returning} label="Excel list" />
                      {stuT ? <Mini value={s.idsToVerify} label="IDs to check" /> : <Mini value={s.awaitingPayment} label="Unpaid" />}
                    </>
                  )}
                </div>
                {both && sTotal > 0 && (
                  <div className="mt-3 h-1.5 rounded-full bg-stone-100 overflow-hidden flex">
                    <div className="bg-violet-400" style={{ width: `${(s.students / sTotal) * 100}%` }} />
                    <div className="bg-amber-400" style={{ width: `${(s.working / sTotal) * 100}%` }} />
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  {canMoney ? <span className="font-bold text-stone-900">{inr(s.revenue)}</span> : <span className="text-stone-400">{s.paid} booked</span>}
                  {s.idsToVerify > 0 && <span className="pill-amber">⏳ {s.idsToVerify} ID{s.idsToVerify === 1 ? '' : 's'} to verify</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {scope === 'all' && events.length > 0 && events.every(e => e.ended) && (
        <div className="panel text-center py-8">
          <div className="text-2xl mb-1" aria-hidden="true">🗓️</div>
          <p className="font-semibold text-stone-800">No upcoming trips</p>
          <p className="text-sm text-stone-500 mt-1">Past trips are in the “Past trips” dropdown above. Create a new one to see it here.</p>
        </div>
      )}

      {trip && (
        <div className="panel !p-4 sm:!p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">{trip.name}</h2>
                <span className={STATUS_PILL[trip.status] || 'pill-gray'}>{statusLabel(trip)}</span>
              </div>
              <div className="text-sm text-stone-500 mt-1">{trip.dates?.display || 'Date not set'}{trip.venue ? ` · ${trip.venue}` : ''}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="pill-gray">{audienceOf(trip).icon} {audienceOf(trip).label}</span>
                {(trip.tickets || []).map(t => (
                  <span key={t.key} className="pill-gray">
                    {t.requiresStudentId ? 'Student' : 'Working'} {inr(t.price)}
                    {Number(t.returningPrice) > 0 && <span className="text-emerald-700"> · Excel price {inr(t.returningPrice)}</span>}
                  </span>
                ))}
                {hasReturningPrice && listCount !== null && (
                  <span className={listCount > 0 ? 'pill-green' : 'pill-amber'}>
                    {listCount > 0 ? `📋 ${listCount.toLocaleString('en-IN')} on the Excel list` : '📋 No Excel list uploaded yet'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href={eventPath(trip)} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">Open page ↗</a>
              {canSeeTrip && <Link href={`/admin/events/${trip.code}`} className="btn-ghost btn-sm text-amber-700">{canEditTrips ? 'Edit trip' : 'View trip'}</Link>}
              <Link href="/admin/registrations" className="btn-primary btn-sm">Registrations</Link>
            </div>
          </div>
        </div>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard value={stats.paid} label="Paid bookings" icon="🎟️" />
        {canMoney && <StatCard value={inr(stats.revenue)} label="Revenue" icon="💰" />}
        {showAudience && <StatCard value={stats.students} label="Students" icon="🎓" />}
        {showAudience && <StatCard value={stats.working} label="Working professionals" icon="💼" />}
        {showReturning && <StatCard value={stats.returning} label="On the Excel list (special price)" icon="🔁" />}
        {hasStudents && stats.idsToVerify > 0 && <StatCard value={stats.idsToVerify} label="IDs to verify" icon="⚠️" alert />}
        {stats.awaitingPayment > 0 && <StatCard value={stats.awaitingPayment} label="Awaiting payment" icon="⏳" />}
        <StatCard value={`${stats.male} / ${stats.female}`} label="Male / Female" icon="👥" />
        <StatCard value={stats.whatsapp} label={`WhatsApp confirmed of ${stats.paid}`} icon="📲" />
      </div>

      {/* Who is joining */}
      <div className={`grid grid-cols-1 ${showJoin && hasStudents ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>
        {showJoin && (
        <div className="panel">
          <h2 className="panel-title">{showAudience ? 'Who is joining' : 'Special price (Excel list)'}</h2>
          {total === 0 ? (
            <p className="text-sm text-stone-400 mt-4">No paid bookings yet.</p>
          ) : (
            <>
              {showAudience && (
                <>
              <div className="mt-4 h-3 rounded-full bg-stone-100 overflow-hidden flex" role="img" aria-label={`${studentPct}% students`}>
                <div className="bg-violet-500" style={{ width: `${studentPct}%` }} />
                <div className="bg-amber-500" style={{ width: `${100 - studentPct}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Split dot="bg-violet-500" label="Students" count={stats.students} pct={studentPct} money={canMoney ? stats.studentRevenue : undefined} />
                <Split dot="bg-amber-500" label="Working professionals" count={stats.working} pct={100 - studentPct} money={canMoney ? stats.workingRevenue : undefined} />
              </div>
                </>
              )}
              {showReturning && stats.paid > 0 && (
                <div className={showAudience ? 'mt-5 pt-4 border-t border-stone-100' : 'mt-4'}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-stone-800">🔁 On the Excel list</span>
                    <span className="text-stone-500">{stats.returning} of {stats.paid} ({Math.round((stats.returning / stats.paid) * 100)}%)</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(stats.returning / stats.paid) * 100}%` }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        )}

        {/* ID queue */}
        {hasStudents && (
        <div className="panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="panel-title">Student ID checks</h2>
            <Link href="/admin/registrations" className="text-sm text-amber-700 hover:underline font-medium">Open →</Link>
          </div>
          {pendingIds.length === 0 ? (
            <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm px-4 py-3 font-medium">✓ Every student ID is verified.</div>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {pendingIds.map(r => (
                <li key={r.ref} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-stone-900 truncate">{r.name}</div>
                    <div className="text-xs text-stone-500 truncate">{r.college || '—'}{r.age ? ` · ${r.age}` : ''}</div>
                  </div>
                  {r.id_card_url
                    ? <a href={r.id_card_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm shrink-0">View ID</a>
                    : <span className="pill-gray shrink-0">No ID</span>}
                </li>
              ))}
              {stats.idsToVerify > pendingIds.length && (
                <li className="pt-2.5 text-xs text-stone-500">+ {stats.idsToVerify - pendingIds.length} more waiting</li>
              )}
            </ul>
          )}
        </div>
        )}
      </div>

      {/* Charts */}
      <div className={`grid grid-cols-1 ${canMoney ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>
        <div className="panel">
          <h2 className="panel-title">Registrations — 30 days</h2>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716C' }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#78716C' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E7E5E4', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: '#1C1917', fontWeight: 600 }} />
                <Area type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} fill="url(#regGrad)" name="Registrations" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {canMoney && (
          <div className="panel">
            <h2 className="panel-title">Revenue — 30 days</h2>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716C' }} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: '#78716C' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E7E5E4', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: '#1C1917', fontWeight: 600 }} formatter={(v: number) => [inr(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#EA580C" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recent bookings */}
      <div className="table-wrap">
        <div className="px-4 sm:px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="panel-title">Recent bookings</h2>
          <Link href="/admin/registrations" className="text-sm text-amber-700 hover:underline font-medium">View all →</Link>
        </div>

        <div className="md:hidden divide-y divide-stone-100">
          {recent.map(r => (
            <div key={r.ref} className="px-4 py-3.5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-stone-900 truncate">{r.name}</div>
                  <div className="text-xs font-mono text-stone-400 mt-0.5">{r.ref} · {fmtDate(r.created_at)}</div>
                </div>
                {canMoney && <div className="font-bold text-stone-900 shrink-0">{inr(r.total)}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <AudienceBadge r={r} />
                {r.returning_attendee && <span className="pill-green">📋 In Excel list</span>}
                <PayBadge status={r.payment_status} />
                <VerifyBadge status={getStudentStatus(r)} />
                {genderLabel(r.gender) && <span className="pill-gray">{genderLabel(r.gender)}</span>}
                <a href={`tel:${r.phone}`} className="text-amber-700 ml-auto">{r.phone}</a>
              </div>
            </div>
          ))}
          {recent.length === 0 && <div className="px-5 py-12 text-center text-stone-400">No registrations yet.</div>}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Date</th>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">For</th>
                {canMoney && <th className="th">Amount</th>}
                <th className="th">Payment</th>
                <th className="th">ID</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.ref} className="hover:bg-stone-50/70 transition-colors">
                  <td className="td text-stone-600 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="td">
                    <div className="font-medium">{r.name}</div>
                    <div className="font-mono text-[11px] text-stone-400">{r.ref}</div>
                  </td>
                  <td className="td text-stone-600">{r.phone}</td>
                  <td className="td"><div className="flex flex-wrap gap-1"><AudienceBadge r={r} />{r.returning_attendee && <span className="pill-green">🔁</span>}</div></td>
                  {canMoney && <td className="td font-bold">{inr(r.total)}</td>}
                  <td className="td"><PayBadge status={r.payment_status} /></td>
                  <td className="td"><VerifyBadge status={getStudentStatus(r)} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-14 text-center text-stone-400">No registrations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Mini({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-stone-50 py-2">
      <div className="text-lg font-extrabold text-stone-900 leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-stone-500 mt-1 font-semibold">{label}</div>
    </div>
  );
}

function Split({ dot, label, count, pct, money }: { dot: string; label: string; count: number; pct: number; money?: number }) {
  return (
    <div className="rounded-xl border border-stone-200 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} aria-hidden="true" />{label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-stone-900 leading-none">{count}</span>
        <span className="text-xs text-stone-400">{pct}%</span>
      </div>
      {money !== undefined && <div className="text-xs text-stone-500 mt-1">{inr(money)}</div>}
    </div>
  );
}

function StatCard({ value, label, icon, alert }: { value: string | number; label: string; icon: string; alert?: boolean }) {
  return (
    <div className={`stat-card flex gap-3 sm:gap-4 items-center ${alert ? 'ring-2 ring-amber-300/60' : ''}`}>
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-base sm:text-xl shrink-0 ${alert ? 'bg-amber-100' : 'bg-stone-100'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-xl sm:text-2xl font-extrabold leading-none truncate ${alert ? 'text-amber-600' : 'text-stone-900'}`}>{value}</div>
        <div className="text-[11px] sm:text-xs text-stone-500 mt-1 font-medium truncate">{label}</div>
      </div>
    </div>
  );
}

function AudienceBadge({ r }: { r: Registration }) {
  return r.qty_student > 0 ? <span className="pill-violet">🎓 Student</span> : <span className="pill-amber">💼 Working</span>;
}

function PayBadge({ status }: { status: string }) {
  const map: Record<string, string> = { paid: 'pill-green', failed: 'pill-red', pending: 'pill-amber' };
  return <span className={map[status] || 'pill-gray'}>{status}</span>;
}

function VerifyBadge({ status }: { status: string }) {
  if (status === 'none') return <span className="text-stone-300">—</span>;
  if (status === 'verified') return <span className="pill-green">✓ Verified</span>;
  if (status === 'rejected') return <span className="pill-red">✗ Rejected</span>;
  return <span className="pill-amber">⏳ Pending</span>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-stone-500 text-sm">Loading…</p>
      </div>
    </div>
  );
}

function ErrorBox({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <p className="text-red-600 mb-3 text-sm">{error}</p>
        <button onClick={onRetry} className="btn-ghost text-sm">Retry</button>
      </div>
    </div>
  );
}
