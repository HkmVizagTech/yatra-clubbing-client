'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Registration } from '@/lib/types';
import { inr, fmtDate, getStudentStatus, getRejectionReason, downloadCSV, genderLabel, getWhatsappStatus, isWhatsappConfirmed } from '@/lib/utils';
import { adminFetch } from '@/lib/api';
import { useEvents } from '../components/useEvents';
import EventFilter from '../components/EventFilter';
import Select from '../../components/Select';

const REJECT_REASONS = [
  'ID image is unclear or unreadable',
  'ID does not match booking name',
  'ID appears to be expired',
  'ID is not a valid student card',
  'Other',
];

const GENDER_SET_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

type Filter = 'all' | 'paid' | 'pending' | 'students' | 'verify';
type GenderFilter = 'all' | 'male' | 'female' | 'unknown';

export default function RegistrationsPage() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [eventSlug, setEventSlug] = useState<string>('all');
  const { events, loading: loadingEvents } = useEvents();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [gender, setGender] = useState<GenderFilter>('all');
  const [verifying, setVerifying] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [rejectModal, setRejectModal] = useState<{ ref: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [savingGender, setSavingGender] = useState<Set<string>>(new Set());

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
      if (q && ![r.name, r.phone, r.email, r.ref, r.college, r.course, r.year_of_study, genderLabel(r.gender)].some(v => String(v ?? '').toLowerCase().includes(q))) return false;
      if (gender !== 'all') {
        const g = String(r.gender || '').toLowerCase();
        if (gender === 'unknown' ? (g === 'male' || g === 'female') : g !== gender) return false;
      }
      if (filter === 'paid') return r.payment_status === 'paid';
      if (filter === 'pending') return r.payment_status !== 'paid';
      if (filter === 'students') return r.qty_student > 0;
      if (filter === 'verify') return getStudentStatus(r) === 'pending';
      return true;
    });
  }, [regs, search, filter, gender]);

  const pendingCount = useMemo(() => regs.filter(r => getStudentStatus(r) === 'pending').length, [regs]);

  // Head-count by gender for the CURRENTLY FILTERED set — what the yatra team
  // actually needs when allocating buses and accommodation. Derived from
  // `filtered` (not `regs`) so the boxes move with the paid/unpaid/students/
  // verify chips, the gender select and the search box instead of always
  // reporting the whole event.
  const genderCounts = useMemo(() => {
    let male = 0, female = 0, unknown = 0;
    filtered.forEach(r => {
      const g = String(r.gender || '').toLowerCase();
      if (g === 'male') male++;
      else if (g === 'female') female++;
      else unknown++;
    });
    return { male, female, unknown };
  }, [filtered]);

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

  // Registrations taken before the booking form asked for gender have none.
  // Buses and the overnight halls are allocated separately, so the team fills
  // it in here once they know — it is never guessed from the name.
  const setGenderFor = useCallback(async (ref: string, value: string) => {
    setSavingGender(prev => new Set(prev).add(ref));
    try {
      const r = await adminFetch(`/api/registrations?ref=${encodeURIComponent(ref)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: value }),
      });
      const d = await r.json() as { updated?: boolean; gender?: string | null; error?: string };
      if (!r.ok || !d.updated) throw new Error(d.error || `Server error ${r.status}`);
      setRegs(prev => prev.map(x => (x.ref === ref ? { ...x, gender: d.gender ?? null } : x)));
    } catch (e) {
      alert('Could not save gender: ' + String(e));
    } finally {
      setSavingGender(prev => { const n = new Set(prev); n.delete(ref); return n; });
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
            {filtered.length !== regs.length ? `${filtered.length} shown · ` : ''}{regs.length} total
            {updatedAt && <> · Updated {updatedAt.toLocaleTimeString('en-IN')}</>}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <EventFilter events={events} value={eventSlug} onChange={(s) => { setEventSlug(s); load(s); }} />
          <button onClick={() => downloadCSV(regs)} className="btn-ghost text-sm">⤓ Export CSV</button>
          <button onClick={() => load()} className="btn-ghost text-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Gender head-count */}
      <div className="flex gap-3 flex-wrap">
        <CountBox label="Male" value={genderCounts.male} tone="sky" />
        <CountBox label="Female" value={genderCounts.female} tone="rose" />
        {genderCounts.unknown > 0 && (
          <CountBox label="Not recorded" value={genderCounts.unknown} tone="stone" />
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email, ref…"
            className="input pl-9"
          />
        </div>
        <Select
          value={gender}
          onChange={v => setGender(v as GenderFilter)}
          className="w-auto"
          ariaLabel="Filter by gender"
          options={[
            { value: 'all', label: 'All genders' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            ...(genderCounts.unknown > 0 ? [{ value: 'unknown' as const, label: 'Not recorded' }] : []),
          ]}
        />
        <div className="chip-bar">
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
              className={`chip ${filter === tab.key ? 'chip-on' : 'chip-off'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards (phones) */}
      <div className="card-list">
        {filtered.map(r => (
          <RegCard
            key={r.ref}
            r={r}
            busy={verifying.has(r.ref)}
            deleting={deleting.has(r.ref)}
            savingGender={savingGender.has(r.ref)}
            onSetGender={setGenderFor}
            onApprove={() => doVerify(r.ref, 'approve', '')}
            onReject={() => openRejectModal(r.ref, r.name)}
            onDelete={() => deleteReg(r.ref, r.name)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="row-card text-center text-stone-400 py-10">
            {search || filter !== 'all' || gender !== 'all' ? 'No results match your filter.' : 'No registrations yet.'}
          </div>
        )}
        {filtered.length > 0 && (
          <p className="text-xs text-stone-400 px-1">Showing {filtered.length} of {regs.length} registrations</p>
        )}
      </div>

      {/* Table (tablet and up) */}
      <div className="table-wrap hidden md:block">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th whitespace-nowrap">Date</th>
                <th className="th">Ref</th>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">Email</th>
                <th className="th">College</th>
                <th className="th">Course · Year</th>
                <th className="th">Age</th>
                <th className="th">Gender</th>
                <th className="th">Pass</th>
                <th className="th">Qty</th>
                <th className="th">Total</th>
                <th className="th">Payment</th>
                <th className="th">Student ID</th>
                <th className="th">Verify</th>
                <th className="th">WhatsApp</th>
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
                    <td className="td text-stone-600 whitespace-nowrap max-w-[220px] truncate" title={r.college || ''}>
                      {r.college || <span className="opacity-30">—</span>}
                    </td>
                    <td className="td text-stone-600 whitespace-nowrap">
                      {[r.course, r.year_of_study].filter(Boolean).join(' · ') || <span className="opacity-30">—</span>}
                    </td>
                    <td className="td text-stone-600 font-mono text-xs">{r.age ?? '—'}</td>
                    <td className="td">
                      <GenderCell r={r} saving={savingGender.has(r.ref)} onSet={setGenderFor} />
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
                      <WaBadge r={r} />
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
                  <td colSpan={17} className="px-4 py-14 text-center text-stone-400">
                    {search || filter !== 'all' || gender !== 'all' ? 'No results match your filter.' : 'No registrations yet.'}
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
            <Select
              value={rejectReason}
              onChange={setRejectReason}
              className="mb-3"
              options={REJECT_REASONS.map(r => ({ value: r, label: r }))}
              ariaLabel="Reject reason"
            />

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

/**
 * Delivery state of the WhatsApp confirmation, as a compact badge + tooltip.
 * The tooltip carries the failure reason so a retry can be targeted instead of
 * blanketing everyone.
 */
function WaBadge({ r }: { r: Registration }) {
  const s = getWhatsappStatus(r);
  if (s === 'none') return <span className="text-stone-300 text-xs">—</span>;
  const base = 'inline-flex items-center gap-1 whitespace-nowrap';
  if (s === 'delivered') return <span className={`${base} pill-green`} title={`WhatsApp delivered ${r.whatsapp_delivered_at ? '· ' + fmtDate(r.whatsapp_delivered_at) : ''}`}>📲 Delivered</span>;
  if (s === 'read') return <span className={`${base} pill-violet`} title={`WhatsApp read ${r.whatsapp_read_at ? '· ' + fmtDate(r.whatsapp_read_at) : ''}`}>📲 Read</span>;
  if (s === 'failed') return <span className={`${base} pill-red`} title={r.whatsapp_failure_reason ? `Failed: ${r.whatsapp_failure_reason}` : 'Failed to deliver'}>📲 Failed</span>;
  return <span className={`${base} pill-amber`} title="Sent to WhatsApp — awaiting delivery confirmation">📲 Sent</span>;
}

/**
 * Gender shown as a tag, and editable in place.
 *
 * The 15 bookings taken before the form had the field show "Set…" — one tap
 * records it. The placeholder is never a real option (so picking it can't ever
 * clear an existing gender), and the only values on the wire are the three the
 * API accepts.
 */
function GenderCell({
  r, saving, onSet,
}: {
  r: Registration;
  saving: boolean;
  onSet: (ref: string, value: string) => void;
}) {
  const current = String(r.gender || '').toLowerCase();
  const known = current === 'male' || current === 'female' || current === 'other';
  return (
    <div className="inline-flex items-center gap-1.5">
      {known && <GenderTag gender={r.gender} />}
      <Select
        size="sm"
        className="w-auto"
        value={known ? current : ''}
        disabled={saving}
        onChange={v => onSet(r.ref, v)}
        options={GENDER_SET_OPTIONS}
        placeholder={saving ? 'Saving…' : known ? 'edit' : 'Set…'}
        ariaLabel={`Gender for ${r.name}`}
        title={known ? 'Change gender' : 'Not recorded — set it'}
        tone={known ? 'muted' : 'gold'}
      />
    </div>
  );
}

function GenderTag({ gender }: { gender?: string | null }) {
  const label = genderLabel(gender);
  if (!label) return <span className="text-stone-300 text-xs">—</span>;
  const cls = label === 'Female'
    ? 'bg-rose-50 text-rose-700 ring-rose-100'
    : 'bg-sky-50 text-sky-700 ring-sky-100';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ring-1 ${cls}`}>
      {label}
    </span>
  );
}

function CountBox({ label, value, tone }: { label: string; value: number; tone: 'sky' | 'rose' | 'stone' }) {
  const cls = {
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    stone: 'bg-stone-50 border-stone-200 text-stone-600',
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-2.5 flex-1 min-w-[110px] ${cls}`}>
      <div className="text-xl font-extrabold leading-none">{value}</div>
      <div className="text-[11px] font-medium mt-1 opacity-80">{label}</div>
    </div>
  );
}

/* One registration as a card — the phone view of a table row. */
function RegCard({
  r, busy, deleting, savingGender, onSetGender, onApprove, onReject, onDelete,
}: {
  r: Registration;
  busy: boolean;
  deleting: boolean;
  savingGender: boolean;
  onSetGender: (ref: string, value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const sts = getStudentStatus(r);
  const qty = [
    r.qty_general > 0 ? `General × ${r.qty_general}` : '',
    r.qty_student > 0 ? `Student × ${r.qty_student}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className="row-card">
      <div className="row-card-head">
        <div className="min-w-0">
          <div className="font-bold text-stone-900 truncate">{r.name}</div>
          <div className="text-xs font-mono text-stone-400 mt-0.5">{r.ref} · {fmtDate(r.created_at)}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-extrabold text-stone-900">{inr(r.total)}</div>
          <div className="mt-1"><PayBadge status={r.payment_status} /></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <GenderCell r={r} saving={savingGender} onSet={onSetGender} />
        <span className={r.pass_type === 'student' ? 'pill-amber' : 'pill-violet'}>{r.pass_type}</span>
        {sts === 'verified' && <span className="pill-green">✓ Verified</span>}
        {sts === 'rejected' && <span className="pill-red" title={getRejectionReason(r)}>✗ Rejected</span>}
        {sts === 'pending' && <span className="pill-gray">⏳ ID to verify</span>}
        <WaBadge r={r} />
      </div>

      <div className="row-kv">
        <span className="row-k">Phone</span>
        <span className="row-v"><a href={`tel:${r.phone}`} className="text-amber-700">{r.phone}</a></span>

        {r.email && (<>
          <span className="row-k">Email</span>
          <span className="row-v"><a href={`mailto:${r.email}`} className="text-amber-700 break-all">{r.email}</a></span>
        </>)}

        <span className="row-k">College</span>
        <span className="row-v">{r.college || '—'}</span>

        {(r.course || r.year_of_study) && (<>
          <span className="row-k">Course</span>
          <span className="row-v">{[r.course, r.year_of_study].filter(Boolean).join(' · ')}</span>
        </>)}

        <span className="row-k">Age</span>
        <span className="row-v">{r.age ?? '—'}</span>

        {qty && (<>
          <span className="row-k">Qty</span>
          <span className="row-v">{qty}</span>
        </>)}

        {r.payment_id && (<>
          <span className="row-k">Pay ID</span>
          <span className="row-v font-mono text-xs break-all">{r.payment_id}</span>
        </>)}
      </div>

      <div className="row-actions">
        {r.id_card_url && (
          <a href={r.id_card_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">View ID ↗</a>
        )}
        {sts === 'pending' && (
          <>
            <button onClick={onApprove} disabled={busy} className="btn-ghost btn-sm text-emerald-700">
              {busy ? '…' : '✓ Approve'}
            </button>
            <button onClick={onReject} disabled={busy} className="btn-ghost btn-sm text-red-600">✗ Reject</button>
          </>
        )}
        <button onClick={onDelete} disabled={deleting} className="btn-ghost btn-sm text-red-500 ml-auto">
          {deleting ? '…' : '🗑 Delete'}
        </button>
      </div>
    </div>
  );
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