'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Registration } from '@/lib/types';
import { inr, fmtDate, getStudentStatus, buildChartData } from '@/lib/utils';

export default function DashboardPage() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/registrations');
      if (r.status === 401) { window.location.href = '/login'; return; }
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

  useEffect(() => { load(); }, []);

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
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-bark tracking-tight">Dashboard</h1>
          {updatedAt && (
            <p className="text-sm text-bark-light mt-0.5">
              Updated {updatedAt.toLocaleTimeString('en-IN')}
            </p>
          )}
        </div>
        <button onClick={load} className="btn-ghost text-sm">↻ Refresh</button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <StatCard value={stats.total} label="Bookings" icon="📋" />
        <StatCard value={inr(stats.revenue)} label="Revenue" icon="💰" />
        <StatCard value={stats.general} label="General Seats" icon="🎫" />
        <StatCard value={stats.student} label="Student Seats" icon="🎓" />
        {stats.pending > 0 && (
          <StatCard value={stats.pending} label="Pending IDs" icon="⚠️" alert />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <h2 className="font-semibold text-bark mb-4 text-sm uppercase tracking-wide">Registrations — 30 days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E07B00" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#E07B00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,60,20,.07)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6E5C44' }} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#6E5C44' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid rgba(90,60,20,.14)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                labelStyle={{ color: '#2A1A08', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="count" stroke="#E07B00" strokeWidth={2} fill="url(#regGrad)" name="Registrations" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <h2 className="font-semibold text-bark mb-4 text-sm uppercase tracking-wide">Revenue — 30 days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,60,20,.07)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6E5C44' }} tickLine={false} interval={4} />
              <YAxis
                tick={{ fontSize: 10, fill: '#6E5C44' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
              />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid rgba(90,60,20,.14)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                labelStyle={{ color: '#2A1A08', fontWeight: 600 }}
                formatter={(v: number) => [inr(v), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#B85C00" radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
          <h2 className="font-bold text-bark">Recent Bookings</h2>
          <Link href="/admin/registrations" className="text-sm text-gold-dark hover:underline font-medium">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream/80 text-bark-light text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                <th className="text-left px-5 py-3 font-semibold">Date</th>
                <th className="text-left px-5 py-3 font-semibold">Ref</th>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Phone</th>
                <th className="text-left px-5 py-3 font-semibold">Total</th>
                <th className="text-left px-5 py-3 font-semibold">Payment</th>
                <th className="text-left px-5 py-3 font-semibold">ID Verify</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={r.ref} className={`border-b border-black/[0.04] hover:bg-cream/60 transition-colors ${i % 2 === 1 ? 'bg-cream/30' : ''}`}>
                  <td className="px-5 py-3 text-bark-light whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-bark">{r.ref}</td>
                  <td className="px-5 py-3 font-medium">{r.name}</td>
                  <td className="px-5 py-3 text-bark-light">{r.phone}</td>
                  <td className="px-5 py-3 font-bold">{inr(r.total)}</td>
                  <td className="px-5 py-3"><PayBadge status={r.payment_status} /></td>
                  <td className="px-5 py-3"><VerifyBadge status={getStudentStatus(r)} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-bark-light">No registrations yet.</td>
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
    <div className={`stat-card flex gap-4 items-center ${alert ? 'border-gold/30 bg-gold/5' : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${alert ? 'bg-gold/15' : 'bg-cream'}`}>
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-extrabold leading-none ${alert ? 'text-gold' : 'text-bark'}`}>{value}</div>
        <div className="text-xs text-bark-light mt-1 font-medium">{label}</div>
      </div>
    </div>
  );
}

function PayBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  };
  return <span className={`pill ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function VerifyBadge({ status }: { status: string }) {
  if (status === 'none') return <span className="text-bark-light/50">—</span>;
  if (status === 'verified') return <span className="pill bg-green-100 text-green-700">✓ Verified</span>;
  if (status === 'rejected') return <span className="pill bg-red-100 text-red-700">✗ Rejected</span>;
  return <span className="pill bg-amber-100 text-amber-700">⏳ Pending</span>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-bark-light text-sm">Loading…</p>
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
