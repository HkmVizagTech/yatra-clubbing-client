'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Registration } from '@/lib/types';
import { inr, fmtDate, getStudentStatus, buildChartData } from '@/lib/utils';
import { adminFetch } from '@/lib/api';
import { useEvents } from './components/useEvents';
import EventFilter from './components/EventFilter';

export default function DashboardPage() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [eventSlug, setEventSlug] = useState<string>('all');
  const { events, loading: loadingEvents } = useEvents();

  async function load(slug?: string) {
    setLoading(true);
    setError(null);
    try {
      const qs = slug ? `?event_code=${encodeURIComponent(slug)}` : (eventSlug && eventSlug !== 'all' ? `?event_code=${encodeURIComponent(eventSlug)}` : '');
      const r = await adminFetch(`/api/registrations${qs}`);
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json() as { registrations: Registration[] };
      setRegs(d.registrations || []);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loadingEvents) return;
    if (events.length > 0 && eventSlug === 'all') {
      const active = events.find(e => e.status === 'active');
      const initial = active ? active.code : 'all';
      (initial => {
        setEventSlug(initial);
        load(initial);
      })(initial);
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingEvents]);

  const stats = useMemo(() => {
    const paid = regs.filter(r => r.payment_status === 'paid');
    return {
      total: paid.length,
      revenue: paid.reduce((s, r) => s + (r.total || 0), 0),
      general: regs.reduce((s, r) => s + (r.qty_general || 0), 0),
      student: regs.reduce((s, r) => s + (r.qty_student || 0), 0),
      pending: regs.filter(r => getStudentStatus(r) === 'pending').length,
      paid: paid.length,
    };
  }, [regs]);

  const chartData = useMemo(() => buildChartData(regs), [regs]);
  const recent = useMemo(() => regs.slice(0, 10), [regs]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          {updatedAt && (
            <p className="page-subtitle">
              Updated {updatedAt.toLocaleTimeString('en-IN')}
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <EventFilter events={events} value={eventSlug} onChange={(s) => { setEventSlug(s); load(s); }} />
          <button onClick={() => load()} className="btn-ghost text-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <StatCard value={stats.total} label="Paid bookings" icon="🎟️" />
        <StatCard value={inr(stats.revenue)} label="Revenue" icon="💰" />
        <StatCard value={stats.general} label="General seats" icon="🎫" />
        <StatCard value={stats.student} label="Student seats" icon="🎓" />
        {stats.pending > 0 && (
          <StatCard value={stats.pending} label="IDs to verify" icon="⚠️" alert />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E7E5E4', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                  labelStyle={{ color: '#1C1917', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} fill="url(#regGrad)" name="Registrations" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel-title">Revenue — 30 days</h2>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716C' }} tickLine={false} interval={4} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#78716C' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E7E5E4', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                  labelStyle={{ color: '#1C1917', fontWeight: 600 }}
                  formatter={(v: number) => [inr(v), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#EA580C" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="table-wrap">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="panel-title">Recent bookings</h2>
          <Link href="/admin/registrations" className="text-sm text-amber-700 hover:underline font-medium">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Date</th>
                <th className="th">Ref</th>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">Total</th>
                <th className="th">Payment</th>
                <th className="th">ID Verify</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.ref} className="hover:bg-stone-50/70 transition-colors">
                  <td className="td text-stone-600 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="td font-mono text-xs font-bold text-stone-900">{r.ref}</td>
                  <td className="td font-medium">{r.name}</td>
                  <td className="td text-stone-600">{r.phone}</td>
                  <td className="td font-bold">{inr(r.total)}</td>
                  <td className="td"><PayBadge status={r.payment_status} /></td>
                  <td className="td"><VerifyBadge status={getStudentStatus(r)} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-stone-400">No registrations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, icon, alert }: { value: string | number; label: string; icon: string; alert?: boolean }) {
  return (
    <div className={`stat-card flex gap-4 items-center ${alert ? 'ring-2 ring-amber-300/60' : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${alert ? 'bg-amber-100' : 'bg-stone-100'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-extrabold leading-none truncate ${alert ? 'text-amber-600' : 'text-stone-900'}`}>{value}</div>
        <div className="text-xs text-stone-500 mt-1 font-medium">{label}</div>
      </div>
    </div>
  );
}

function PayBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'pill-green',
    failed: 'pill-red',
    pending: 'pill-amber',
  };
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