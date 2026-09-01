'use client';

import { useState, useEffect } from 'react';
import { inr } from '@/lib/utils';
import { adminFetch } from '@/lib/api';
import { useEvents } from '../components/useEvents';
import EventFilter from '../components/EventFilter';

type BookingSummary = { ref: string; name: string; phone: string; total: number; payment_id: string };
type RefundResult = { ref: string; name: string; phone: string; total: number; ok: boolean; refundId?: string; error?: string };
type ManualResult = { paymentId: string; ok: boolean; refundId?: string; amount?: number; error?: string };
type AuditRow = {
  paymentId: string; ref: string | null; name: string | null; phone: string | null;
  amount: number; amountRefunded: number; status: 'refunded' | 'partial' | 'not_refunded';
  trackedInDb: boolean; createdAt: string;
};
type AuditData = {
  totalCaptured: number; refundedCount: number; notRefundedCount: number;
  untrackedCount: number; notRefundedAmount: number; rows: AuditRow[];
};

export default function RefundPage() {
  const [preview, setPreview] = useState<{ pending: number; alreadyRefunded: number; bookings: BookingSummary[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RefundResult[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [eventSlug, setEventSlug] = useState<string>('all');
  const { events, loading: loadingEvents } = useEvents();

  useEffect(() => {
    if (loadingEvents) return;
    let slug = eventSlug;
    if (events.length > 0 && eventSlug === 'all') {
      const active = events.find(e => e.status === 'active');
      slug = active ? active.code : 'all';
      setEventSlug(slug);
    }
    const qs = slug && slug !== 'all' ? `?event_code=${encodeURIComponent(slug)}` : '';
    adminFetch(`/api/admin/refund-all${qs}`)
      .then(r => r.json())
      .then(d => { setPreview(d); setLoading(false); })
      .catch(() => setLoading(false));
    runAudit(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingEvents]);

  async function runRefunds() {
    setRunning(true);
    try {
      const qs = eventSlug && eventSlug !== 'all' ? `?event_code=${encodeURIComponent(eventSlug)}` : '';
      const r = await adminFetch(`/api/admin/refund-all${qs}`, { method: 'POST' });
      const d = await r.json() as { refunded: number; failed: number; total: number; results: RefundResult[] };
      setResults(d.results);
      const p = await adminFetch(`/api/admin/refund-all${qs}`).then(x => x.json());
      setPreview(p);
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setRunning(false);
    }
  }

  // Manual refund state
  const [manualIds, setManualIds] = useState('');
  const [manualRunning, setManualRunning] = useState(false);
  const [manualResults, setManualResults] = useState<ManualResult[] | null>(null);

  async function runManualRefunds() {
    const ids = manualIds.split(/[\s,\n]+/).map(s => s.trim()).filter(s => s.startsWith('pay_'));
    if (!ids.length) { alert('No valid payment IDs found. Each ID should start with pay_'); return; }
    setManualRunning(true);
    try {
      const r = await adminFetch('/api/admin/refund-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIds: ids }),
      });
      const d = await r.json() as { refunded: number; failed: number; results: ManualResult[] };
      setManualResults(d.results);
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setManualRunning(false);
    }
  }

  // Audit against Razorpay directly (catches untracked / not-in-DB payments too)
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  async function runAudit(slugOverride?: string) {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const s = slugOverride !== undefined ? slugOverride : eventSlug;
      const qs = s && s !== 'all' ? `?event_code=${encodeURIComponent(s)}` : '';
      const r = await adminFetch(`/api/admin/refund-audit${qs}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setAudit(d);
    } catch (e) {
      setAuditError(String(e));
    } finally {
      setAuditLoading(false);
    }
  }

  const totalAmount = preview?.bookings.reduce((s, b) => s + b.total, 0) || 0;

  return (
    <div className="space-y-6 max-w-screen-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Refunds</h1>
          <p className="page-subtitle">Issue full Razorpay refunds to all paid participants for a cancelled event.</p>
        </div>
        <EventFilter
          events={events}
          value={eventSlug}
          onChange={(s) => {
            setEventSlug(s);
            setLoading(true);
            setResults(null);
            const qs = s && s !== 'all' ? `?event_code=${encodeURIComponent(s)}` : '';
            adminFetch(`/api/admin/refund-all${qs}`)
              .then(r => r.json())
              .then(d => { setPreview(d); setLoading(false); })
              .catch(() => setLoading(false));
            runAudit(s);
          }}
        />
      </div>

      {/* Warning banner */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <h2 className="font-bold text-red-700 mb-1">⚠ This action is irreversible</h2>
        <p className="text-sm text-red-600">
          Refunds once issued cannot be cancelled. Each participant will receive their full payment back
          within 5–7 business days via their original payment method.
        </p>
      </div>

      {/* Razorpay reconciliation audit */}
      <div className="panel space-y-4">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Refund audit</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Checks every captured payment directly with Razorpay — scoped to this platform&apos;s receipts,
              including payments missing from the database.
            </p>
          </div>
          <button onClick={() => runAudit()} disabled={auditLoading} className="btn-ghost text-sm flex items-center gap-2">
            {auditLoading ? <><Spin />Checking…</> : '↻ Run audit'}
          </button>
        </div>

        {auditError && <p className="text-sm text-red-600">{auditError}</p>}

        {audit && (
          <>
            <div className="flex gap-3 flex-wrap">
              <StatBox value={audit.totalCaptured} label="Total captured" color="amber" />
              <StatBox value={audit.refundedCount} label="Fully refunded" color="green" />
              <StatBox value={audit.notRefundedCount} label="NOT refunded" color="red" />
              <StatBox value={inr(audit.notRefundedAmount / 100)} label="Outstanding" color="red" />
              {audit.untrackedCount > 0 && (
                <StatBox value={audit.untrackedCount} label="Missing from DB" color="amber" />
              )}
            </div>

            {audit.notRefundedCount === 0 ? (
              <p className="text-emerald-700 font-medium text-sm">✓ Every captured payment has been fully refunded.</p>
            ) : (
              <div className="table-wrap overflow-visible">
                <div className="overflow-x-auto rounded-2xl">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th">Payment ID</th>
                        <th className="th">Ref</th>
                        <th className="th">Name</th>
                        <th className="th text-right">Amount</th>
                        <th className="th">Status</th>
                        <th className="th">In DB?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.rows.filter(r => r.status !== 'refunded').map(r => (
                        <tr key={r.paymentId} className="border-b border-stone-100">
                          <td className="td font-mono text-xs font-bold">{r.paymentId}</td>
                          <td className="td font-mono text-xs">{r.ref || '—'}</td>
                          <td className="td font-medium">{r.name || '—'}</td>
                          <td className="td text-right font-bold">{inr(r.amount / 100)}</td>
                          <td className="td">
                            {r.status === 'partial'
                              ? <span className="pill-amber">Partially refunded</span>
                              : <span className="pill-red">Not refunded</span>}
                          </td>
                          <td className="td">
                            {r.trackedInDb
                              ? <span className="text-emerald-700 text-xs">✓ tracked</span>
                              : <span className="text-amber-700 text-xs font-semibold">⚠ missing</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-stone-100 text-xs text-stone-500">
                  Tip: paste these payment IDs into &quot;Manual refund by payment ID&quot; below to refund them.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary */}
      {loading ? (
        <div className="flex items-center gap-3 text-stone-500 text-sm"><Spin />Loading refund summary…</div>
      ) : preview && (
        <div className="panel space-y-4">
          <h2 className="panel-title">Refund summary</h2>
          <div className="flex gap-3 flex-wrap">
            <StatBox value={preview.pending} label="Pending refunds" color="amber" />
            <StatBox value={inr(totalAmount)} label="Total to refund" color="red" />
            <StatBox value={preview.alreadyRefunded} label="Already refunded" color="green" />
          </div>

          {preview.pending > 0 && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th py-2">Ref</th>
                    <th className="th py-2">Name</th>
                    <th className="th py-2">Phone</th>
                    <th className="th py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.bookings.map(b => (
                    <tr key={b.ref} className="border-b border-stone-100">
                      <td className="td py-2 font-mono text-xs font-bold">{b.ref}</td>
                      <td className="td py-2 font-medium">{b.name}</td>
                      <td className="td py-2 text-stone-600">{b.phone}</td>
                      <td className="td py-2 text-right font-bold">{inr(b.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.pending === 0 && (
            <p className="text-emerald-700 font-medium text-sm">✓ All refunds have been issued.</p>
          )}
        </div>
      )}

      {/* Action */}
      {!results && preview && preview.pending > 0 && (
        <div className="panel space-y-4">
          <h2 className="panel-title">Confirm & issue refunds</h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-red-600 shrink-0"
            />
            <span className="text-sm text-stone-700">
              I understand this is account-level (not refundable per-booking) and I want to issue
              full refunds to all <strong className="text-stone-900">{preview.pending} paid participants</strong> totalling <strong className="text-stone-900">{inr(totalAmount)}</strong>.
            </span>
          </label>
          <button
            onClick={runRefunds}
            disabled={!confirmed || running}
            className="btn-danger text-sm flex items-center gap-2"
          >
            {running ? <><Spin />Processing refunds…</> : `Issue ${preview.pending} refunds (${inr(totalAmount)})`}
          </button>
        </div>
      )}

      {/* Manual refund by payment ID */}
      <div className="panel space-y-4">
        <div>
          <h2 className="panel-title">Manual refund by payment ID</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            For payments not tracked in the system. Paste one or more Razorpay payment IDs (start with <code className="font-mono bg-stone-100 px-1 rounded">pay_</code>).
          </p>
        </div>
        <textarea
          value={manualIds}
          onChange={e => setManualIds(e.target.value)}
          placeholder={'pay_XXXXXXXXXXXXXXXXX\npay_YYYYYYYYYYYYYYYYY\n...'}
          rows={4}
          className="input font-mono resize-y"
        />
        <button
          onClick={runManualRefunds}
          disabled={manualRunning || !manualIds.trim()}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {manualRunning ? <><Spin />Processing…</> : 'Issue manual refunds'}
        </button>

        {manualResults && (
          <div className="table-wrap overflow-visible">
            <div className="overflow-x-auto rounded-2xl">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Payment ID</th>
                    <th className="th">Amount</th>
                    <th className="th">Status</th>
                    <th className="th">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {manualResults.map(r => (
                    <tr key={r.paymentId} className="border-b border-stone-100">
                      <td className="td font-mono text-xs font-bold">{r.paymentId}</td>
                      <td className="td font-bold">{r.amount ? inr(r.amount / 100) : '—'}</td>
                      <td className="td">
                        {r.ok
                          ? <span className="pill-green">✓ Refunded</span>
                          : <span className="pill-red">✗ Failed</span>}
                      </td>
                      <td className="td text-xs text-stone-500 font-mono">
                        {r.refundId === 'already-refunded' ? 'was already refunded' : (r.refundId || r.error || '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-stone-100 text-xs text-stone-500">
              {manualResults.filter(r => r.ok).length} succeeded · {manualResults.filter(r => !r.ok).length} failed
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="table-wrap overflow-visible">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="panel-title">Refund results</h2>
            <div className="flex gap-3 text-sm">
              <span className="text-emerald-700 font-semibold">{results.filter(r => r.ok).length} succeeded</span>
              {results.filter(r => !r.ok).length > 0 && (
                <span className="text-red-600 font-semibold">{results.filter(r => !r.ok).length} failed</span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Ref</th>
                  <th className="th">Name</th>
                  <th className="th">Amount</th>
                  <th className="th">Status</th>
                  <th className="th">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.ref} className="border-b border-stone-100">
                    <td className="td font-mono text-xs font-bold">{r.ref}</td>
                    <td className="td font-medium">{r.name}</td>
                    <td className="td font-bold">{inr(r.total)}</td>
                    <td className="td">
                      {r.ok
                        ? <span className="pill-green">✓ Refunded</span>
                        : <span className="pill-red">✗ Failed</span>}
                    </td>
                    <td className="td text-xs text-stone-500 font-mono">
                      {r.refundId === 'already-refunded' ? 'was already refunded' : (r.refundId || r.error || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.some(r => !r.ok) && (
            <div className="px-5 py-4 border-t border-stone-100 bg-red-50 text-sm text-red-700">
              Some refunds failed. You can retry — already-refunded bookings will be skipped automatically.
              <button
                onClick={runRefunds}
                disabled={running}
                className="ml-3 underline font-semibold hover:no-underline"
              >
                {running ? 'Retrying…' : 'Retry failed'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ value, label, color }: { value: string | number; label: string; color: 'amber' | 'red' | 'green' }) {
  const bg = { amber: 'bg-amber-50 border-amber-200', red: 'bg-red-50 border-red-200', green: 'bg-emerald-50 border-emerald-200' }[color];
  const text = { amber: 'text-amber-700', red: 'text-red-700', green: 'text-emerald-700' }[color];
  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[130px] ${bg}`}>
      <div className={`text-2xl font-extrabold ${text}`}>{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

function Spin() {
  return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}