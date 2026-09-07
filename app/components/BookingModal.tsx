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
  status: 'pending' | 'paid';
}

interface BookingPayload {
  event_code: string;
  ref: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string | null;
  college: string;
  course: string | null;
  year_of_study: string | null;
  tickets: QtyMap;
  total: number;
  studentStatus?: string | null;
  payment: PaymentInfo;
}

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

// Field icons — stroke SVG, tinted by the parent's currentColor.
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>
);
const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.78.7 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.27a2 2 0 0 1 2.11-.45c.83.34 1.71.57 2.61.7A2 2 0 0 1 22 16.92z"/></svg>
);
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);
const GradIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m22 9-10-5L2 9l10 5 10-5Z"/><path d="M6 11.5V16c0 1.66 2.7 3 6 3s6-1.34 6-3v-4.5"/><path d="M22 9v5"/></svg>
);
const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M9 7h7"/></svg>
);
const CakeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-9a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"/><path d="M4 21h16"/><path d="M12 10v-2"/><path d="M12 8c-1 0-2-.7-2-1.7 0-.8.6-1.3 2-2.3 1.4 1 2 1.5 2 2.3 0 1-1 1.7-2 1.7Z"/><path d="M16 13a2.5 2.5 0 0 1-2.5 2.5 2.7 2.7 0 0 1-3-0 2.7 2.7 0 0 1-3 0A2.5 2.5 0 0 1 5 13"/></svg>
);

const YEAR_OPTIONS = [
  '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year',
  'Post Graduate', 'Other',
];

// Seat and accommodation allocation on a yatra is done separately for men and
// women, so gender is a required field — kept lowercase on the wire so the
// admin console and exports always get one of exactly two values.
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
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
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [colleges, setColleges] = useState<string[]>([]);
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [result, setResult] = useState<{ ref: string; name: string; phone: string; total: number; paymentId: string; studentStatus: string } | null>(null);

  const tier: PublicTicketTier | undefined = event.tickets.find(t => t.key === tierKey) || event.tickets[0];
  const total = tier?.price || 0;

  const ageNum = Number(age);
  const ageOk = Number.isInteger(ageNum) && ageNum >= 10 && ageNum <= 100;

  const canConfirm = useCallback(() => {
    const nameOk = name.trim().length > 0;
    const phoneOk = /^[0-9]{10}$/.test(phone.trim());
    const collegeOk = college.trim().length > 0;
    const genderOk = GENDER_OPTIONS.some(g => g.value === gender);
    return Boolean(tier) && nameOk && ageOk && genderOk && phoneOk && collegeOk;
  }, [name, ageOk, gender, phone, college, tier]);

  function openNow() {
    // Yatra Clubbing is a single-pass, student-only booking — reselect nothing,
    // just reset the attendee fields.
    setName('');
    setAge('');
    setGender('');
    setPhone('');
    setEmail('');
    setCollege('');
    setCourse('');
    setYearOfStudy('');
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
      gender,
      phone: phone.trim(),
      email: email.trim() || null,
      college: college.trim(),
      course: course.trim() || null,
      year_of_study: yearOfStudy || null,
      tickets: tier ? { [tier.key]: 1 } : {},
      total,
      studentStatus: 'Pending ID verification',
      payment: { status: 'pending' },
    };
  }

  /**
   * Make sure Razorpay's checkout script is actually loaded.
   *
   * It is requested early in EventLanding, but "requested" is not "arrived":
   * on a slow phone, behind an ad-blocker, or on a flaky connection the global
   * can still be missing when someone taps Pay. So wait for it, and inject the
   * tag ourselves if it never came. Returns false only when it truly cannot be
   * loaded — and the caller then shows a real error instead of pretending.
   */
  function ensureRazorpay(timeoutMs = 12000): Promise<boolean> {
    if (typeof window.Razorpay !== 'undefined') return Promise.resolve(true);

    const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
    let tag = document.querySelector(`script[src="${SRC}"]`) as HTMLScriptElement | null;
    if (!tag) {
      tag = document.createElement('script');
      tag.src = SRC;
      tag.async = true;
      document.head.appendChild(tag);
    }

    return new Promise<boolean>((resolve) => {
      const started = Date.now();
      // Poll rather than relying on onload alone: the tag may already have been
      // added (and its load event already fired) before we got here.
      const timer = setInterval(() => {
        if (typeof window.Razorpay !== 'undefined') {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          resolve(false);
        }
      }, 120);
    });
  }

  async function pay(booking: BookingPayload): Promise<PaymentInfo> {
    // NO demo fallback. This used to quietly return status:'demo' whenever the
    // checkout script was missing or create-order failed — which handed the
    // person a "Seat reserved" screen for a seat they had never paid for, and
    // wrote a free booking into the database. On a promotion to a thousand
    // phones that is not a rare edge case. Every failure below is now surfaced.
    const ready = await ensureRazorpay();
    if (!ready) {
      throw new Error('Could not load the secure payment window. Check your internet connection, turn off any ad-blocker, and try again.');
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
      const message = (err && err.message) || '';
      // Cancellation and verification failures are already worded for a person;
      // anything else is a network or configuration fault, and gets a message
      // that tells them what to do rather than a silent free seat.
      if (message === 'Payment cancelled.' || message === 'Payment could not be verified.') throw e;
      console.error('[booking] payment could not be started:', message);
      throw new Error('We could not reach the payment gateway. Nothing has been charged — please try again in a moment.');
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
      setError('Please fill in all required details.');
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

  // A pass is "on offer" when it carries a higher original price. The offer name
  // falls through to the tier's tag (e.g. "Early bird") when the admin set one.
  const offerLabel = (t: PublicTicketTier) =>
    t.was != null && t.was > (t.price || 0) ? (t.tag || 'Early-bird offer') : null;
  const savings = (t: PublicTicketTier) => ((t.was as number) - (t.price || 0));

  const passPicker = () => {
    if (event.tickets.length <= 1 && tier) {
      const off = offerLabel(tier);
      return (
        <div className={`yc-pass${off ? ' is-offer' : ''}`}>
          <div className="yc-pass-row">
            <span className="yc-pass-ic" aria-hidden="true">🎫</span>
            <div className="yc-pass-id">
              <div className="nm">{tier.name || 'Student pass'}</div>
              {tier.requiresStudentId && <div className="req">🎓 College / school ID required</div>}
            </div>
            <div className="yc-pass-price">
              {off && <s>{inr(tier.was as number)}</s>}
              <b>{inr(tier.price || 0)}</b>
            </div>
          </div>
          {off && (
            <div className="yc-offer">
              <span className="tag">{off}</span>
              <span className="save">Save {inr(savings(tier))} on regular price</span>
            </div>
          )}
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
          const off = offerLabel(t);
          return (
            <button type="button" key={t.key} className={`yc-pass-opt${selected ? ' sel' : ''}`}
              onClick={() => { setTierKey(t.key); setError(''); }}>
              <span className="radio" aria-hidden="true">{selected ? '✓' : ''}</span>
              <span className="bc-po-mid">
                <b>{t.name}</b>
                {t.requiresStudentId && <em>🎓 ID required</em>}
              </span>
              <span className="bc-po-pr">
                <span className="pr-line">
                  {off && <s>{inr(t.was as number)}</s>}
                  <b>{inr(t.price || 0)}</b>
                </span>
                {off && <em className="off">{off}</em>}
              </span>
            </button>
          );
        })}
        {event.tickets.length > 1 && (
          <div className="yc-save-note">Choose the pass that fits you · prices are per person</div>
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
                    <div className="bc-input-wrap">
                      <span className="ic-field" aria-hidden="true"><UserIcon /></span>
                      <input className="bc-input has-icon" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                    </div>
                  </div>

                  <div className="bc-grid2">
                    <div className="bc-field"><label>Age</label>
                      <div className="bc-input-wrap">
                        <span className="ic-field" aria-hidden="true"><CakeIcon /></span>
                        <input className="bc-input has-icon" inputMode="numeric" value={age}
                          onChange={e => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          maxLength={2} placeholder="e.g. 21" />
                      </div>
                    </div>
                    <div className="bc-field"><label>Gender</label>
                      <div className="yc-seg" role="radiogroup" aria-label="Gender">
                        {GENDER_OPTIONS.map(g => (
                          <button
                            type="button"
                            key={g.value}
                            role="radio"
                            aria-checked={gender === g.value}
                            className={`yc-seg-opt${gender === g.value ? ' sel' : ''}`}
                            onClick={() => setGender(g.value)}
                          >
                            <span aria-hidden="true">{g.value === 'male' ? '👨' : '👩'}</span>{g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bc-grid2">
                    <div className="bc-field"><label>Mobile number</label>
                      <div className="bc-input-wrap">
                        <span className="ic-field" aria-hidden="true"><PhoneIcon /></span>
                        <input className="bc-input has-icon" inputMode="numeric" value={phone}
                          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          maxLength={10} placeholder="10-digit mobile" />
                      </div>
                    </div>
                    <div className="bc-field"><label>Email <span className="optional">(optional)</span></label>
                      <div className="bc-input-wrap">
                        <span className="ic-field" aria-hidden="true"><MailIcon /></span>
                        <input className="bc-input has-icon" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
                      </div>
                    </div>
                  </div>

                  <div className="bc-field"><label>College / school name</label>
                    <div className="bc-input-wrap">
                      <span className="ic-field" aria-hidden="true"><GradIcon /></span>
                      <input className="bc-input has-icon" list="yc-colleges" value={college} onChange={e => setCollege(e.target.value)}
                        placeholder={colleges.length ? 'Start typing to pick your college' : 'Your college / school'} />
                    </div>
                    <datalist id="yc-colleges">
                      {colleges.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>

                  <div className="bc-field"><label>Course / study</label>
                    <div className="bc-input-wrap">
                      <span className="ic-field" aria-hidden="true"><BookIcon /></span>
                      <input className="bc-input has-icon" value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. B.Tech CSE" />
                    </div>
                  </div>

                  <div className="bc-field"><label>Year of study</label>
                    <div className="yc-ycars" role="radiogroup" aria-label="Year of study">
                      {YEAR_OPTIONS.map(y => (
                        <button
                          type="button"
                          key={y}
                          className={`yc-ycar${yearOfStudy === y ? ' sel' : ''}`}
                          onClick={() => setYearOfStudy(yearOfStudy === y ? '' : y)}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="yc-verify">
                    <div className="vh">🎓 Student pass check</div>
                    <p className="yc-verify-note">
                      No upload needed right now — just carry your college / school ID along with you.
                      Our team verifies it on the day of the yatra, before you board.
                    </p>
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
                    <div className="bc-tl-item now"><div className="bc-tl-dot">●</div><div><b>Bring your college ID</b><span>Carry your college / school ID — our team verifies it on the day, before you board.</span></div></div>
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