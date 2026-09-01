'use client';

import { useState } from 'react';
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

export default function EventForm({ mode, slug, initial }: { mode: 'new' | 'edit'; slug?: string; initial?: Event }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => fromEvent(initial));
  const [codeTouched, setCodeTouched] = useState(mode === 'edit');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function setDates(key: 'display' | 'start' | 'end', val: string) {
    setForm(prev => ({ ...prev, dates: { ...prev.dates, [key]: val } }));
  }

  function setBranding(key: keyof FormState['branding'], val: string | boolean) {
    setForm(prev => ({ ...prev, branding: { ...prev.branding, [key]: val } }));
  }

  function setPayments(key: keyof FormState['payments'], val: string) {
    setForm(prev => ({ ...prev, payments: { ...prev.payments, [key]: val } }));
  }

  function setWhatsapp(key: keyof FormState['payments']['whatsapp'], val: string) {
    setForm(prev => ({ ...prev, payments: { ...prev.payments, whatsapp: { ...prev.payments.whatsapp, [key]: val } } }));
  }

  function addTicket() {
    setForm(prev => ({ ...prev, tickets: [...prev.tickets, { key: `tier${prev.tickets.length + 1}`, name: '', price: 0, was: null, maxQty: 20, description: '', tag: '', requiresStudentId: false, features: [] }] }));
  }
  function addTimeline() {
    setForm(prev => ({ ...prev, timeline: [...prev.timeline, { time: '', title: '', description: '' }] }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = mode === 'new' ? '/api/events' : `/api/events/${encodeURIComponent(form.code || '')}`;
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
            {mode === 'new' ? 'Add the essentials here — advanced settings get sensible defaults.' : `Event code /${form.code}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.push('/admin/events')} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Public code" hint={codeTouched ? undefined : 'Auto-generated from name — tap to change'}>
                <input
                  className="input font-mono uppercase"
                  value={form.code}
                  onFocus={() => setCodeTouched(true)}
                  onChange={e => { setCodeTouched(true); update({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }); }}
                  placeholder="RCY26"
                />
              </Field>
              <Field label="Status">
                <select className="select" value={form.status} onChange={e => update({ status: e.target.value as EventStatus })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active (visible on site)</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tagline">
                <input className="input" value={form.tagline} onChange={e => update({ tagline: e.target.value })} placeholder="Andhra's Biggest Kitchen · Temple trails" />
              </Field>
              <Field label="Venue / start point">
                <input className="input" value={form.venue} onChange={e => update({ venue: e.target.value })} placeholder="Hare Krishna Vaikuntham, Visakhapatnam" />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  >
                    ✕
                  </button>
                </div>
              ))}
              {form.locations.length === 0 && (
                <p className="text-xs text-stone-400">No locations yet — add the stops on the route.</p>
              )}
            </div>

            <Field label="Description (HTML allowed)">
              <textarea
                className="input min-h-[120px] font-mono text-xs"
                value={form.description}
                onChange={e => update({ description: e.target.value })}
                placeholder="<p>Join us for...</p>"
              />
            </Field>
          </Card>

          <Card title="Date & timeline">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Display date">
                <input className="input" value={form.dates.display} onChange={e => setDates('display', e.target.value)} placeholder="Sat, 11 July · 7:00 AM" />
              </Field>
              <Field label="Start (ISO)">
                <input className="input font-mono text-xs" value={form.dates.start || ''} onChange={e => setDates('start', e.target.value)} placeholder="2026-07-11T07:00:00" />
              </Field>
              <Field label="End (ISO)">
                <input className="input font-mono text-xs" value={form.dates.end || ''} onChange={e => setDates('end', e.target.value)} placeholder="2026-07-11T16:00:00" />
              </Field>
            </div>

            <div className="panel-header mt-2 mb-2">
              <h3 className="panel-title">Timeline</h3>
              <button type="button" onClick={addTimeline} className="text-xs font-bold text-amber-700 hover:underline btn-sm">＋ Add item</button>
            </div>
            <div className="space-y-3">
              {form.timeline.map((t, i) => (
                <div key={i} className="grid grid-cols-[110px_1fr_1fr_auto] gap-2 items-start">
                  <input className="input" value={t.time} onChange={e => { const tl = [...form.timeline]; tl[i] = { ...tl[i], time: e.target.value }; update({ timeline: tl }); }} placeholder="7:00 AM" />
                  <input className="input" value={t.title} onChange={e => { const tl = [...form.timeline]; tl[i] = { ...tl[i], title: e.target.value }; update({ timeline: tl }); }} placeholder="Arati & kirtan" />
                  <input className="input" value={t.description} onChange={e => { const tl = [...form.timeline]; tl[i] = { ...tl[i], description: e.target.value }; update({ timeline: tl }); }} placeholder="Description" />
                  <button type="button" onClick={() => update({ timeline: form.timeline.filter((_, j) => j !== i) })} className="icon-btn">✕</button>
                </div>
              ))}
              {form.timeline.length === 0 && <p className="text-xs text-stone-400">No timeline items.</p>}
            </div>
          </Card>

          <Card title="Tickets & pricing">
            <div className="panel-header mb-2">
              <h3 className="panel-title">Price tiers</h3>
              <button type="button" onClick={addTicket} className="text-xs font-bold text-amber-700 hover:underline btn-sm">＋ Add tier</button>
            </div>
            <div className="space-y-4">
              {form.tickets.map((t, i) => (
                <div key={i} className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Key" classNameWrap="!mb-0">
                      <input className="input font-mono text-xs" value={t.key} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], key: e.target.value }; update({ tickets: tt }); }} placeholder="general" />
                    </Field>
                    <Field label="Name" classNameWrap="!mb-0">
                      <input className="input" value={t.name} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], name: e.target.value }; update({ tickets: tt }); }} placeholder="General" />
                    </Field>
                    <Field label="Price ₹" classNameWrap="!mb-0">
                      <input type="number" className="input" value={t.price} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], price: Number(e.target.value) }; update({ tickets: tt }); }} />
                    </Field>
                    <Field label="Was ₹" classNameWrap="!mb-0">
                      <input type="number" className="input" value={t.was ?? ''} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], was: e.target.value === '' ? null : Number(e.target.value) }; update({ tickets: tt }); }} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Max qty" classNameWrap="!mb-0">
                      <input type="number" className="input" value={t.maxQty} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], maxQty: Number(e.target.value) }; update({ tickets: tt }); }} />
                    </Field>
                    <Field label="Tag" classNameWrap="!mb-0">
                      <input className="input" value={t.tag || ''} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], tag: e.target.value }; update({ tickets: tt }); }} placeholder="Most loved" />
                    </Field>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-600 self-end pb-2.5 cursor-pointer">
                      <input type="checkbox" checked={!!t.requiresStudentId} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], requiresStudentId: e.target.checked }; update({ tickets: tt }); }} />
                      Requires student ID
                    </label>
                  </div>
                  <Field label="Short description" classNameWrap="!mb-0">
                    <input className="input" value={t.description} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], description: e.target.value }; update({ tickets: tt }); }} />
                  </Field>
                  <Field label="Features (comma separated)" classNameWrap="!mb-0">
                    <input className="input" value={(t.features || []).join(', ')} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }; update({ tickets: tt }); }} />
                  </Field>
                  <button type="button" onClick={() => update({ tickets: form.tickets.filter((_, j) => j !== i) })} className="text-xs font-bold text-red-500 hover:text-red-700">
                    Remove tier
                  </button>
                </div>
              ))}
              {form.tickets.length === 0 && <p className="text-xs text-stone-400">No ticket tiers yet — add at least one so people can book.</p>}
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card title="Hero & branding">
            <Field label="Hero desktop URL">
              <input className="input font-mono text-xs" value={form.branding.heroDesktop || ''} onChange={e => setBranding('heroDesktop', e.target.value)} placeholder="/hero-desktop.jpg" />
            </Field>
            <Field label="Hero mobile URL">
              <input className="input font-mono text-xs" value={form.branding.heroMobile || ''} onChange={e => setBranding('heroMobile', e.target.value)} placeholder="/hero-mobile.jpg" />
            </Field>
            <Field label="Theme color">
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
                <Field label="Receipt prefix">
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