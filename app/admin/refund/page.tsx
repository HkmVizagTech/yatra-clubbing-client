'use client';

import { useState, useEffect } from 'react';
import { inr } from '@/lib/utils';

type BookingSummary = { ref: string; name: string; phone: string; total: number; payment_id: string };
type RefundResult = { ref: string; name: string; phone: string; total: number; ok: boolean; refundId?: string; error?: string };

export default function RefundPage() {
  const [preview, setPreview] = useState<{ pending: number; alreadyRefunded: number; bookings: BookingSummary[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RefundResult[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch('/api/admin/refund-all')
      .then(r => r.json())
      .then(d => { setPreview(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function runRefunds() {
    setRunning(true);
    try {
      const r = await fetch('/api/admin/refund-all', { method: 'POST' });
      const d = await r.json() as { refunded: number; failed: number; total: number; results: RefundResult[] };
      setResults(d.results);
      // Refresh preview counts
      const p = await fetch('/api/admin/refund-all').then(x => x.json());
      setPreview(p);
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setRunning(false);
    }
  }

  const totalAmount = preview?.bookings.reduce((s, b) => s + b.total, 0) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-lg">
      <div>
        <h1 className="text-2xl font-extrabold text-bark tracking-tight">Event Cancellation & Refunds</h1>
        <p className="text-sm text-bark-light mt-1">Issue full Razorpay refunds to all paid participants.</p>
      </div>

      {/* Warning banner */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <h2 className="font-bold text-red-700 mb-1">⚠ This action is irreversible</h2>
        <p className="text-sm text-red-600">
          Refunds once issued cannot be cancelled. Each participant will receive their full payment back
          within 5–7 business days via their original payment method.
        </p>
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
              I confirm that the <strong>Ramayana Circuit Yatra is cancelled</strong> and I want to issue
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
