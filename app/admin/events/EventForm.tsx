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
  description: string;
  venue: string;
  dates: { display: string; start?: string; end?: string };
  timeline: EventTimelineItem[];
  tickets: EventTicketTier[];
  branding: { heroDesktop: string; heroMobile: string; themeColor: string; showCountdown: boolean; mantra: string };
  payments: { receiptPrefix: string; whatsapp: { booking: string; studentApproved: string; studentRejected: string } };
  status: EventStatus;
};

function fromEvent(e?: Event): FormState {
  if (!e) {
    return {
      code: '',
      name: '',
      tagline: '',
      org: '',
      description: '',
      venue: '',
      dates: { display: '', start: undefined, end: undefined },
      timeline: [],
      tickets: [],
      branding: { heroDesktop: '', heroMobile: '', themeColor: '#E07B00', showCountdown: false, mantra: '' },
      payments: { receiptPrefix: 'YC-', whatsapp: { booking: '', studentApproved: '', studentRejected: '' } },
      status: 'draft',
    };
  }
  return {
    code: e.code,
    name: e.name,
    tagline: e.tagline,
    org: e.org,
    description: e.description,
    venue: e.venue,
    dates: { display: e.dates.display, start: e.dates.start, end: e.dates.end },
    timeline: e.timeline.map(t => ({ ...t })),
    tickets: e.tickets.map(t => ({ ...t, features: [...(t.features || [])] })),
    branding: { heroDesktop: e.branding.heroDesktop || '', heroMobile: e.branding.heroMobile || '', themeColor: e.branding.themeColor || '#E07B00', showCountdown: !!e.branding.showCountdown, mantra: e.branding.mantra || '' },
    payments: { receiptPrefix: e.payments.receiptPrefix, whatsapp: { ...e.payments.whatsapp } },
    status: e.status,
  };
}

export default function EventForm({ mode, slug, initial }: { mode: 'new' | 'edit'; slug?: string; initial?: Event }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => fromEvent(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(patch: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...patch }));
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

  const input = 'w-full px-3 py-2 rounded-xl border border-black/12 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 bg-white';
  const label = 'block text-xs font-semibold text-bark-light uppercase tracking-wide mb-1.5';

  return (
    <form onSubmit={submit} className="p-6 lg:p-8 space-y-6 max-w-screen-xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-bark tracking-tight">{mode === 'new' ? 'New Event' : 'Edit Event'}</h1>
          {mode === 'edit' && <p className="text-sm text-bark-light mt-0.5 font-mono">/{form.code}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.push('/admin/events')} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Save Event'}</button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basics */}
        <section className="lg:col-span-2 space-y-6">
          <Card title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Event name *">
                <input className={input} value={form.name} onChange={e => update({ name: e.target.value })} placeholder="Ramayana Circuit Yatra" />
              </Field>
              <Field label="Public code *">
                <input className={input} value={form.code} onChange={e => update({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} placeholder="RC26" />
              </Field>
              <Field label="Tagline">
                <input className={input} value={form.tagline} onChange={e => update({ tagline: e.target.value })} placeholder="Rama Tirtham × Ramanarayanam" />
              </Field>
              <Field label="Organizer (org)">
                <input className={input} value={form.org} onChange={e => update({ org: e.target.value })} placeholder="Hare Krishna Vaikuntham" />
              </Field>
              <Field label="Venue">
                <input className={input} value={form.venue} onChange={e => update({ venue: e.target.value })} placeholder="Visakhapatnam" />
              </Field>
              <Field label="Status">
                <select className={input} value={form.status} onChange={e => update({ status: e.target.value as EventStatus })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active (shows on site)</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
            </div>
            <Field label="Description (HTML allowed)">
              <textarea className={`${input} min-h-[140px] font-mono text-xs`} value={form.description} onChange={e => update({ description: e.target.value })} placeholder="<p>Join us for...</p>" />
            </Field>
          </Card>

          <Card title="Date &amp; Timeline">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Display date">
                <input className={input} value={form.dates.display} onChange={e => setDates('display', e.target.value)} placeholder="Sat, 11 July · 7:00 AM" />
              </Field>
              <Field label="Start (ISO)">
                <input className={input} value={form.dates.start || ''} onChange={e => setDates('start', e.target.value)} placeholder="2026-07-11T07:00:00" />
              </Field>
              <Field label="End (ISO)">
                <input className={input} value={form.dates.end || ''} onChange={e => setDates('end', e.target.value)} placeholder="2026-07-11T16:00:00" />
              </Field>
            </div>

            <div className="flex items-center justify-between mt-4 mb-2">
              <h3 className="text-sm font-bold text-bark">Timeline</h3>
              <button type="button" onClick={addTimeline} className="text-xs font-bold text-gold-dark hover:underline">＋ Add item</button>
            </div>
            <div className="space-y-3">
              {form.timeline.map((t, i) => (
                <div key={i} className="grid grid-cols-[110px_1fr_1fr_auto] gap-2 items-start">
                  <input className={input} value={t.time} onChange={e => { const tl = [...form.timeline]; tl[i] = { ...tl[i], time: e.target.value }; update({ timeline: tl }); }} placeholder="7:00 AM" />
                  <input className={input} value={t.title} onChange={e => { const tl = [...form.timeline]; tl[i] = { ...tl[i], title: e.target.value }; update({ timeline: tl }); }} placeholder="Arati & kirtan" />
                  <input className={input} value={t.description} onChange={e => { const tl = [...form.timeline]; tl[i] = { ...tl[i], description: e.target.value }; update({ timeline: tl }); }} placeholder="Description" />
                  <button type="button" onClick={() => update({ timeline: form.timeline.filter((_, j) => j !== i) })} className="text-red-500 hover:text-red-700 px-2">✕</button>
                </div>
              ))}
              {form.timeline.length === 0 && <p className="text-xs text-bark-light">No timeline items.</p>}
            </div>
          </Card>

          <Card title="Tickets">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-bark">Price tiers</h3>
              <button type="button" onClick={addTicket} className="text-xs font-bold text-gold-dark hover:underline">＋ Add tier</button>
            </div>
            <div className="space-y-4">
              {form.tickets.map((t, i) => (
                <div key={i} className="rounded-xl border border-black/10 bg-cream/40 p-3 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input className={input} value={t.key} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], key: e.target.value }; update({ tickets: tt }); }} placeholder="key (general)" />
                    <input className={input} value={t.name} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], name: e.target.value }; update({ tickets: tt }); }} placeholder="Name (General)" />
                    <Field label="Price ₹" classNameWrap="!mb-0">
                      <input type="number" className={input} value={t.price} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], price: Number(e.target.value) }; update({ tickets: tt }); }} />
                    </Field>
                    <Field label="Was ₹" classNameWrap="!mb-0">
                      <input type="number" className={input} value={t.was ?? ''} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], was: e.target.value === '' ? null : Number(e.target.value) }; update({ tickets: tt }); }} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Field label="Max qty" classNameWrap="!mb-0">
                      <input type="number" className={input} value={t.maxQty} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], maxQty: Number(e.target.value) }; update({ tickets: tt }); }} />
                    </Field>
                    <Field label="Tag" classNameWrap="!mb-0">
                      <input className={input} value={t.tag || ''} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], tag: e.target.value }; update({ tickets: tt }); }} placeholder="Most loved" />
                    </Field>
                    <label className="flex items-center gap-2 text-xs font-medium text-bark-light self-end pb-2">
                      <input type="checkbox" checked={!!t.requiresStudentId} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], requiresStudentId: e.target.checked }; update({ tickets: tt }); }} />
                      Requires student ID
                    </label>
                  </div>
                  <Field label="Short description" classNameWrap="!mb-0">
                    <input className={input} value={t.description} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], description: e.target.value }; update({ tickets: tt }); }} />
                  </Field>
                  <Field label="Features (comma separated)" classNameWrap="!mb-0">
                    <input className={input} value={(t.features || []).join(', ')} onChange={e => { const tt = [...form.tickets]; tt[i] = { ...tt[i], features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }; update({ tickets: tt }); }} />
                  </Field>
                  <button type="button" onClick={() => update({ tickets: form.tickets.filter((_, j) => j !== i) })} className="text-xs font-bold text-red-500 hover:text-red-700">Remove tier</button>
                </div>
              ))}
              {form.tickets.length === 0 && <p className="text-xs text-bark-light">No ticket tiers yet.</p>}
            </div>
          </Card>
        </section>

        {/* Side */}
        <section className="space-y-6">
          <Card title="Branding">
            <Field label="Hero desktop URL">
              <input className={input} value={form.branding.heroDesktop || ''} onChange={e => setBranding('heroDesktop', e.target.value)} placeholder="/hero-desktop.jpg" />
            </Field>
            <Field label="Hero mobile URL">
              <input className={input} value={form.branding.heroMobile || ''} onChange={e => setBranding('heroMobile', e.target.value)} placeholder="/hero-mobile.jpg" />
            </Field>
            <Field label="Theme color">
              <input type="color" className="h-10 w-full rounded-xl border border-black/12" value={form.branding.themeColor || '#E07B00'} onChange={e => setBranding('themeColor', e.target.value)} />
            </Field>
            <Field label="Mantra">
              <input className={input} value={form.branding.mantra || ''} onChange={e => setBranding('mantra', e.target.value)} placeholder="जय श्री राम" />
            </Field>
            <label className="flex items-center gap-2 text-xs font-medium text-bark-light">
              <input type="checkbox" checked={!!form.branding.showCountdown} onChange={e => setBranding('showCountdown', e.target.checked)} />
              Show countdown
            </label>
          </Card>

          <Card title="Payments &amp; WhatsApp">
            <Field label="Receipt prefix">
              <input className={input} value={form.payments.receiptPrefix} onChange={e => setPayments('receiptPrefix', e.target.value)} placeholder="YC-" />
            </Field>
            <Field label="Booking template">
              <input className={input} value={form.payments.whatsapp.booking} onChange={e => setWhatsapp('booking', e.target.value)} placeholder="yatra_booking_confirmation" />
            </Field>
            <Field label="Student approved template">
              <input className={input} value={form.payments.whatsapp.studentApproved} onChange={e => setWhatsapp('studentApproved', e.target.value)} placeholder="student_id_approved" />
            </Field>
            <Field label="Student rejected template">
              <input className={input} value={form.payments.whatsapp.studentRejected} onChange={e => setWhatsapp('studentRejected', e.target.value)} placeholder="student_id_rejected" />
            </Field>
          </Card>
        </section>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
      <h2 className="font-bold text-bark mb-4 text-sm">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children, classNameWrap }: { label: string; children: React.ReactNode; classNameWrap?: string }) {
  return (
    <div className={`mb-1 ${classNameWrap || ''}`}>
      <label className="block text-xs font-semibold text-bark-light uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
