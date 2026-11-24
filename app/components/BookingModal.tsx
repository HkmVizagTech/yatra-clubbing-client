'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Select from './Select';
import JourneyScene from './JourneyScene';
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
  pass_key?: string;
  organisation?: string | null;
  id_card?: string;
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
const CalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/></svg>
);
const UsersIcon2 = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M2 21c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"/><path d="M16 3.3a4 4 0 0 1 0 7.4"/><path d="M22 21c0-2.7-1.8-4.8-4.5-5.3"/></svg>
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

/**
 * The registration form. `inline` renders it as a card in the page (always
 * open, no overlay); otherwise it is the pop-up sheet with its own trigger.
 */
export default function BookingModal({ event, inline = false }: { event: PublicEvent; inline?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(inline);
  const [tierKey, setTierKey] = useState<string | undefined>(
    () => event.tickets[0]?.key
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
  const [org, setOrg] = useState('');
  const [idCard, setIdCard] = useState('');
  const [idName, setIdName] = useState('');
  const [idBusy, setIdBusy] = useState(false);
  const [picked, setPicked] = useState(false);
  // Special price: 'yes' once the typed mobile number is found on the admin's uploaded list.
  const [returning, setReturning] = useState<'idle' | 'checking' | 'yes' | 'no'>('idle'); // student/working switch must be chosen explicitly
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const tier: PublicTicketTier | undefined = event.tickets.find(t => t.key === tierKey) || event.tickets[0];
  const returningOn = !!event.returning?.enabled && event.tickets.some(t => t.returningPrice != null && Number(t.returningPrice) > 0);
  const priceOf = (t: PublicTicketTier) =>
    returning === 'yes' && t.returningPrice != null && Number(t.returningPrice) > 0 ? Number(t.returningPrice) : (t.price || 0);
  const total = tier ? priceOf(tier) : 0;
  const listTag = event.returning?.label ? ` (${event.returning.label})` : '';
  // A returning attendee on a trip set to skip the ID doesn't upload one (the server re-checks this).
  const idWaived = returning === 'yes' && !!event.returning?.skipId && !!tier?.requiresStudentId;
  const isStudent = !!tier?.requiresStudentId;
  const studentTiers = event.tickets.filter(t => t.requiresStudentId);
  const workingTiers = event.tickets.filter(t => !t.requiresStudentId);
  // One student pass + one working pass → a simple "I am a…" switch.
  const simpleBoth = studentTiers.length === 1 && workingTiers.length === 1;
  const samePrice = simpleBoth && priceOf(studentTiers[0]) === priceOf(workingTiers[0]);
  const hasStudentPass = event.tickets.some(t => t.requiresStudentId);
  const hasWorkingPass = event.tickets.some(t => !t.requiresStudentId);

  const ageNum = Number(age);
  const ageOk = Number.isInteger(ageNum) && ageNum >= 10 && ageNum <= 100;

  const canConfirm = useCallback(() => {
    const nameOk = name.trim().length > 0;
    const phoneOk = /^[0-9]{10}$/.test(phone.trim());
    const studentOk = !isStudent || (college.trim().length > 0 && (idCard.length > 0 || idWaived));
    const genderOk = GENDER_OPTIONS.some(g => g.value === gender);
    return Boolean(tier) && (!simpleBoth || picked) && nameOk && ageOk && genderOk && phoneOk && studentOk;
  }, [name, ageOk, gender, phone, college, idCard, isStudent, idWaived, tier, simpleBoth, picked]);

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
    setOrg('');
    setIdCard('');
    setIdName('');
    setPicked(false);
    setError('');
    setStep(1);
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

  // When the admin has uploaded a list, look the mobile number up as soon as it
  // is complete. No list uploaded → nothing is checked.
  useEffect(() => {
    if (!returningOn) return;
    const p = phone.trim();
    if (!/^[0-9]{10}$/.test(p)) { setReturning('idle'); return; }
    let cancelled = false;
    setReturning('checking');
    const t = setTimeout(async () => {
      try {
        const d = await api('/api/public/check-attendee', { event_code: event.code, phone: p }) as { listed?: boolean };
        if (!cancelled) setReturning(d.listed ? 'yes' : 'no');
      } catch {
        if (!cancelled) setReturning('no');
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, returningOn, event.code]);

  useEffect(() => {
    function handler() {
      if (inline) {
        document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      openNow();
    }
    window.addEventListener('yatra:open-booking', handler);
    return () => window.removeEventListener('yatra:open-booking', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  // While the sheet is open: lock the page behind it and let Escape close it.
  useEffect(() => {
    if (!open || inline) return;
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

  // Phone photos are 3–8 MB. Shrink to ~1400px JPEG so the upload is quick and
  // still readable when the team checks the ID.
  function compressImage(file: File, maxSide = 1400, quality = 0.82): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('canvas')); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  async function onPickId(file?: File | null) {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please upload a photo of your ID as a JPG or PNG image.');
      return;
    }
    setIdBusy(true);
    try {
      setIdCard(await compressImage(file));
      setIdName(file.name);
    } catch {
      setError('We could not read that image. Please try another photo.');
    } finally {
      setIdBusy(false);
    }
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
      college: isStudent ? college.trim() : '',
      course: isStudent ? (course.trim() || null) : null,
      year_of_study: isStudent ? (yearOfStudy || null) : null,
      organisation: !isStudent ? (org.trim() || null) : null,
      pass_key: tier?.key,
      id_card: isStudent && !idWaived ? idCard : undefined,
      tickets: tier ? { [tier.key]: 1 } : {},
      total,
      studentStatus: isStudent ? (idWaived ? 'verified' : 'Pending ID verification') : null,
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
        tier_key: booking.pass_key,
        phone: booking.phone,
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
    try {
      const { id_card: _omit, ...lean } = booking;
      void _omit;
      await api('/api/register', { ...lean, payment });
    } catch { /* best-effort */ }

    try {
      const { id_card: _omit2, ...lean2 } = booking;
      void _omit2;
      await api('/api/whatsapp', { ...lean2, event_code: booking.event_code });
    } catch { /* best-effort */ }

    // The success screen lives on its own page, so leave the sheet.
    close();
    router.push(
      '/success?' + new URLSearchParams({
        ref: booking.ref,
        event: booking.event_code,
        name: booking.name,
        phone: booking.phone,
        total: String(booking.total),
        tier: tier?.key || '',
        idw: idWaived ? '1' : '',
      }).toString()
    );
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
      let saved: Record<string, unknown> | null = null;
      try { saved = await api('/api/register', booking); } catch { /* network blip: payment can still proceed for non-student passes */ }
      if (saved && saved.saved === false && saved.error) throw new Error(String(saved.error));
      if (!saved && isStudent && !idWaived) throw new Error('We could not save your details and ID. Check your connection and try again.');
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

  // The offer pill + "Save ₹X" row already announce an early-bird offer, so a
  // description that merely restates the same label (admins often reuse it)
  // would show the offer text twice — drop it.
  const descRepeatsOffer = (off: string | null, desc?: string | null) => {
    if (!off || !desc) return false;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const o = norm(off);
    const d = norm(desc);
    return d === o || d === o + 'offer' || o === d + 'offer';
  };

  const passPicker = () => {
    if (simpleBoth) {
      const opts = [workingTiers[0], studentTiers[0]];
      return (
        <div>
          <div className="yc-aud" role="radiogroup" aria-label="I am a">
            {opts.map(t => {
              const sel = picked && t.key === tier?.key;
              const stu = !!t.requiresStudentId;
              return (
                <button type="button" key={t.key} role="radio" aria-checked={sel} className={`yc-aud-opt${sel ? ' sel' : ''}`}
                  onClick={() => { setTierKey(t.key); setPicked(true); setError(''); }}>
                  <span className="ic" aria-hidden="true">{stu ? '🎓' : '💼'}</span>
                  <b>{stu ? 'Student' : 'Working professional'}</b>
                  {!samePrice && <em>{inr(priceOf(t))}</em>}
                  {stu && <small>Student ID required</small>}
                </button>
              );
            })}
          </div>
          <div className="yc-aud-total">
            {!picked ? 'Select one to continue' : <>{samePrice ? 'One amount for everyone' : 'You pay'} · <b>{inr(total)}</b></>}
          </div>
        </div>
      );
    }
    if (event.tickets.length <= 1 && tier) {
      const off = offerLabel(tier);
      return (
        <div className="yc-fee">
          <div className="yc-fee-row">
            <span className="lb">{returning === 'yes' ? 'Special price' : tier.requiresStudentId ? 'Student registration fee' : 'Registration fee'}</span>
            <span className="amt">
              {returning === 'yes' ? <s>{inr(tier.price || 0)}</s> : off && <s>{inr(tier.was as number)}</s>}
              <b>{inr(priceOf(tier))}</b>
            </span>
          </div>
          {returning !== 'yes' && off && <div className="yc-fee-save">{off} · save {inr(savings(tier))}</div>}
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
                  {returning === 'yes' ? <s>{inr(t.price || 0)}</s> : off && <s>{inr(t.was as number)}</s>}
                  <b>{inr(priceOf(t))}</b>
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
    <div className={inline ? 'bc-inline' : 'bc-overlay'} {...(inline ? {} : { 'data-lenis-prevent': true, role: 'dialog', 'aria-modal': true, 'aria-label': 'Register for the yatra', onClick: close })}>
      <div className="bc-modal" onClick={e => e.stopPropagation()}>
            <div className="bc-mhead">
              <div className="tt"><span className="pill">{event.name}</span><h3>Register your seat</h3></div>
              {!inline && <button className="bc-close" onClick={close}>✕</button>}
            </div>
            <JourneyScene variant="compact" />
            <div className="bc-steps"><div className={`s ${step === 1 ? 'on' : ''}`}></div><div className={`s ${step === 2 ? 'on' : ''}`}></div></div>
            <div className="bc-mbody" {...(inline ? {} : { 'data-lenis-prevent': true })}>

              {step === 1 && (
                <>
                  <div className="bc-field">
                    <label>{event.tickets.length > 1 ? 'Your pass' : 'Registration'}</label>
                    <div className="yc-audience">
                      {hasStudentPass && !hasWorkingPass && '🎓 Open to students only. Upload your valid student ID below to register.'}
                      {hasWorkingPass && !hasStudentPass && '💼 Open to working professionals. Pay the full amount below to register.'}
                      {hasStudentPass && hasWorkingPass && (simpleBoth ? 'Tell us who is registering. Students must upload a valid ID.' : 'Choose the pass that matches you. Students must upload a valid ID.')}
                    </div>
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
                      <Select
                        icon={<UsersIcon2 />}
                        value={gender}
                        onChange={setGender}
                        options={GENDER_OPTIONS}
                        placeholder="Choose…"
                        ariaLabel="Gender"
                      />
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

                  {returningOn && (
                    <div className={`yc-returning${returning === 'yes' ? ' ok' : ''}`} aria-live="polite">
                      {returning === 'yes' && (() => {
                        const special = tier && tier.returningPrice != null && Number(tier.returningPrice) > 0 ? ` Your price: ${inr(Number(tier.returningPrice))}` : ' Your special price is applied';
                        return idWaived ? `🎉 You are on our list${listTag}!${special}. No student ID needed.` : `🎉 You are on our list${listTag}!${special}.`;
                      })()}
                      {returning === 'checking' && 'Checking your number…'}
                      {returning === 'no' && (tier?.requiresStudentId && event.returning?.skipId ? 'Regular price applies, and your student ID is required below.' : 'Regular price applies.')}
                      {returning === 'idle' && `Are you on our special list${listTag}? Enter your mobile number to see your price.`}
                    </div>
                  )}

                  {isStudent ? (
                    <>
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

                      <div className="bc-grid2">
                        <div className="bc-field"><label>Course / study</label>
                          <div className="bc-input-wrap">
                            <span className="ic-field" aria-hidden="true"><BookIcon /></span>
                            <input className="bc-input has-icon" value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. B.Tech CSE" />
                          </div>
                        </div>
                        <div className="bc-field"><label>Year of study</label>
                          <Select
                            icon={<CalIcon />}
                            value={yearOfStudy}
                            onChange={setYearOfStudy}
                            options={YEAR_OPTIONS.map(y => ({ value: y, label: y }))}
                            placeholder="Choose…"
                            ariaLabel="Year of study"
                          />
                        </div>
                      </div>

                      {!idWaived && (<div className="bc-field">
                        <label>Student ID card <span style={{ color: '#C0392B' }}>*</span></label>
                        <label className="bc-upload" style={{ cursor: 'pointer' }}>
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onPickId(e.target.files?.[0])} />
                          {idCard ? (
                            <>
                              <img src={idCard} alt="Your student ID" style={{ maxHeight: 130, maxWidth: '100%', borderRadius: 10, margin: '0 auto 8px', display: 'block' }} />
                              <b>{idName || 'ID uploaded'}</b>
                              <span>Tap to replace</span>
                            </>
                          ) : (
                            <>
                              <span className="uic" aria-hidden="true">🪪</span>
                              <b>{idBusy ? 'Preparing photo…' : 'Upload your college / school ID'}</b>
                              <span>Required for the student pass · a clear photo, JPG or PNG</span>
                            </>
                          )}
                        </label>
                        <p className="yc-verify-note" style={{ marginTop: 8 }}>
                          Our team checks your ID before your pass is confirmed.
                        </p>
                      </div>)}
                    </>
                  ) : (
                    <div className="bc-field"><label>Company / organisation <span className="optional">(optional)</span></label>
                      <div className="bc-input-wrap">
                        <span className="ic-field" aria-hidden="true"><GradIcon /></span>
                        <input className="bc-input has-icon" value={org} onChange={e => setOrg(e.target.value)} placeholder="Where do you work?" />
                      </div>
                    </div>
                  )}

                  <button className="bc-btn" onClick={submit} disabled={busy || !canConfirm()}>
                    {busy ? 'Processing…' : `Proceed to pay · ${inr(total)}`}
                  </button>
                  {error && <div className="bc-hint err" style={{ display: 'block', color: '#FF8A8A' }}>{error}</div>}
                  <div className="bc-secure">🔒 Secure payment via Razorpay · UPI, cards &amp; netbanking</div>
                </>
              )}
        </div>
      </div>
    </div>
  );

  if (inline) return overlay;

  return (
    <>
      <button className="bc-navcta" onClick={() => openNow()}>Register now</button>
      {overlay ? createPortal(overlay, portalTarget()) : null}
    </>
  );
}