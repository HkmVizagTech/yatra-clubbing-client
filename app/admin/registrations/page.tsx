'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Registration } from '@/lib/types';
import { inr, fmtDate, getStudentStatus, getRejectionReason, downloadCSV, genderLabel, getWhatsappStatus, isWhatsappConfirmed } from '@/lib/utils';
import { adminFetch } from '@/lib/api';
import { useEvents } from '../components/useEvents';
import TripTabs, { latestTripCode } from '../components/TripTabs';
import Select from '../../components/Select';
import { useAdmin } from '../AdminContext';

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

type Filter = 'all' | 'paid' | 'pending' | 'verify' | 'returning';
type Audience = 'all' | 'students' | 'working';
type GenderFilter = 'all' | 'male' | 'female' | 'unknown';

export default function RegistrationsPage() {
  const { can } = useAdmin();
  const canVerify = can('students:verify');
  const canWrite = can('registrations:write');
  const canMoney = can('dashboard:revenue');
  const [audience, setAudience] = useState<Audience>('all');
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
  const [sending, setSending] = useState<Set<string>>(new Set());
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
      // Open on the latest trip only; "All trips" is one tap away.
      const initial = latestTripCode(events) ?? 'all';
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
      if (audience === 'students' && r.qty_student <= 0) return false;
      if (audience === 'working' && r.qty_student > 0) return false;
      if (filter === 'paid') return r.payment_status === 'paid';
      if (filter === 'pending') return r.payment_status !== 'paid';
      if (filter === 'verify') return getStudentStatus(r) === 'pending';
      if (filter === 'returning') return !!r.returning_attendee;
      return true;
    });
  }, [regs, search, filter, gender, audience]);

  const tripName = useMemo(() => new Map(events.map(e => [e.code, e.name])), [events]);
  // Student / working filters only make sense when the trip has BOTH kinds of people.
  const scopeTrip = events.find(e => e.code === eventSlug) || null;
  const audiences = useMemo(() => {
    const tix = scopeTrip ? (scopeTrip.tickets || []) : events.flatMap(e => e.tickets || []);
    return {
      students: tix.some(t => t.requiresStudentId) || regs.some(r => r.qty_student > 0),
      working: tix.some(t => !t.requiresStudentId) || regs.some(r => r.qty_student <= 0),
    };
  }, [scopeTrip, events, regs]);
  const showAudience = audiences.students && audiences.working;
  useEffect(() => { if (!showAudience && audience !== 'all') setAudience('all'); }, [showAudience, audience]);
  useEffect(() => { if (!audiences.students && filter === 'verify') setFilter('all'); }, [audiences.students, filter]);

  const counts = useMemo(() => ({
    total: regs.length,
    paid: regs.filter(r => r.payment_status === 'paid').length,
    students: regs.filter(r => r.qty_student > 0).length,
    working: regs.filter(r => r.qty_student <= 0).length,
    returning: regs.filter(r => r.returning_attendee).length,
  }), [regs]);

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

  // Send (or re-send) the WhatsApp booking confirmation to one devotee.
  // "resend: true" is deliberate on purpose — it messages someone a second time
  // even if they were already confirmed.
  async function resendWhatsApp(ref: string, name: string) {
    if (!confirm(`Send the WhatsApp confirmation to "${name}" (${ref})? This sends a real message.`)) return;
    setSending(prev => new Set(prev).add(ref));
    try {
      const evt = eventSlug && eventSlug !== 'all' ? eventSlug : regs.find(x => x.ref === ref)?.event_code || '';
      const r = await adminFetch('/api/admin/send-confirmations?event_code=' + encodeURIComponent(evt), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, refs: [ref], resend: true }),
      });
      const d = await r.json() as { sent?: number; error?: string; results?: { ref?: string }[] };
      if (!r.ok) throw new Error(d.error || `Server error ${r.status}`);
      const sent = (d.results && d.results[0]?.ref === ref && d.sent === 1);
      alert(sent
        ? `Confirmation sent to ${name}.`
        : `Message could not be sent (${d.sent === 0 ? 'see server log' : 'unknown reason'}).`);
      // Refresh so the WhatsApp badge reflects the new send.
      await load();
    } catch (e) {
      alert('Could not send confirmation: ' + String(e));
    } finally {
      setSending(prev => { const n = new Set(prev); n.delete(ref); return n; });
    }
  }

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

  const switchTrip = (code: string) => { setEventSlug(code); load(code); };
  const actions = (r: Registration) => ({
    busy: verifying.has(r.ref), deleting: deleting.has(r.ref), sending: sending.has(r.ref), savingGender: savingGender.has(r.ref),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrations</h1>
          <p className="page-subtitle">
            {filtered.length !== regs.length ? `${filtered.length} shown · ` : ''}{regs.length} total
            {updatedAt && <> · updated {updatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</>}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={() => downloadCSV(filtered)} className="btn-ghost text-sm">⤓ Export CSV</button>
          <button onClick={() => load()} className="btn-ghost text-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Trip tabs: current trips as buttons, ended ones in a dropdown */}
      {events.length > 0 && (
        <TripTabs events={events} value={eventSlug} onChange={switchTrip} />
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Tile label="Registrations" value={counts.total} />
        <Tile label="Paid" value={counts.paid} tone="green" />
        {showAudience && <Tile label="Students" value={counts.students} tone="violet" />}
        {showAudience && <Tile label="Working" value={counts.working} tone="amber" />}
        {audiences.students && <Tile label="IDs to verify" value={pendingCount} tone={pendingCount > 0 ? 'alert' : undefined} onClick={pendingCount > 0 ? () => setFilter('verify') : undefined} />}
        <Tile label="Male / Female" value={`${genderCounts.male} / ${genderCounts.female}`} />
      </div>

      {/* Filters */}
      <div className="panel !p-3 sm:!p-4 space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px] sm:max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" aria-hidden="true">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, email, ref, college…"
              className="input pl-9"
              aria-label="Search registrations"
            />
          </div>
          {showAudience && (
          <div className="seg" role="group" aria-label="Who">
            {([['all', 'Everyone'], ['students', '🎓 Students'], ['working', '💼 Working']] as [Audience, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setAudience(k)} className={`seg-btn ${audience === k ? 'seg-on' : ''}`}>{label}</button>
            ))}
          </div>
          )}
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
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            ['all', 'All'],
            ['paid', 'Paid'],
            ['pending', 'Unpaid'],
            ...(audiences.students ? [['verify', `To verify (${pendingCount})`]] : []),
            ...(counts.returning > 0 ? [['returning', `📋 In Excel list (${counts.returning})`]] : []),
          ] as [Filter, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={`chip ${filter === k ? 'chip-on' : 'chip-off'}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Cards (everything below 1500px wide) */}
      <div className="min-[1500px]:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(r => (
          <RegCard
            key={r.ref}
            r={r}
            trip={tripName.get(r.event_code)}
            {...actions(r)}
            showAudience={showAudience}
            canMoney={canMoney}
            canVerify={canVerify}
            canWrite={canWrite}
            onSetGender={setGenderFor}
            onApprove={() => doVerify(r.ref, 'approve', '')}
            onReject={() => openRejectModal(r.ref, r.name)}
            onDelete={() => deleteReg(r.ref, r.name)}
            onResendWhatsApp={() => resendWhatsApp(r.ref, r.name)}
          />
        ))}
        {filtered.length === 0 && <EmptyRows filtered={!!(search || filter !== 'all' || gender !== 'all' || audience !== 'all')} />}
      </div>

      {/* Table (desktop) */}
      <div className="hidden min-[1500px]:block rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                <th className="text-left font-semibold px-5 py-3">Person</th>
                <th className="text-left font-semibold px-3 py-3">Booking</th>
                <th className="text-left font-semibold px-3 py-3">For</th>
                <th className="text-left font-semibold px-3 py-3">Payment</th>
                <th className="text-left font-semibold px-3 py-3">Student ID</th>
                <th className="text-right font-semibold px-5 py-3">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(r => {
                const sts = getStudentStatus(r);
                const a = actions(r);
                const student = r.qty_student > 0;
                const detail = student
                  ? [r.course, r.year_of_study].filter(Boolean).join(' · ')
                  : '';
                return (
                  <tr key={r.ref} className="align-top hover:bg-amber-50/30 transition-colors">
                    {/* Person */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3 min-w-[230px]">
                        <Avatar name={r.name} student={student} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-stone-900">{r.name}</span>
                            {r.returning_attendee && <span className="pill-green" title="Their number is in the Excel sheet: special price, no student ID needed">📋 In Excel list</span>}
                          </div>
                          <a href={`tel:${r.phone}`} className="block text-stone-600 hover:text-amber-700 tabular-nums">{r.phone}</a>
                          {r.email && <a href={`mailto:${r.email}`} className="block text-xs text-stone-400 hover:text-amber-700 truncate max-w-[220px]">{r.email}</a>}
                        </div>
                      </div>
                    </td>

                    {/* Booking */}
                    <td className="px-3 py-4">
                      <div className="font-mono text-xs font-bold text-stone-800 whitespace-nowrap">{r.ref}</div>
                      <div className="text-xs text-stone-400 mt-0.5 whitespace-nowrap">{fmtDate(r.created_at)}</div>
                      {tripName.get(r.event_code) && <div className="mt-1.5 inline-block max-w-[150px] truncate rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600" title={tripName.get(r.event_code)}>{tripName.get(r.event_code)}</div>}
                    </td>

                    {/* For */}
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {showAudience && (student ? <span className="pill-violet">🎓 Student</span> : <span className="pill-amber">💼 Working</span>)}
                        <GenderCell r={r} saving={a.savingGender} onSet={setGenderFor} />
                      </div>
                      <div className="mt-1.5 text-xs text-stone-600 max-w-[230px]">
                        {student ? (
                          <>
                            <div className="truncate" title={r.college || ''}>{r.college || '—'}</div>
                            {(detail || r.age) && <div className="text-stone-400">{[detail, r.age ? `Age ${r.age}` : ''].filter(Boolean).join(' · ')}</div>}
                          </>
                        ) : (
                          <>
                            {r.organisation && <div className="truncate" title={r.organisation}>{r.organisation}</div>}
                            {r.age ? <div className="text-stone-400">Age {r.age}</div> : null}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Payment */}
                    <td className="px-3 py-4 whitespace-nowrap">
                      <PayBadge status={r.payment_status} />
                      {canMoney && r.total !== undefined && <div className="mt-1.5 font-extrabold text-stone-900">{inr(r.total)}</div>}
                      {canMoney && r.payment_id && <div className="text-[10px] text-stone-400 font-mono mt-0.5 max-w-[110px] truncate" title={r.payment_id}>{r.payment_id}</div>}
                    </td>

                    {/* ID check */}
                    <td className="px-3 py-4">
                      {student && r.id_waived ? (
                        <div>
                          <span className="pill-green">📋 In Excel list</span>
                          <div className="text-[11px] text-stone-500 mt-1.5 leading-snug">Student ID not needed</div>
                        </div>
                      ) : student ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {sts === 'verified' && <span className="pill-green">✓ Verified</span>}
                            {sts === 'rejected' && <span className="pill-red cursor-default" title={getRejectionReason(r)}>✗ Rejected</span>}
                            {sts === 'pending' && <span className="pill-amber">⏳ To verify</span>}
                            {r.id_card_url
                              ? <a href={r.id_card_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber-700 hover:underline">View ID ↗</a>
                              : <span className="text-xs text-stone-400">No ID</span>}
                          </div>
                          {sts === 'pending' && canVerify && (
                            <div className="flex gap-1.5">
                              <button onClick={() => doVerify(r.ref, 'approve', '')} disabled={a.busy} className="btn-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg disabled:opacity-40 transition-colors">{a.busy ? '…' : '✓ Approve'}</button>
                              <button onClick={() => openRejectModal(r.ref, r.name)} disabled={a.busy} className="btn-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 rounded-lg disabled:opacity-40 transition-colors">✗ Reject</button>
                            </div>
                          )}
                        </div>
                      ) : <span className="text-stone-300 text-xs">Not needed</span>}
                    </td>

                    {/* WhatsApp + delete */}
                    <td className="px-5 py-4">
                      <div className="flex items-start justify-end gap-2">
                        <div className="text-right">
                          <WaBadge r={r} />
                          {canWrite && (
                            <button
                              onClick={() => resendWhatsApp(r.ref, r.name)}
                              disabled={a.sending}
                              title="Re-send the WhatsApp booking confirmation"
                              className="block ml-auto mt-1.5 text-[11px] font-semibold text-amber-700 hover:underline disabled:opacity-40"
                            >
                              {a.sending ? 'Sending…' : '📲 Resend'}
                            </button>
                          )}
                        </div>
                        {canWrite && (
                          <button onClick={() => deleteReg(r.ref, r.name)} disabled={a.deleting} title="Delete this registration" className="icon-btn text-stone-400 hover:text-red-600 hover:bg-red-50">
                            {a.deleting ? '…' : '🗑'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-16"><EmptyRows filtered={!!(search || filter !== 'all' || gender !== 'all' || audience !== 'all')} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/60 text-xs text-stone-500">
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

function Avatar({ name, student }: { name: string; student: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${student ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-800'}`}
    >
      {(name || '?').trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

function Tile({ label, value, tone, onClick }: { label: string; value: number | string; tone?: 'green' | 'violet' | 'amber' | 'alert'; onClick?: () => void }) {
  const accent = tone === 'green' ? 'text-emerald-700' : tone === 'violet' ? 'text-violet-700' : tone === 'amber' ? 'text-amber-700' : tone === 'alert' ? 'text-amber-600' : 'text-stone-900';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border bg-white px-4 py-3 text-left ${tone === 'alert' ? 'border-amber-300 ring-2 ring-amber-200/50' : 'border-stone-200'} ${onClick ? 'hover:shadow-md transition cursor-pointer' : ''}`}
    >
      <div className={`text-2xl font-extrabold leading-none ${accent}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mt-1.5">{label}</div>
    </Tag>
  );
}

function EmptyRows({ filtered }: { filtered: boolean }) {
  return (
    <div className="col-span-full text-center py-10">
      <div className="text-3xl mb-2" aria-hidden="true">{filtered ? '🔎' : '🗒️'}</div>
      <p className="font-semibold text-stone-700">{filtered ? 'No registrations match these filters' : 'No registrations yet'}</p>
      <p className="text-sm text-stone-400 mt-1">{filtered ? 'Try clearing the search or switching the filters.' : 'New bookings will show up here as they come in.'}</p>
    </div>
  );
}

/* One registration as a card — phones and tablets. */
function RegCard({
  r, trip, busy, deleting, sending, savingGender, onSetGender, onApprove, onReject, onDelete, onResendWhatsApp, showAudience, canMoney, canVerify, canWrite,
}: {
  r: Registration;
  trip?: string;
  busy: boolean;
  deleting: boolean;
  sending: boolean;
  savingGender: boolean;
  onSetGender: (ref: string, value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onResendWhatsApp: () => void;
  showAudience: boolean;
  canMoney: boolean;
  canVerify: boolean;
  canWrite: boolean;
}) {
  const sts = getStudentStatus(r);
  const student = r.qty_student > 0;
  const lines = student
    ? [r.college, [r.course, r.year_of_study].filter(Boolean).join(' · ')].filter(Boolean)
    : [r.organisation].filter(Boolean);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar name={r.name} student={student} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-stone-900 break-words">{r.name}</div>
          <div className="text-xs font-mono text-stone-400 mt-0.5">{r.ref} · {fmtDate(r.created_at)}</div>
        </div>
        <div className="text-right shrink-0">
          {canMoney && r.total !== undefined && <div className="font-extrabold text-stone-900">{inr(r.total)}</div>}
          <div className={canMoney && r.total !== undefined ? 'mt-1' : ''}><PayBadge status={r.payment_status} /></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {showAudience && (student ? <span className="pill-violet">🎓 Student</span> : <span className="pill-amber">💼 Working</span>)}
        {r.returning_attendee && <span className="pill-green" title="Their number is in the Excel sheet: special price, no student ID needed">📋 In Excel list</span>}
        <GenderCell r={r} saving={savingGender} onSet={onSetGender} />
        {trip && <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 max-w-[10rem] truncate">{trip}</span>}
      </div>

      <div className="text-sm space-y-0.5">
        <a href={`tel:${r.phone}`} className="text-amber-700 font-medium tabular-nums">{r.phone}</a>
        {r.email && <a href={`mailto:${r.email}`} className="block text-xs text-stone-500 truncate">{r.email}</a>}
        {lines.map((l, i) => <div key={i} className={i === 0 ? 'text-stone-700' : 'text-xs text-stone-400'}>{l}</div>)}
        {r.age ? <div className="text-xs text-stone-400">Age {r.age}</div> : null}
      </div>

      {student && r.id_waived && (
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800">
          📋 In the Excel list · student ID not needed
        </div>
      )}
      {student && !r.id_waived && (
        <div className="rounded-xl bg-stone-50 px-3 py-2.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-500">Student ID</span>
          {sts === 'verified' && <span className="pill-green">✓ Verified</span>}
          {sts === 'rejected' && <span className="pill-red" title={getRejectionReason(r)}>✗ Rejected</span>}
          {sts === 'pending' && <span className="pill-amber">⏳ To verify</span>}
          {r.id_card_url
            ? <a href={r.id_card_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber-700 hover:underline">View ID ↗</a>
            : <span className="text-xs text-stone-400">No ID</span>}
          {sts === 'pending' && canVerify && (
            <span className="ml-auto flex gap-1.5">
              <button onClick={onApprove} disabled={busy} className="btn-sm font-bold bg-emerald-50 text-emerald-700 rounded-lg disabled:opacity-40">{busy ? '…' : '✓ Approve'}</button>
              <button onClick={onReject} disabled={busy} className="btn-sm font-bold bg-red-50 text-red-700 rounded-lg disabled:opacity-40">✗ Reject</button>
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100">
        <WaBadge r={r} />
        {canWrite && (
          <button onClick={onResendWhatsApp} disabled={sending} className="text-xs font-semibold text-amber-700 hover:underline disabled:opacity-40">
            {sending ? 'Sending…' : '📲 Resend'}
          </button>
        )}
        {canWrite && (
          <button onClick={onDelete} disabled={deleting} className="ml-auto text-xs font-semibold text-red-500 hover:underline disabled:opacity-40">
            {deleting ? '…' : 'Delete'}
          </button>
        )}
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