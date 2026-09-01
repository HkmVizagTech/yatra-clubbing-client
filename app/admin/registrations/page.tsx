'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Registration } from '@/lib/types';
import { inr, fmtDate, getStudentStatus, getRejectionReason, downloadCSV } from '@/lib/utils';
import { adminFetch } from '@/lib/api';
import { useEvents } from '../components/useEvents';
import EventFilter from '../components/EventFilter';

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
  const [eventSlug, setEventSlug] = useState<string>('all');
  const { events, loading: loadingEvents } = useEvents();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [verifying, setVerifying] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [rejectModal, setRejectModal] = useState<{ ref: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  async function load(slug?: string) {
    setLoading(true);
    setError(null);
    try {
      const s = slug !== undefined ? slug : eventSlug;
      const qs = s && s !== 'all' ? `?event_code=${encodeURIComponent(s)}` : '';
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
      setEventSlug(initial);
      load(initial);
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingEvents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs.filter(r => {
      if (q && ![r.name, r.phone, r.email, r.ref].some(v => String(v ?? '').toLowerCase().includes(q))) return false;
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
      const r = await adminFetch('/api/verify-student', {
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

  const deleteReg = useCallback(async (ref: string, name: string) => {
    if (!confirm(`Delete the registration for "${name}" (${ref})? This cannot be undone.`)) return;
    setDeleting(prev => new Set(prev).add(ref));
    try {
      const r = await adminFetch(`/api/registrations?ref=${encodeURIComponent(ref)}`, { method: 'DELETE' });
      const d = await r.json() as { deleted: boolean };
      if (d.deleted) {
        setRegs(prev => prev.filter(x => x.ref !== ref));
      } else {
        alert('Could not delete that registration.');
      }
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(ref); return s; });
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
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrations</h1>
          <p className="page-subtitle">
            {regs.length} total
            {updatedAt && <> · Updated {updatedAt.toLocaleTimeString('en-IN')}</>}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <EventFilter events={events} value={eventSlug} onChange={(s) => { setEventSlug(s); load(s); }} />
          <button onClick={() => downloadCSV(regs)} className="btn-ghost text-sm">⤓ Export CSV</button>
          <button onClick={() => load()} className="btn-ghost text-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email, ref…"
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1">
          {([
            { key: 'all', label: 'All' },
            { key: 'paid', label: 'Paid' },
            { key: 'pending', label: 'Unpaid' },
            { key: 'students', label: 'Students' },
            { key: 'verify', label: `To verify (${pendingCount})` },
          ] as { key: Filter; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === tab.key
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th whitespace-nowrap">Date</th>
                <th className="th">Ref</th>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">Email</th>
                <th className="th">Pass</th>
                <th className="th">Qty</th>
                <th className="th">Total</th>
                <th className="th">Payment</th>
                <th className="th">Student ID</th>
                <th className="th">Verify</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sts = getStudentStatus(r);
                const busy = verifying.has(r.ref);
                const qty = [
                  r.qty_general > 0 ? `G×${r.qty_general}` : '',
                  r.qty_student > 0 ? `S×${r.qty_student}` : '',
                ].filter(Boolean).join(' ');
                return (
                  <tr key={r.ref} className="hover:bg-stone-50/70 transition-colors">
                    <td className="td text-stone-500 whitespace-nowrap text-xs">{fmtDate(r.created_at)}</td>
                    <td className="td font-mono text-xs font-bold">{r.ref}</td>
                    <td className="td font-medium whitespace-nowrap">{r.name}</td>
                    <td className="td text-stone-600 whitespace-nowrap">{r.phone}</td>
                    <td className="td text-stone-600">
                      {r.email ? (
                        <a href={`mailto:${r.email}`} className="hover:underline text-amber-700">{r.email}</a>
                      ) : <span className="opacity-30">—</span>}
                    </td>
                    <td className="td">
                      <span className={r.pass_type === 'student' ? 'pill-amber' : 'pill-violet'}>
                        {r.pass_type}
                      </span>
                    </td>
                    <td className="td text-stone-600 font-mono text-xs">{qty}</td>
                    <td className="td font-bold">{inr(r.total)}</td>
                    <td className="td">
                      <PayBadge status={r.payment_status} />
                      {r.payment_id && (
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5 max-w-[80px] truncate" title={r.payment_id}>
                          {r.payment_id}
                        </div>
                      )}
                    </td>
                    <td className="td">
                      {r.id_card_url ? (
                        <a
                          href={r.id_card_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-amber-700 hover:underline"
                        >
                          View ID ↗
                        </a>
                      ) : (
                        <span className="text-stone-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="td">
                      {sts === 'verified' && <span className="pill-green">✓ Verified</span>}
                      {sts === 'rejected' && (
                        <span className="pill-red cursor-default" title={getRejectionReason(r)}>
                          ✗ Rejected
                        </span>
                      )}
                      {sts === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => doVerify(r.ref, 'approve', '')}
                            disabled={busy}
                            className="btn-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg disabled:opacity-40 transition-colors"
                          >
                            {busy ? '…' : '✓'}
                          </button>
                          <button
                            onClick={() => openRejectModal(r.ref, r.name)}
                            disabled={busy}
                            className="btn-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 rounded-lg disabled:opacity-40 transition-colors"
                          >
                            ✗
                          </button>
                        </div>
                      )}
                      {sts === 'none' && <span className="text-stone-300 text-xs">—</span>}
                    </td>
                    <td className="td">
                      <button
                        onClick={() => deleteReg(r.ref, r.name)}
                        disabled={deleting.has(r.ref)}
                        title="Delete this registration"
                        className="icon-btn text-red-500 hover:bg-red-50"
                      >
                        {deleting.has(r.ref) ? '…' : '🗑'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-14 text-center text-stone-400">
                    {search || filter !== 'all' ? 'No results match your filter.' : 'No registrations yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-stone-100 text-xs text-stone-400">
            Showing {filtered.length} of {regs.length} registrations
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-stone-900 mb-1">Reject Student ID</h2>
            <p className="text-sm text-stone-500 mb-4">
              Rejecting for <strong className="text-stone-900">{rejectModal.name}</strong> ({rejectModal.ref}).
              A WhatsApp message will be sent.
            </p>

            <label className="label">Reason</label>
            <select
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="select mb-3"
            >
              {REJECT_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>

            {rejectReason === 'Other' && (
              <input
                type="text"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe the issue…"
                className="input mb-3"
              />
            )}

            <div className="flex gap-2 justify-end mt-2">
              <button onClick={() => setRejectModal(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={confirmReject} className="btn-danger text-sm">Reject</button>
            </div>
          </div>
        </div>
      )}
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

function Spinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-stone-500 text-sm">Loading registrations…</p>
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