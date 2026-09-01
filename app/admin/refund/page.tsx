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
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-lg">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-bark tracking-tight">Event Cancellation & Refunds</h1>
          <p className="text-sm text-bark-light mt-1">Issue full Razorpay refunds to all paid participants.</p>
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

      {/* Razorpay reconciliation audit — ground truth, catches untracked payments too */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-bark">Refund Audit (source: Razorpay)</h2>
            <p className="text-sm text-bark-light mt-0.5">
              Checks every captured payment from this platform's bookings directly with Razorpay —
              scoped to our order receipts only, including ones missing from our database.
            </p>
          </div>
          <button onClick={() => runAudit()} disabled={auditLoading} className="btn-ghost text-sm flex items-center gap-2">
            {auditLoading ? <><Spin />Checking…</> : '↻ Run audit'}
          </button>
        </div>

        {auditError && <p className="text-sm text-red-600">{auditError}</p>}

        {audit && (
          <>
            <div className="flex gap-4 flex-wrap">
              <StatBox value={audit.totalCaptured} label="Total captured payments" color="amber" />
              <StatBox value={audit.refundedCount} label="Fully refunded" color="green" />
              <StatBox value={audit.notRefundedCount} label="NOT refunded" color="red" />
              <StatBox value={inr(audit.notRefundedAmount / 100)} label="Amount outstanding" color="red" />
              {audit.untrackedCount > 0 && (
                <StatBox value={audit.untrackedCount} label="Missing from DB" color="amber" />
              )}
            </div>

            {audit.notRefundedCount === 0 ? (
              <p className="text-green-700 font-medium text-sm">✓ Every captured payment has been fully refunded.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-cream/80 text-bark-light text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                      <th className="text-left px-4 py-3">Payment ID</th>
                      <th className="text-left px-4 py-3">Ref</th>
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Phone</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">In DB?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.rows.filter(r => r.status !== 'refunded').map(r => (
                      <tr key={r.paymentId} className="border-b border-black/[0.04]">
                        <td className="px-4 py-3 font-mono text-xs font-bold">{r.paymentId}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.ref || '—'}</td>
                        <td className="px-4 py-3 font-medium">{r.name || '—'}</td>
                        <td className="px-4 py-3 text-bark-light">{r.phone || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold">{inr(r.amount / 100)}</td>
                        <td className="px-4 py-3">
                          {r.status === 'partial'
                            ? <span className="pill bg-amber-100 text-amber-700">Partially refunded</span>
                            : <span className="pill bg-red-100 text-red-700">Not refunded</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.trackedInDb
                            ? <span className="text-green-700 text-xs">✓ tracked</span>
                            : <span className="text-amber-700 text-xs font-semibold">⚠ missing</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-black/[0.05] text-xs text-bark-light">
                  Tip: paste these payment IDs into &quot;Manual Refund by Payment ID&quot; below to refund them.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary */}
      {loading ? (
        <div className="flex items-center gap-3 text-bark-light text-sm"><Spin />Loading refund summary…</div>
      ) : preview && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 space-y-4">
          <h2 className="font-bold text-bark">Refund Summary</h2>
          <div className="flex gap-4 flex-wrap">
            <StatBox value={preview.pending} label="Pending refunds" color="amber" />
            <StatBox value={inr(totalAmount)} label="Total to refund" color="red" />
            <StatBox value={preview.alreadyRefunded} label="Already refunded" color="green" />
          </div>

          {preview.pending > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-bark-light text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                    <th className="text-left py-2 pr-4">Ref</th>
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-left py-2 pr-4">Phone</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.bookings.map(b => (
                    <tr key={b.ref} className="border-b border-black/[0.03]">
                      <td className="py-2 pr-4 font-mono text-xs font-bold">{b.ref}</td>
                      <td className="py-2 pr-4 font-medium">{b.name}</td>
                      <td className="py-2 pr-4 text-bark-light">{b.phone}</td>
                      <td className="py-2 text-right font-bold">{inr(b.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.pending === 0 && (
            <p className="text-green-700 font-medium text-sm">✓ All refunds have been issued.</p>
          )}
        </div>
      )}

      {/* Action */}
      {!results && preview && preview.pending > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 space-y-4">
          <h2 className="font-bold text-bark">Confirm & Issue Refunds</h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-red-600 flex-shrink-0"
            />
            <span className="text-sm text-bark">
              I understand this is account-level (not refundable per-booking) and I want to issue
              full refunds to all <strong>{preview.pending} paid participants</strong> totalling <strong>{inr(totalAmount)}</strong>.
            </span>
          </label>
          <button
            onClick={runRefunds}
            disabled={!confirmed || running}
            className="px-6 py-3 rounded-full font-bold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {running ? <><Spin />Processing refunds…</> : `Issue ${preview.pending} Refunds (${inr(totalAmount)})`}
          </button>
        </div>
      )}

      {/* Manual refund by payment ID */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-5 space-y-4">
        <div>
          <h2 className="font-bold text-bark">Manual Refund by Payment ID</h2>
          <p className="text-sm text-bark-light mt-0.5">
            For payments not tracked in the system. Paste one or more Razorpay payment IDs (start with <code className="font-mono bg-cream px-1 rounded">pay_</code>).
          </p>
        </div>
        <textarea
          value={manualIds}
          onChange={e => setManualIds(e.target.value)}
          placeholder={'pay_XXXXXXXXXXXXXXXXX\npay_YYYYYYYYYYYYYYYYY\n...'}
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl border border-black/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gold/30 resize-y"
        />
        <button
          onClick={runManualRefunds}
          disabled={manualRunning || !manualIds.trim()}
          className="px-5 py-2.5 rounded-full font-bold text-sm bg-bark text-white hover:bg-bark-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {manualRunning ? <><Spin />Processing…</> : 'Issue Manual Refunds'}
        </button>

        {manualResults && (
          <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream/80 text-bark-light text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                  <th className="text-left px-4 py-3">Payment ID</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {manualResults.map(r => (
                  <tr key={r.paymentId} className="border-b border-black/[0.04]">
                    <td className="px-4 py-3 font-mono text-xs font-bold">{r.paymentId}</td>
                    <td className="px-4 py-3 font-bold">{r.amount ? inr(r.amount / 100) : '—'}</td>
                    <td className="px-4 py-3">
                      {r.ok
                        ? <span className="pill bg-green-100 text-green-700">✓ Refunded</span>
                        : <span className="pill bg-red-100 text-red-700">✗ Failed</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-bark-light font-mono">
                      {r.refundId === 'already-refunded' ? 'was already refunded' : (r.refundId || r.error || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-black/[0.05] text-xs text-bark-light">
              {manualResults.filter(r => r.ok).length} succeeded · {manualResults.filter(r => !r.ok).length} failed
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
            <h2 className="font-bold text-bark">Refund Results</h2>
            <div className="flex gap-3 text-sm">
              <span className="text-green-700 font-semibold">{results.filter(r => r.ok).length} succeeded</span>
              {results.filter(r => !r.ok).length > 0 && (
                <span className="text-red-600 font-semibold">{results.filter(r => !r.ok).length} failed</span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream/80 text-bark-light text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                  <th className="text-left px-5 py-3">Ref</th>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Amount</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.ref} className="border-b border-black/[0.04]">
                    <td className="px-5 py-3 font-mono text-xs font-bold">{r.ref}</td>
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="px-5 py-3 font-bold">{inr(r.total)}</td>
                    <td className="px-5 py-3">
                      {r.ok
                        ? <span className="pill bg-green-100 text-green-700">✓ Refunded</span>
                        : <span className="pill bg-red-100 text-red-700">✗ Failed</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-bark-light font-mono">
                      {r.refundId === 'already-refunded' ? 'was already refunded' : (r.refundId || r.error || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.some(r => !r.ok) && (
            <div className="px-5 py-4 border-t border-black/[0.05] bg-red-50 text-sm text-red-700">
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
  const bg = { amber: 'bg-amber-50 border-amber-200', red: 'bg-red-50 border-red-200', green: 'bg-green-50 border-green-200' }[color];
  const text = { amber: 'text-amber-700', red: 'text-red-700', green: 'text-green-700' }[color];
  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[130px] ${bg}`}>
      <div className={`text-2xl font-extrabold ${text}`}>{value}</div>
      <div className="text-xs text-bark-light mt-0.5">{label}</div>
    </div>
  );
}

function Spin() {
  return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
