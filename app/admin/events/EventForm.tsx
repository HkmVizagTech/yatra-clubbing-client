'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/api';
import type { Event, EventStatus, EventTicketTier, EventTimelineItem } from '@/lib/eventTypes';

type FormState = {
  code: string;
  name: string;
  tagline: string;
  org: string;
  ageLimit: string;
  locations: string[];
  description: string;
  venue: string;
  dates: { display: string; start?: string; end?: string };
  timeline: EventTimelineItem[];
  tickets: EventTicketTier[];
  branding: { heroDesktop: string; heroMobile: string; themeColor: string; showCountdown: boolean; mantra: string };
  payments: { receiptPrefix: string; whatsapp: { booking: string; studentApproved: string; studentRejected: string } };
  status: EventStatus;
};

const DEFAULTS = {
  receiptPrefix: 'YC-',
  bookingTemplate: 'yatra_booking_confirmation',
  studentApprovedTemplate: 'student_id_approved',
  studentRejectedTemplate: 'student_id_rejected',
  themeColor: '#E07B00',
};

// Where the public site lives, for showing the event's real URL as it's typed.
const SITE_ORIGIN =
  (typeof window !== 'undefined' ? window.location.origin : '') || 'https://yatraclubbing.com';

// ── Date & time helpers ──────────────────────────────────────────────────────
// Everything here is written by hand rather than via toLocaleString so the
// output is identical on the server and in every browser locale.
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-07-11T07:00:00" → { date: "2026-07-11", time: "07:00" } */
function isoParts(iso?: string): { date: string; time: string } {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(iso || '');
  return { date: m?.[1] || '', time: m?.[2] || '' };
}

/** Date + time inputs → the ISO string the API stores. */
function joinIso(date: string, time: string): string {
  if (!date) return '';
  return `${date}T${time || '00:00'}:00`;
}

/** "2026-07-11…" → "Sat, 11 Jul" */
function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const day = new Date(y, mo - 1, d).getDay();
  return `${DAY_NAMES[day]}, ${d} ${MONTH_NAMES[mo - 1]}`;
}

/** "…T07:00:00" → "7:00 AM" */
function prettyTime(iso: string): string {
  const m = /[T ](\d{2}):(\d{2})/.exec(iso || '');
  if (!m) return '';
  return from24(`${m[1]}:${m[2]}`);
}

/** "19:30" → "7:30 PM" */
function from24(v: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((v || '').trim());
  if (!m) return '';
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

/** "7:30 PM" → "19:30" (empty when the text isn't a plain time) */
function to24(s: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?$/i.exec((s || '').trim());
  if (!m) return '';
  let h = Number(m[1]);
  const suffix = (m[3] || '').toLowerCase();
  if (suffix.startsWith('p') && h < 12) h += 12;
  if (suffix.startsWith('a') && h === 12) h = 0;
  if (h > 23) return '';
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** The human date shown on the site, derived from the picked date and times. */
function buildDisplay(start: string, end: string): string {
  if (!start) return '';
  const startDay = prettyDate(start);
  const startTime = prettyTime(start);
  const head = startTime ? `${startDay} · ${startTime}` : startDay;
  if (!end) return head;
  const sameDay = start.slice(0, 10) === end.slice(0, 10);
  if (sameDay) {
    const endTime = prettyTime(end);
    return endTime ? `${head} – ${endTime}` : head;
  }
  return `${startDay} – ${prettyDate(end)}`;
}

// ── Ticket presets ───────────────────────────────────────────────────────────
// Starting from a preset means the key, quantity cap and student-ID rule are
// right by construction — those three drive the booking flow.
type Preset = { label: string; emoji: string; tier: Omit<EventTicketTier, 'price' | 'was'> };
const TICKET_PRESETS: Preset[] = [
  {
    label: 'General', emoji: '🎟️',
    tier: { key: 'general', name: 'General', maxQty: 20, description: 'Open to everyone', requiresStudentId: false, features: ['Full yatra access', 'Lunch feast'] },
  },
  {
    label: 'Student', emoji: '🎓',
    tier: { key: 'student', name: 'Student', maxQty: 1, description: 'Valid college ID required', requiresStudentId: true, features: ['Full yatra access', 'Lunch feast'] },
  },
  {
    label: 'VIP', emoji: '⭐',
    tier: { key: 'vip', name: 'VIP', maxQty: 10, description: 'Front rows and priority seating', requiresStudentId: false, features: ['Priority seating', 'Full yatra access', 'Lunch feast'], tag: 'Most loved' },
  },
  {
    label: 'Couple', emoji: '💑',
    tier: { key: 'couple', name: 'Couple', maxQty: 10, description: 'Two passes, one booking', requiresStudentId: false, features: ['2 passes', 'Full yatra access', 'Lunch feast'] },
  },
  {
    label: 'Group', emoji: '👥',
    tier: { key: 'group', name: 'Group', maxQty: 20, description: 'For families and friend groups', requiresStudentId: false, features: ['Full yatra access', 'Lunch feast'] },
  },
];

function toKey(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function fromEvent(e?: Event): FormState {
  if (!e) {
    return {
      code: '',
      name: '',
      tagline: '',
      org: '',
      ageLimit: '16–30',
      locations: [],
      description: '',
      venue: '',
      dates: { display: '', start: undefined, end: undefined },
      timeline: [],
      tickets: [],
      branding: { heroDesktop: '', heroMobile: '', themeColor: DEFAULTS.themeColor, showCountdown: false, mantra: '' },
      payments: {
        receiptPrefix: DEFAULTS.receiptPrefix,
        whatsapp: {
          booking: DEFAULTS.bookingTemplate,
          studentApproved: DEFAULTS.studentApprovedTemplate,
          studentRejected: DEFAULTS.studentRejectedTemplate,
        },
      },
      status: 'draft',
    };
  }
  return {
    code: e.code,
    name: e.name,
    tagline: e.tagline,
    org: e.org,
    ageLimit: e.ageLimit || '16–30',
    locations: Array.isArray(e.locations) ? [...e.locations] : [],
    description: e.description,
    venue: e.venue,
    dates: { display: e.dates.display, start: e.dates.start, end: e.dates.end },
    timeline: e.timeline.map(t => ({ ...t })),
    tickets: e.tickets.map(t => ({ ...t, features: [...(t.features || [])] })),
    branding: {
      heroDesktop: e.branding.heroDesktop || '',
      heroMobile: e.branding.heroMobile || '',
      themeColor: e.branding.themeColor || DEFAULTS.themeColor,
      showCountdown: !!e.branding.showCountdown,
      mantra: e.branding.mantra || '',
    },
    payments: {
      receiptPrefix: e.payments.receiptPrefix || DEFAULTS.receiptPrefix,
      whatsapp: {
        booking: e.payments.whatsapp.booking || DEFAULTS.bookingTemplate,
        studentApproved: e.payments.whatsapp.studentApproved || DEFAULTS.studentApprovedTemplate,
        studentRejected: e.payments.whatsapp.studentRejected || DEFAULTS.studentRejectedTemplate,
      },
    },
    status: e.status,
  };
}

// Turn "Ramayana Circuit Yatra 2026" into a short code like "RCY26".
function generateCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 3)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(w => w.length > 0)
    .map(w => w[0].toUpperCase())
    .join('');
  const year = (name.match(/\b(20\d{2})\b/) || [])[1];
  return (initials + (year ? year.slice(2) : '')).slice(0, 6) || '';
}

type CodeCheck =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok' }
  | { state: 'bad'; message: string };

export default function EventForm({ mode, slug, initial }: { mode: 'new' | 'edit'; slug?: string; initial?: Event }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => fromEvent(initial));
  const [codeTouched, setCodeTouched] = useState(mode === 'edit');
  const [codeCheck, setCodeCheck] = useState<CodeCheck>({ state: 'idle' });
  // Once someone writes their own display date, stop overwriting it from the picker.
  const [displayTouched, setDisplayTouched] = useState(() => Boolean(initial?.dates?.display));
  const [multiDay, setMultiDay] = useState(() => {
    const s = isoParts(initial?.dates?.start).date;
    const e = isoParts(initial?.dates?.end).date;
    return Boolean(s && e && s !== e);
  });
  const [descPreview, setDescPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The code the event is stored under right now — the identifier the PUT must
  // use, which is NOT form.code once someone edits the code field.
  const originalCode = mode === 'edit' ? (initial?.code || slug || '') : '';

  const start = isoParts(form.dates.start);
  const end = isoParts(form.dates.end);

  // Ask the API whether this code is free, debounced while typing. Without this
  // you only find out a code is taken after filling in the whole form.
  useEffect(() => {
    const code = form.code.trim();
    if (!code) { setCodeCheck({ state: 'idle' }); return; }
    if (mode === 'edit' && code === originalCode) { setCodeCheck({ state: 'ok' }); return; }

    let cancelled = false;
    setCodeCheck({ state: 'checking' });
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ code });
        if (initial?._id && mode === 'edit') qs.set('except', initial._id);
        const r = await adminFetch(`/api/events/check-code?${qs.toString()}`);
        const d = await r.json() as { available?: boolean; error?: string };
        if (cancelled) return;
        setCodeCheck(d.available ? { state: 'ok' } : { state: 'bad', message: d.error || 'That code is taken.' });
      } catch {
        if (!cancelled) setCodeCheck({ state: 'idle' }); // never block saving on a failed check
      }
    }, 400);

    return () => { cancelled = true; clearTimeout(t); };
  }, [form.code, mode, originalCode, initial?._id]);

  function update(patch: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  function onNameChange(val: string) {
    if (!codeTouched) {
      update({ name: val, code: generateCode(val) });
    } else {
      update({ name: val });
    }
  }

  // ── Dates ──
  // Writing any part of the schedule rebuilds the ISO values and, unless it has
  // been edited by hand, the display date shown on the site.
  function setSchedule(next: { startDate?: string; startTime?: string; endDate?: string; endTime?: string }) {
    setForm(prev => {
      const s = isoParts(prev.dates.start);
      const e = isoParts(prev.dates.end);
      const startDate = next.startDate ?? s.date;
      const startTime = next.startTime ?? s.time;
      const endDate = next.endDate ?? (multiDay ? e.date : startDate);
      const endTime = next.endTime ?? e.time;

      const startIso = joinIso(startDate, startTime);
      // An end only means something once there is a start and an end time/date.
      const endIso = endDate && (endTime || endDate !== startDate) ? joinIso(endDate, endTime) : '';

      return {
        ...prev,
        dates: {
          display: displayTouched ? prev.dates.display : buildDisplay(startIso, endIso),
          start: startIso || undefined,
          end: endIso || undefined,
        },
      };
    });
  }

  function toggleMultiDay(on: boolean) {
    setMultiDay(on);
    if (!on) setSchedule({ endDate: start.date });
  }

  function setBranding(key: keyof FormState['branding'], val: string | boolean) {
    setForm(prev => ({ ...prev, branding: { ...prev.branding, [key]: val } }));
  }

  function setPayments(key: 'receiptPrefix', val: string) {
    setForm(prev => ({ ...prev, payments: { ...prev.payments, [key]: val } }));
  }

  function setWhatsapp(key: keyof FormState['payments']['whatsapp'], val: string) {
    setForm(prev => ({ ...prev, payments: { ...prev.payments, whatsapp: { ...prev.payments.whatsapp, [key]: val } } }));
  }

  // ── Tickets ──
  function patchTicket(i: number, patch: Partial<EventTicketTier>) {
    setForm(prev => {
      const tickets = [...prev.tickets];
      tickets[i] = { ...tickets[i], ...patch };
      return { ...prev, tickets };
    });
  }

  function addPresetTicket(preset: Preset | null) {
    setForm(prev => {
      const used = new Set(prev.tickets.map(t => t.key));
      const base = preset
        ? { ...preset.tier, features: [...(preset.tier.features || [])], price: 0, was: null }
        : { key: '', name: '', maxQty: 20, description: '', requiresStudentId: false, features: [], price: 0, was: null };

      // Two "General" tiers would otherwise collide on key and break bookings.
      let key = base.key;
      if (key) {
        let n = 2;
        while (used.has(key)) key = `${base.key}-${n++}`;
      }
      return { ...prev, tickets: [...prev.tickets, { ...base, key } as EventTicketTier] };
    });
  }

  function removeTicket(i: number) {
    setForm(prev => ({ ...prev, tickets: prev.tickets.filter((_, j) => j !== i) }));
  }

  function moveTicket(i: number, dir: -1 | 1) {
    setForm(prev => {
      const j = i + dir;
      if (j < 0 || j >= prev.tickets.length) return prev;
      const tickets = [...prev.tickets];
      [tickets[i], tickets[j]] = [tickets[j], tickets[i]];
      return { ...prev, tickets };
    });
  }

  // Duplicate keys silently break the booking modal, which looks tiers up by key.
  const duplicateKeys = useMemo(() => {
    const seen = new Map<string, number>();
    for (const t of form.tickets) seen.set(t.key, (seen.get(t.key) || 0) + 1);
    return [...seen.entries()].filter(([k, n]) => k && n > 1).map(([k]) => k);
  }, [form.tickets]);

  // ── Timeline ──
  function patchTimeline(i: number, patch: Partial<EventTimelineItem>) {
    setForm(prev => {
      const timeline = [...prev.timeline];
      timeline[i] = { ...timeline[i], ...patch };
      return { ...prev, timeline };
    });
  }
  function addTimeline() {
    setForm(prev => ({ ...prev, timeline: [...prev.timeline, { time: '', title: '', description: '' }] }));
  }

  // ── What still blocks this event from going live ──
  const checks = [
    { ok: Boolean(form.name.trim()), label: 'Event name' },
    { ok: Boolean(form.code.trim()) && codeCheck.state !== 'bad', label: 'Public code' },
    { ok: Boolean(form.dates.start), label: 'Date and start time' },
    { ok: Boolean(form.venue.trim()), label: 'Venue' },
    { ok: form.tickets.length > 0, label: 'At least one ticket tier' },
    { ok: form.tickets.every(t => t.name.trim() && t.key.trim()), label: 'Every tier has a name and key' },
    { ok: duplicateKeys.length === 0, label: 'No duplicate ticket keys' },
  ];
  const blockers = checks.filter(c => !c.ok).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Catch the things that make an event unusable, before the round trip.
    if (!form.name.trim()) { setError('Give the event a name.'); return; }
    if (!form.code.trim()) { setError('Set a public code — it becomes the event’s link.'); return; }
    if (codeCheck.state === 'bad') { setError(codeCheck.message); return; }
    if (duplicateKeys.length) {
      setError(`Two ticket tiers share the key "${duplicateKeys[0]}". Keys must be unique — bookings are matched by them.`);
      return;
    }
    if (form.tickets.length === 0 && !confirm(
      'This event has no ticket tiers, so nobody can book it.\n\nSave anyway?'
    )) return;
    if (form.status === 'active' && blockers > 0 && !confirm(
      `This event is set to Active but ${blockers} thing(s) are still missing.\n\nPublish anyway?`
    )) return;

    setSaving(true);
    setError(null);
    try {
      // On edit, address the event by the code it is stored under — form.code
      // may be a new code the user just typed, which would 404.
      const url = mode === 'new'
        ? '/api/events'
        : `/api/events/${encodeURIComponent(originalCode || form.code || '')}`;
      const r = await adminFetch(url, {
        method: mode === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json() as { event?: Event; error?: string };
      if (d.event) {
        router.push('/admin/events');
        router.refresh();
      } else {
        setError(d.error || `Could not save (${r.status})`);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-screen-xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{mode === 'new' ? 'Create event' : 'Edit event'}</h1>
          <p className="page-subtitle">
            {mode === 'new'
              ? 'Fill in the basics — everything else has sensible defaults.'
              : `Live at ${SITE_ORIGIN.replace(/^https?:\/\//, '')}/${originalCode}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.push('/admin/events')} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={saving || codeCheck.state === 'bad'} className="btn-primary text-sm">
            {saving ? 'Saving…' : mode === 'new' ? 'Create event' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basics">
            <Field label="Event name *">
              <input className="input" value={form.name} onChange={e => onNameChange(e.target.value)} placeholder="Ramayana Circuit Yatra" autoFocus />
            </Field>

            {/* The code IS the event's public link, so it gets room to breathe
                and tells you straight away whether it's usable. */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <label className="label" htmlFor="event-code">Public code *</label>
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-start">
                <input
                  id="event-code"
                  className="input font-mono uppercase text-lg tracking-widest text-center"
                  value={form.code}
                  maxLength={12}
                  onFocus={() => setCodeTouched(true)}
                  onChange={e => { setCodeTouched(true); update({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }); }}
                  placeholder="YJ"
                />
                <div className="min-w-0">
                  <div className="text-sm text-stone-700">
                    People will book this event at{' '}
                    <span className="font-mono font-semibold text-amber-800 break-all">
                      {SITE_ORIGIN.replace(/^https?:\/\//, '')}/{form.code || '····'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                    2–12 letters and numbers. Short is better — it goes on posters and WhatsApp.
                    {!codeTouched && form.code ? ' Suggested from the name; tap to change.' : ''}
                  </p>
                  <div className="mt-1.5 text-xs font-medium min-h-[18px]">
                    {codeCheck.state === 'checking' && <span className="text-stone-400">Checking…</span>}
                    {codeCheck.state === 'ok' && <span className="text-emerald-700">✓ Available</span>}
                    {codeCheck.state === 'bad' && <span className="text-red-600">{codeCheck.message}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Status" hint="Several events can be Active at once — the home page lists them all.">
                <select className="select" value={form.status} onChange={e => update({ status: e.target.value as EventStatus })}>
                  <option value="draft">Draft — not on the site</option>
                  <option value="active">Active — listed and bookable</option>
                  <option value="closed">Closed — bookings stopped</option>
                  <option value="cancelled">Cancelled — shows refund notice</option>
                </select>
              </Field>
              <Field label="Venue / start point *">
                <input className="input" value={form.venue} onChange={e => update({ venue: e.target.value })} placeholder="Hare Krishna Vaikuntham, Visakhapatnam" />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tagline">
                <input className="input" value={form.tagline} onChange={e => update({ tagline: e.target.value })} placeholder="Andhra's Biggest Kitchen · Temple trails" />
              </Field>
              <Field label="Age limit">
                <input className="input" value={form.ageLimit} onChange={e => update({ ageLimit: e.target.value })} placeholder="16–30" />
              </Field>
            </div>

            <div className="panel-header mt-2 mb-2">
              <h3 className="panel-title">Locations on the route</h3>
              <button
                type="button"
                onClick={() => update({ locations: [...form.locations, ''] })}
                className="text-xs font-bold text-amber-700 hover:underline btn-sm"
              >
                ＋ Add location
              </button>
            </div>
            <div className="space-y-2">
              {form.locations.map((loc, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <input
                    className="input"
                    value={loc}
                    onChange={e => {
                      const list = [...form.locations];
                      list[i] = e.target.value;
                      update({ locations: list });
                    }}
                    placeholder="Hare Krishna Vaikuntham"
                  />
                  <button
                    type="button"
                    onClick={() => update({ locations: form.locations.filter((_, j) => j !== i) })}
                    className="icon-btn"
                    aria-label="Remove location"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {form.locations.length === 0 && (
                <p className="text-xs text-stone-400">No locations yet — add the stops on the route.</p>
              )}
            </div>

            <div className="panel-header mt-2 mb-1">
              <h3 className="panel-title">Description</h3>
              <button
                type="button"
                onClick={() => setDescPreview(v => !v)}
                className="text-xs font-bold text-amber-700 hover:underline btn-sm"
              >
                {descPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {descPreview ? (
              <div
                className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 text-sm text-stone-700 leading-relaxed min-h-[120px] [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: form.description || '<em class="text-stone-400">Nothing written yet.</em>' }}
              />
            ) : (
              <>
                <textarea
                  className="input min-h-[120px] font-mono text-xs"
                  value={form.description}
                  onChange={e => update({ description: e.target.value })}
                  placeholder="<p>Join us for a day of kirtan, temple trails and a grand feast.</p>"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  HTML is allowed — <code>&lt;p&gt;</code> for paragraphs, <code>&lt;strong&gt;</code> for bold,
                  <code>&lt;ul&gt;&lt;li&gt;</code> for bullets. Use Preview to check it.
                </p>
              </>
            )}
          </Card>

          {/* ── When ───────────────────────────────────────────────────── */}
          <Card title="When it happens">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date *">
                <input
                  type="date"
                  className="input"
                  value={start.date}
                  onChange={e => setSchedule({ startDate: e.target.value })}
                />
              </Field>
              <Field label="Starts at *">
                <input
                  type="time"
                  className="input"
                  value={start.time}
                  onChange={e => setSchedule({ startTime: e.target.value })}
                />
              </Field>
              <Field label="Ends at" hint="Optional">
                <input
                  type="time"
                  className="input"
                  value={end.time}
                  onChange={e => setSchedule({ endTime: e.target.value })}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-stone-600 cursor-pointer">
              <input type="checkbox" checked={multiDay} onChange={e => toggleMultiDay(e.target.checked)} />
              This yatra runs across more than one day
            </label>

            {multiDay && (
              <Field label="Last day">
                <input
                  type="date"
                  className="input md:w-1/3"
                  value={end.date}
                  min={start.date || undefined}
                  onChange={e => setSchedule({ endDate: e.target.value })}
                />
              </Field>
            )}

            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="label !mb-0">Shown on the site as</span>
                {displayTouched && (
                  <button
                    type="button"
                    className="text-xs font-bold text-amber-700 hover:underline"
                    onClick={() => {
                      setDisplayTouched(false);
                      setForm(prev => ({
                        ...prev,
                        dates: { ...prev.dates, display: buildDisplay(prev.dates.start || '', prev.dates.end || '') },
                      }));
                    }}
                  >
                    Reset to the picked date
                  </button>
                )}
              </div>
              <input
                className="input"
                value={form.dates.display}
                onChange={e => { setDisplayTouched(true); setForm(prev => ({ ...prev, dates: { ...prev.dates, display: e.target.value } })); }}
                placeholder="Pick a date above and this fills itself in"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Written for you from the date and time. Edit it if you want something like
                “Sat, 11 July · 7:00 AM onwards”.
              </p>
            </div>

            <div className="panel-header mt-2 mb-2">
              <h3 className="panel-title">Flow of the day</h3>
              <button type="button" onClick={addTimeline} className="text-xs font-bold text-amber-700 hover:underline btn-sm">＋ Add item</button>
            </div>
            <div className="space-y-3">
              {form.timeline.map((t, i) => {
                const picker = to24(t.time);
                return (
                  <div key={i} className="grid grid-cols-[120px_1fr_1fr_auto] gap-2 items-start">
                    <div>
                      <input
                        type="time"
                        className="input"
                        value={picker}
                        onChange={e => patchTimeline(i, { time: from24(e.target.value) })}
                      />
                      {/* Free-text times from older events are kept until a time is picked. */}
                      {t.time && !picker && (
                        <p className="text-[10px] text-amber-700 mt-1 truncate" title={t.time}>now: {t.time}</p>
                      )}
                    </div>
                    <input className="input" value={t.title} onChange={e => patchTimeline(i, { title: e.target.value })} placeholder="Arati & kirtan" />
                    <input className="input" value={t.description} onChange={e => patchTimeline(i, { description: e.target.value })} placeholder="Description" />
                    <button type="button" onClick={() => update({ timeline: form.timeline.filter((_, j) => j !== i) })} className="icon-btn" aria-label="Remove item">✕</button>
                  </div>
                );
              })}
              {form.timeline.length === 0 && <p className="text-xs text-stone-400">No timeline items yet.</p>}
            </div>
          </Card>

          {/* ── Tickets ────────────────────────────────────────────────── */}
          <Card title="Tickets & pricing">
            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Add a tier</div>
              <div className="flex flex-wrap gap-2">
                {TICKET_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => addPresetTicket(p)}
                    className="btn-ghost btn-sm"
                    title={p.tier.description}
                  >
                    <span aria-hidden="true">{p.emoji}</span> {p.label}
                  </button>
                ))}
                <button type="button" onClick={() => addPresetTicket(null)} className="btn-ghost btn-sm text-stone-500">
                  ＋ Custom
                </button>
              </div>
              <p className="text-[11px] text-stone-400 mt-2">
                Presets set the key, quantity limit and student-ID rule correctly — just add the price.
              </p>
            </div>

            {duplicateKeys.length > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                Two tiers share the key <strong>{duplicateKeys.join('", "')}</strong>. Bookings are matched by key,
                so they must be unique.
              </div>
            )}

            <div className="space-y-4">
              {form.tickets.map((t, i) => (
                <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="pill-gray font-mono">{t.key || 'no key'}</span>
                      {t.requiresStudentId && <span className="pill-violet">ID required</span>}
                      {t.tag && <span className="pill-amber">{t.tag}</span>}
                    </div>
                    <div className="flex items-center gap-1 flex-none">
                      <button type="button" className="icon-btn" onClick={() => moveTicket(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                      <button type="button" className="icon-btn" onClick={() => moveTicket(i, 1)} disabled={i === form.tickets.length - 1} aria-label="Move down">↓</button>
                      <button type="button" className="icon-btn text-red-500 hover:text-red-700" onClick={() => removeTicket(i)} aria-label="Remove tier">✕</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Name *" classNameWrap="!mb-0">
                      <input
                        className="input"
                        value={t.name}
                        onChange={e => {
                          const name = e.target.value;
                          // A blank or auto-matching key follows the name; a
                          // deliberately-set key is left alone.
                          const auto = !t.key || t.key === toKey(t.name);
                          patchTicket(i, auto ? { name, key: toKey(name) } : { name });
                        }}
                        placeholder="General"
                      />
                    </Field>
                    <Field label="Price ₹ *" classNameWrap="!mb-0">
                      <input type="number" min={0} className="input" value={t.price}
                        onChange={e => patchTicket(i, { price: Number(e.target.value) })} />
                    </Field>
                    <Field label="Was ₹" hint="Strike-through" classNameWrap="!mb-0">
                      <input type="number" min={0} className="input" value={t.was ?? ''}
                        onChange={e => patchTicket(i, { was: e.target.value === '' ? null : Number(e.target.value) })} />
                    </Field>
                    <Field label="Max per booking" classNameWrap="!mb-0">
                      <input type="number" min={1} className="input" value={t.maxQty}
                        onChange={e => patchTicket(i, { maxQty: Number(e.target.value) })} />
                    </Field>
                  </div>

                  <Field label="Short description" classNameWrap="!mb-0">
                    <input className="input" value={t.description}
                      onChange={e => patchTicket(i, { description: e.target.value })}
                      placeholder="Open to everyone" />
                  </Field>

                  {/* Features as real rows — a comma-separated box was too easy
                      to get wrong, and the list shows on the ticket card. */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="label !mb-0">What&apos;s included</label>
                      <button
                        type="button"
                        className="text-xs font-bold text-amber-700 hover:underline"
                        onClick={() => patchTicket(i, { features: [...(t.features || []), ''] })}
                      >
                        ＋ Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(t.features || []).map((f, fi) => (
                        <div key={fi} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                          <input
                            className="input"
                            value={f}
                            onChange={e => {
                              const features = [...(t.features || [])];
                              features[fi] = e.target.value;
                              patchTicket(i, { features });
                            }}
                            placeholder="Lunch feast"
                          />
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Remove"
                            onClick={() => patchTicket(i, { features: (t.features || []).filter((_, j) => j !== fi) })}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {(t.features || []).length === 0 && (
                        <p className="text-xs text-stone-400">Nothing listed — the ticket card just shows the price.</p>
                      )}
                    </div>
                  </div>

                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold text-stone-500 select-none">Advanced</summary>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                      <Field label="Key" hint="Used in booking data" classNameWrap="!mb-0">
                        <input
                          className="input font-mono text-xs"
                          value={t.key}
                          onChange={e => patchTicket(i, { key: toKey(e.target.value) })}
                          placeholder="general"
                        />
                      </Field>
                      <Field label="Tag" hint="Badge on the card" classNameWrap="!mb-0">
                        <input className="input" value={t.tag || ''} onChange={e => patchTicket(i, { tag: e.target.value })} placeholder="Most loved" />
                      </Field>
                      <label className="flex items-center gap-2 text-xs font-medium text-stone-600 self-end pb-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!t.requiresStudentId}
                          onChange={e => patchTicket(i, { requiresStudentId: e.target.checked, maxQty: e.target.checked ? 1 : t.maxQty })}
                        />
                        Requires a student ID upload
                      </label>
                    </div>
                  </details>
                </div>
              ))}
              {form.tickets.length === 0 && (
                <p className="text-xs text-stone-400">No tiers yet — add at least one so people can book.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* Readiness — the quickest answer to "why isn't this on the site?" */}
          <div className="panel">
            <h2 className="panel-title">
              {blockers === 0 ? 'Ready to publish' : `${blockers} thing${blockers === 1 ? '' : 's'} left`}
            </h2>
            <ul className="mt-3 space-y-1.5">
              {checks.map(c => (
                <li key={c.label} className={`flex items-start gap-2 text-xs ${c.ok ? 'text-stone-400' : 'text-stone-700 font-medium'}`}>
                  <span className={c.ok ? 'text-emerald-500' : 'text-amber-500'}>{c.ok ? '✓' : '○'}</span>
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
            {blockers === 0 && form.status !== 'active' && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Everything is filled in. Set the status to <strong>Active</strong> to list it on the site.
              </p>
            )}
          </div>

          <Card title="Hero & branding">
            <ImageField
              label="Hero — desktop"
              slot="hero-desktop"
              value={form.branding.heroDesktop}
              onChange={url => setBranding('heroDesktop', url)}
              hint="Wide image, around 1600×1000."
            />
            <ImageField
              label="Hero — mobile"
              slot="hero-mobile"
              value={form.branding.heroMobile}
              onChange={url => setBranding('heroMobile', url)}
              hint="Taller crop for phones. Falls back to the desktop image."
            />
            <Field label="Theme colour">
              <div className="flex items-center gap-3">
                <input type="color" className="h-10 w-14 rounded-xl border border-stone-300 cursor-pointer bg-white" value={form.branding.themeColor || DEFAULTS.themeColor} onChange={e => setBranding('themeColor', e.target.value)} />
                <span className="text-xs font-mono text-stone-500">{form.branding.themeColor || DEFAULTS.themeColor}</span>
              </div>
            </Field>
          </Card>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <button type="button" onClick={() => setShowAdvanced(v => !v)} className="accordion-summary hover:bg-stone-50">
              <span className="flex items-center gap-2">
                <span className="text-stone-900">Advanced settings</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">defaults applied</span>
              </span>
              <span className={`text-stone-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showAdvanced && (
              <div className="px-4 pb-5 space-y-4 border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-500 leading-relaxed">
                  Most events never need to change these. Pre-filled with the standard Yatra defaults.
                </p>
                <Field label="Organizer">
                  <input className="input" value={form.org} onChange={e => update({ org: e.target.value })} placeholder="Hare Krishna Vaikuntham" />
                </Field>
                <Field label="Booking ref prefix" hint={`Refs will read ${form.payments.receiptPrefix || 'YC-'}A1B2C3`}>
                  <input className="input font-mono text-xs" value={form.payments.receiptPrefix} onChange={e => setPayments('receiptPrefix', e.target.value)} />
                </Field>
                <Field label="Booking WhatsApp template">
                  <input className="input font-mono text-xs" value={form.payments.whatsapp.booking} onChange={e => setWhatsapp('booking', e.target.value)} />
                </Field>
                <Field label="Student approved template">
                  <input className="input font-mono text-xs" value={form.payments.whatsapp.studentApproved} onChange={e => setWhatsapp('studentApproved', e.target.value)} />
                </Field>
                <Field label="Student rejected template">
                  <input className="input font-mono text-xs" value={form.payments.whatsapp.studentRejected} onChange={e => setWhatsapp('studentRejected', e.target.value)} />
                </Field>
                <Field label="Mantra">
                  <input className="input" value={form.branding.mantra || ''} onChange={e => setBranding('mantra', e.target.value)} placeholder="जय श्री राम" />
                </Field>
                <label className="flex items-center gap-2 text-xs font-medium text-stone-600 cursor-pointer">
                  <input type="checkbox" checked={!!form.branding.showCountdown} onChange={e => setBranding('showCountdown', e.target.checked)} />
                  Show countdown on public page
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

// ── Image upload ─────────────────────────────────────────────────────────────
// Picks a file, sends it to Cloudinary through the admin API and stores the
// returned URL. The URL box stays available for images hosted elsewhere.
function ImageField({
  label, slot, value, onChange, hint,
}: {
  label: string;
  slot: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  async function upload(file: File) {
    setErr('');
    if (!file.type.startsWith('image/')) { setErr('Pick an image file (JPG, PNG or WebP).'); return; }
    if (file.size > 8 * 1024 * 1024) { setErr('That image is over 8 MB — please compress it first.'); return; }

    setBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.readAsDataURL(file);
      });
      const r = await adminFetch('/api/events/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, type: file.type, slot }),
      });
      const d = await r.json() as { url?: string; error?: string };
      if (d.url) onChange(d.url);
      else setErr(d.error || 'Upload failed.');
    } catch (e) {
      setErr((e as Error).message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4">
      <label className="label">{label}</label>

      {value ? (
        <div className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-28 object-cover" />
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <label className="text-xs font-bold text-amber-700 hover:underline cursor-pointer">
              {busy ? 'Uploading…' : 'Replace'}
              <input type="file" accept="image/*" className="hidden" disabled={busy}
                onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
            </label>
            <button type="button" className="text-xs font-bold text-red-500 hover:text-red-700" onClick={() => onChange('')}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/60 px-4 py-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition-colors ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
          <span className="text-xl" aria-hidden="true">🖼️</span>
          <span className="text-xs font-semibold text-stone-700">{busy ? 'Uploading…' : 'Upload an image'}</span>
          {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
          <input type="file" accept="image/*" className="hidden" disabled={busy}
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        </label>
      )}

      {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}

      <button type="button" className="text-[11px] text-stone-400 hover:text-stone-600 mt-1" onClick={() => setShowUrl(v => !v)}>
        {showUrl ? 'Hide' : 'Or paste an image URL'}
      </button>
      {showUrl && (
        <input
          className="input font-mono text-xs mt-1"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="/hero-desktop.jpg"
        />
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <h2 className="panel-title">{title}</h2>
      <div className="space-y-4 mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children, hint, classNameWrap }: { label: string; children: React.ReactNode; hint?: string; classNameWrap?: string }) {
  return (
    <div className={`${classNameWrap || ''}`}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-stone-400 mt-1">{hint}</p>}
    </div>
  );
}
