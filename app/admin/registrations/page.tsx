'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Registration } from '@/lib/types';
import { inr, fmtDate, getStudentStatus, getRejectionReason, downloadCSV } from '@/lib/utils';

const REJECT_REASONS = [
  'ID image is unclear or unreadable',
  'ID does not match booking name',
  'ID appears to be expired',
  'ID is not a valid student card',
  'Other',
];

type Filter = 'all' | 'paid' | 'pending' | 'students' | 'verify';

export default function RegistrationsPage() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [verifying, setVerifying] = useState<Set<string>>(new Set());
  const [rejectModal, setRejectModal] = useState<{ ref: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/registrations');
      if (r.status === 401) { window.location.href = '/admin/login'; return; }
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs.filter(r => {
      if (q && ![r.name, r.phone, r.email || '', r.ref].some(v => v.toLowerCase().includes(q))) return false;
      if (filter === 'paid') return r.payment_status === 'paid';
      if (filter === 'pending') return r.payment_status !== 'paid';
      if (filter === 'students') return r.qty_student > 0;
      if (filter === 'verify') return getStudentStatus(r) === 'pending';
      return true;
    });
  }, [regs, search, filter]);

  const pendingCount = useMemo(() => regs.filter(r => getStudentStatus(r) === 'pending').length, [regs]);

  const doVerify = useCallback(async (ref: string, action: 'approve' | 'reject', reason: string) => {
    setVerifying(prev => new Set(prev).add(ref));
    try {
      const r = await fetch('/api/verify-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, action, reason }),
      });
      const d = await r.json() as { updated: boolean; status?: string };
      if (d.updated) {
        setRegs(prev => prev.map(x =>
          x.ref === ref ? { ...x, student_status: d.status || (action === 'approve' ? 'verified' : 'rejected') } : x
        ));
      }
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setVerifying(prev => { const s = new Set(prev); s.delete(ref); return s; });
    }
  }, []);

  function openRejectModal(ref: string, name: string) {
    setRejectModal({ ref, name });
    setRejectReason(REJECT_REASONS[0]);
    setCustomReason('');
  }

  async function confirmReject() {
    if (!rejectModal) return;
    const reason = rejectReason === 'Other' ? (customReason.trim() || 'ID could not be verified') : rejectReason;
    setRejectModal(null);
    await doVerify(rejectModal.ref, 'reject', reason);
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-bark tracking-tight">Registrations</h1>
          <p className="text-sm text-bark-light mt-0.5">
            {regs.length} total
            {updatedAt && <> · Updated {updatedAt.toLocaleTimeString('en-IN')}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV(regs)} className="btn-ghost text-sm">⤓ Export CSV</button>
          <button onClick={load} className="btn-ghost text-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-light text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email, ref…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-black/10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <div className="flex gap-1 bg-white border border-black/10 rounded-xl p-1">
          {([
            { key: 'all', label: 'All' },
            { key: 'paid', label: 'Paid' },
            { key: 'pending', label: 'Unpaid' },
            { key: 'students', label: 'Students' },
            { key: 'verify', label: `Verify (${pendingCount})` },
          ] as { key: Filter; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === tab.key
                  ? 'bg-bark-sidebar text-white'
                  : 'text-bark-light hover:text-bark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream/80 text-bark-light text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Ref</th>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Phone</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Pass</th>
                <th className="text-left px-4 py-3 font-semibold">Qty</th>
                <th className="text-left px-4 py-3 font-semibold">Total</th>
                <th className="text-left px-4 py-3 font-semibold">Payment</th>
                <th className="text-left px-4 py-3 font-semibold">Student ID</th>
                <th className="text-left px-4 py-3 font-semibold">Verify</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const sts = getStudentStatus(r);
                const busy = verifying.has(r.ref);
                const qty = [
                  r.qty_general > 0 ? `G×${r.qty_general}` : '',
                  r.qty_student > 0 ? `S×${r.qty_student}` : '',
                ].filter(Boolean).join(' ');
                return (
                  <tr key={r.ref} className={`border-b border-black/[0.04] hover:bg-cream/60 transition-colors ${i % 2 === 1 ? 'bg-cream/20' : ''}`}>
                    <td className="px-4 py-3 text-bark-light whitespace-nowrap text-xs">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold">{r.ref}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.name}</td>
                    <td className="px-4 py-3 text-bark-light whitespace-nowrap">{r.phone}</td>
                    <td className="px-4 py-3 text-bark-light">
                      {r.email ? (
                        <a href={`mailto:${r.email}`} className="hover:underline text-gold-dark">{r.email}</a>
                      ) : <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${r.pass_type === 'student' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                        {r.pass_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bark-light font-mono text-xs">{qty}</td>
                    <td className="px-4 py-3 font-extrabold">{inr(r.total)}</td>
                    <td className="px-4 py-3">
                      <PayBadge status={r.payment_status} />
                      {r.payment_id && (
                        <div className="text-[10px] text-bark-light font-mono mt-0.5 max-w-[80px] truncate" title={r.payment_id}>
                          {r.payment_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.id_card_url ? (
                        <a
                          href={r.id_card_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-gold-dark hover:underline"
                        >
                          View ID ↗
                        </a>
                      ) : (
                        <span className="text-bark-light/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sts === 'verified' && <span className="pill bg-green-100 text-green-700">✓ Verified</span>}
                      {sts === 'rejected' && (
                        <span className="pill bg-red-100 text-red-700 cursor-default" title={getRejectionReason(r)}>
                          ✗ Rejected
                        </span>
                      )}
                      {sts === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => doVerify(r.ref, 'approve', '')}
                            disabled={busy}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 transition-colors"
                          >
                            {busy ? '…' : '✓'}
                          </button>
                          <button
                            onClick={() => openRejectModal(r.ref, r.name)}
                            disabled={busy}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 transition-colors"
                          >
                            ✗
                          </button>
                        </div>
                      )}
                      {sts === 'none' && <span className="text-bark-light/30 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center text-bark-light">
                    {search || filter !== 'all' ? 'No results match your filter.' : 'No registrations yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-black/[0.05] text-xs text-bark-light">
            Showing {filtered.length} of {regs.length} registrations
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-bark mb-1">Reject Student ID</h2>
            <p className="text-sm text-bark-light mb-4">
              Rejecting for <strong>{rejectModal.name}</strong> ({rejectModal.ref}).
              A WhatsApp message will be sent.
            </p>

            <label className="block text-sm font-medium text-bark mb-1.5">Reason</label>
            <select
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-black/12 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gold/30 bg-cream/50"
            >
              {REJECT_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>

            {rejectReason === 'Other' && (
              <input
                type="text"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe the issue…"
                className="w-full px-3 py-2.5 rounded-xl border border-black/12 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            )}

            <div className="flex gap-2 justify-end mt-2">
              <button onClick={() => setRejectModal(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={confirmReject}
                className="px-5 py-2 rounded-full text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  };
  return <span className={`pill ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-bark-light text-sm">Loading registrations…</p>
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
