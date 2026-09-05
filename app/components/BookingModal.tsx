'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import type { PublicEvent, PublicTicketTier } from '@/lib/publicTypes';

type QtyMap = Record<string, number>;

interface PaymentInfo {
  paymentId?: string;
  orderId?: string;
  signature?: string;
  status: 'pending' | 'paid' | 'demo';
}

interface BookingPayload {
  event_code: string;
  ref: string;
  name: string;
  age: number;
  phone: string;
  email: string | null;
  college: string;
  course: string | null;
  year_of_study: string | null;
  tickets: QtyMap;
  total: number;
  studentStatus?: string | null;
  idCard?: { data: string; type: string; name: string } | null;
  payment: PaymentInfo;
}

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

const YEAR_OPTIONS = [
  '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year',
  'Post Graduate', 'Other',
];

// #yc-modal-root is the last child of .bc-root, so the overlay still inherits
// the theme custom properties (--bg2, --gold, …) that are declared on .bc-root
// while sitting outside .bc-wrap's stacking context. <body> is only a fallback.
function portalTarget(): HTMLElement {
  return document.getElementById('yc-modal-root') || document.body;
}

export default function BookingModal({ event }: { event: PublicEvent }) {
  const [open, setOpen] = useState(false);
  const [tierKey, setTierKey] = useState<string | undefined>(
    () => event.tickets.find(t => t.requiresStudentId)?.key || event.tickets[0]?.key
  );
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [colleges, setColleges] = useState<string[]>([]);
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [idCard, setIdCard] = useState<{ data: string; type: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [result, setResult] = useState<{ ref: string; name: string; phone: string; total: number; paymentId: string; studentStatus: string } | null>(null);

  const tier: PublicTicketTier | undefined = event.tickets.find(t => t.key === tierKey) || event.tickets[0];
  const discounted = Boolean(tier && tier.was != null && (tier.was || 0) > (tier.price || 0));
  const total = tier?.price || 0;

  const ageNum = Number(age);
  const ageOk = Number.isInteger(ageNum) && ageNum >= 10 && ageNum <= 100;

  const canConfirm = useCallback(() => {
    const nameOk = name.trim().length > 0;
    const phoneOk = /^[0-9]{10}$/.test(phone.trim());
    const collegeOk = college.trim().length > 0;
    return Boolean(tier) && nameOk && ageOk && phoneOk && collegeOk && Boolean(idCard);
  }, [name, ageOk, phone, college, tier, idCard]);

  function openNow() {
    // Yatra Clubbing is a single-pass, student-only booking — reselect nothing,
    // just reset the attendee fields.
    setName('');
    setAge('');
    setPhone('');
    setEmail('');
    setCollege('');
    setCourse('');
    setYearOfStudy('');
    setIdCard(null);
    setError('');
    setStep(1);
    setResult(null);
    setOpen(true);
  }

  // Load the shared global college list (from the admin manager) once, so the
  // student's college autocompletes instead of being retyped. A name not on
  // the list is still accepted.
  useEffect(() => {
    if (!open || colleges.length > 0) return;
    let cancelled = false;
    apiFetch('/api/colleges/list', {})
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const list = (Array.isArray(d?.colleges) ? d.colleges : []) as string[];
        if (!cancelled && list.length) setColleges(list);
      })
      .catch(() => { /* best-effort */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, colleges.length]);

  useEffect(() => {
    function handler() {
      openNow();
    }
    window.addEventListener('yatra:open-booking', handler);
    return () => window.removeEventListener('yatra:open-booking', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  // While the sheet is open: lock the page behind it and let Escape close it.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('yc-modal-open');
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('yc-modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function api(path: string, body: unknown): Promise<Record<string, unknown>> {
    const r = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  }

  function makeBooking(): BookingPayload {
    // Refs carry the event's own prefix (YJ-…) from its advanced settings, so a
    // booking is identifiable by its ref alone when two yatras are running.
    const ref = (event.receiptPrefix || 'YC-') + Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      event_code: event.code,
      ref,
      name: name.trim(),
      age: ageNum,
      phone: phone.trim(),
      email: email.trim() || null,
      college: college.trim(),
      course: course.trim() || null,
      year_of_study: yearOfStudy || null,
      tickets: tier ? { [tier.key]: 1 } : {},
      total,
      studentStatus: 'ID uploaded — pending verification',
      idCard,
      payment: { status: 'pending' },
    };
  }

  async function pay(booking: BookingPayload): Promise<PaymentInfo> {
    if (typeof window.Razorpay === 'undefined') {
      return { paymentId: 'demo_' + Date.now(), status: 'demo' };
    }
    try {
      const order = await api('/api/create-order', {
        amount: booking.total,
        receipt: booking.ref,
        event_code: booking.event_code,
      }) as { orderId: string; amount: number; currency: string; keyId: string };
      if (!order.orderId) throw new Error('Could not create order');

      return await new Promise<PaymentInfo>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          order_id: order.orderId,
          name: 'Yatra Clubbing · ' + event.name,
          description: event.org,
          prefill: { name: booking.name, contact: booking.phone, email: booking.email || '' },
          theme: { color: event.branding.themeColor || '#E07B00' },
          handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            const verify = await api('/api/verify-payment', resp) as { valid?: boolean };
            if (!verify.valid) return reject(new Error('Payment could not be verified.'));
            resolve({
              paymentId: resp.razorpay_payment_id,
              orderId: resp.razorpay_order_id,
              signature: resp.razorpay_signature,
              status: 'paid',
            });
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
        });
        rzp.open();
      });
    } catch (e) {
      const err = e as Error;
      if (err && err.message === 'Payment cancelled.') throw e;
      // Fall back to demo in case the payment provider isn't configured
      return { paymentId: 'demo_' + Date.now(), status: 'demo' };
    }
  }

  async function finishBooking(booking: BookingPayload, payment: PaymentInfo) {
    setResult({
      ref: booking.ref,
      name: booking.name,
      phone: booking.phone,
      total: booking.total,
      paymentId: payment.paymentId || '',
      studentStatus: booking.studentStatus || '—',
    });
    setStep(2);

    try {
      await api('/api/register', { ...booking, payment });
    } catch { /* best-effort */ }

    try {
      await api('/api/whatsapp', { ...booking, event_code: booking.event_code });
    } catch { /* best-effort */ }
  }

  async function submit() {
    setError('');
    if (!canConfirm()) {
      setError('Please fill in all required details and upload your college / school ID.');
      return;
    }
    setBusy(true);
    try {
      const booking = makeBooking();
      // Pre-save booking as pending so abandoned payments are still captured
      try { await api('/api/register', booking); } catch { /* best-effort */ }
      const payment = await pay(booking);
      await finishBooking(booking, payment);
    } catch (e) {
      setError((e as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
  }

  const passPicker = () => {
    if (event.tickets.length <= 1 && tier) {
      return (
        <div className="yc-pass">
          <div className="yc-pass-head">
            <div>
              <div className="nm">{tier.name || 'Student pass'}</div>
              {tier.requiresStudentId && <div className="req">🎓 College / school ID required</div>}
            </div>
            <div className="yc-pass-price">
              <b>{inr(tier.price || 0)}</b>
              {discounted && <s>{inr(tier.was as number)}</s>}
              {discounted && <span className="yc-save">Save {inr((tier.was as number) - (tier.price || 0))}</span>}
            </div>
          </div>
          {(tier.features?.length || 0) > 0 && (
            <div className="yc-pass-feat">{tier.features.join(' · ')}</div>
          )}
          {tier.description && <div className="yc-pass-desc">{tier.description}</div>}
        </div>
      );
    }

    return (
      <div className="bc-passpick">
        {event.tickets.map(t => {
          const selected = t.key === tier?.key;
          const on = discounted && t.was != null && (t.was || 0) > (t.price || 0);
          return (
            <button type="button" key={t.key} className={`yc-pass-opt${selected ? ' sel' : ''}`}
              onClick={() => { setTierKey(t.key); setError(''); }}>
              <span className="radio" aria-hidden="true">{selected ? '✓' : ''}</span>
              <span className="bc-po-mid">
                <b>{t.name}</b>
                {t.requiresStudentId && <em>🎓 ID required</em>}
              </span>
              <span className="bc-po-pr">
                {inr(t.price || 0)}
                {on && <s>{inr(t.was as number)}</s>}
              </span>
            </button>
          );
        })}
        {discounted && tier && (
          <div className="yc-save-line">Early-bird pricing — {inr((tier.was as number) - (tier.price || 0))} off for students</div>
        )}
      </div>
    );
  };

  const overlay = !open ? null : (
    <div className="bc-overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Register for the yatra">
      <div className="bc-modal" onClick={e => e.stopPropagation()}>
            <div className="bc-mhead">
              <div className="tt"><span className="pill">{event.name}</span><h3>Register your seat</h3></div>
              <button className="bc-close" onClick={close}>✕</button>
            </div>
            <div className="bc-steps"><div className={`s ${step === 1 ? 'on' : ''}`}></div><div className={`s ${step === 2 ? 'on' : ''}`}></div></div>
            <div className="bc-mbody">

              {step === 1 && (
                <>
                  <div className="bc-field">
                    <label>Your pass</label>
                    {passPicker()}
                  </div>

                  <div className="bc-field"><label>Full name</label>
                    <input className="bc-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></div>

                  <div className="bc-grid2">
                    <div className="bc-field"><label>Age</label>
                      <input className="bc-input" inputMode="numeric" value={age}
                        onChange={e => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        maxLength={2} placeholder="e.g. 21" /></div>
                    <div className="bc-field"><label>Mobile number</label>
                      <input className="bc-input" inputMode="numeric" value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        maxLength={10} placeholder="10-digit mobile" /></div>
                  </div>

                  <div className="bc-field"><label>Email <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>(optional)</span></label>
                    <input className="bc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>

                  <div className="bc-field"><label>College / school name</label>
                    <input className="bc-input" list="yc-colleges" value={college} onChange={e => setCollege(e.target.value)}
                      placeholder={colleges.length ? 'Start typing to pick your college' : 'Your college / school'} />
                    <datalist id="yc-colleges">
                      {colleges.map(c => <option key={c} value={c} />)}
                    </datalist></div>

                  <div className="bc-grid2">
                    <div className="bc-field"><label>Course / study</label>
                      <input className="bc-input" value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. B.Tech CSE" /></div>
                    <div className="bc-field"><label>Year of study</label>
                      <select className="bc-select" value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}>
                        <option value="">Choose…</option>
                        {YEAR_OPTIONS.map(y => <option key={y}>{y}</option>)}
                      </select></div>
                  </div>

                  <div className="yc-verify">
                    <div className="vh">🎓 Student proof</div>
                    {!idCard ? (
                      <label className="bc-upload" style={{ cursor: 'pointer' }}>
                        <span className="uic">📎</span>
                        <b>Upload college / school ID</b>
                        <span>Image or PDF · required to confirm your seat</span>
                        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const reader = new FileReader();
                            reader.onload = () => setIdCard({ data: String(reader.result), type: f.type, name: f.name });
                            reader.readAsDataURL(f);
                          }} />
                      </label>
                    ) : (
                      <div className="bc-uploaded">
                        <div className="ok">✓</div>
                        <div className="fn">{idCard.name}</div>
                        <div className="fs">Uploaded — your ID is verified before the yatra</div>
                      </div>
                    )}
                  </div>

                  <button className="bc-btn" onClick={submit} disabled={busy || !canConfirm()}>
                    {busy ? 'Processing…' : `Proceed to pay · ${inr(total)}`}
                  </button>
                  {error && <div className="bc-hint err" style={{ display: 'block', color: '#FF8A8A' }}>{error}</div>}
                  <div className="bc-secure">🔒 Secure payment via Razorpay · UPI, cards &amp; netbanking</div>
                </>
              )}

              {step === 2 && result && (
                <div className="bc-success">
                  <div className="bc-succ-ic">🪷</div>
                  <h3>Seat reserved</h3>
                  <p className="bc-succ-sub">Hare Krishna! Your seat for the <b>{event.name}</b> is booked.</p>
                  <div className="bc-summary" style={{ textAlign: 'left' }}>
                    <div className="bc-srow"><span>Name</span><span>{result.name}</span></div>
                    <div className="bc-srow"><span>Phone</span><span>{result.phone}</span></div>
                    <div className="bc-srow"><span>Amount paid</span><span className="amt">{inr(result.total)}</span></div>
                    {result.studentStatus && <div className="bc-srow"><span>Student</span><span>{result.studentStatus}</span></div>}
                  </div>
                  <div className="bc-timeline">
                    <div className="bc-tl-item done"><div className="bc-tl-dot">✓</div><div><b>Payment received</b><span>Your seat is paid &amp; reserved.</span></div></div>
                    <div className="bc-tl-item now"><div className="bc-tl-dot">●</div><div><b>ID verification</b><span>We review your college ID and WhatsApp you once it's verified.</span></div></div>
                  </div>
                  <div className="bc-ref">Booking ref · {result.ref} · {result.paymentId}</div>
                  <div className="bc-succ-actions"><button className="bc-btn ghost" onClick={close}>Done</button></div>
                </div>
              )}

      </div>
      </div>
    </div>
  );

  return (
    <>
      <button className="bc-navcta" onClick={() => openNow()}>Register now</button>
      {overlay ? createPortal(overlay, portalTarget()) : null}
    </>
  );
}