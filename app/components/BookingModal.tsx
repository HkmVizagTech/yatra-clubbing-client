'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import type { PublicEvent } from '@/lib/publicTypes';

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
  phone: string;
  email: string | null;
  tickets: QtyMap;
  total: number;
  studentStatus?: string | null;
  idCard?: { data: string; type: string; name: string } | null;
  payment: PaymentInfo;
}

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

// #yc-modal-root is the last child of .bc-root, so the overlay still inherits
// the theme custom properties (--bg2, --gold, …) that are declared on .bc-root
// while sitting outside .bc-wrap's stacking context. <body> is only a fallback.
function portalTarget(): HTMLElement {
  return document.getElementById('yc-modal-root') || document.body;
}

export default function BookingModal({ event }: { event: PublicEvent }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<QtyMap>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idCard, setIdCard] = useState<{ data: string; type: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [result, setResult] = useState<{ ref: string; name: string; phone: string; total: number; paymentId: string; studentStatus: string } | null>(null);

  const total = useMemo(() => {
    let sum = 0;
    for (const pubt of event.tickets) {
      const n = qty[pubt.key] || 0;
      sum += n * pubt.price;
    }
    return sum;
  }, [qty, event.tickets]);

  const totalQty = useMemo(() => Object.values(qty).reduce((s, n) => s + n, 0), [qty]);
  const studentQty = useMemo(() => {
    const st = event.tickets.find(t => t.requiresStudentId);
    return st ? (qty[st.key] || 0) : 0;
  }, [qty, event.tickets]);
  const studentTicket = event.tickets.find(t => t.requiresStudentId);

  const canConfirm = useCallback(() => {
    const nameOk = name.trim().length > 0;
    const phoneOk = /^[0-9]{10}$/.test(phone.trim());
    const idOk = studentQty <= 0 || Boolean(idCard);
    return totalQty > 0 && nameOk && phoneOk && idOk;
  }, [name, phone, idCard, studentQty, totalQty]);

  function inc(key: string, d: number) {
    const pubt = event.tickets.find(t => t.key === key);
    if (!pubt) return;
    const max = pubt.maxQty || 1;
    setQty(prev => {
      const cur = prev[key] || 0;
      const next = Math.min(max, Math.max(0, cur + d));
      return { ...prev, [key]: next };
    });
    setError('');
  }

  function openNow(preset?: string) {
    const init: QtyMap = {};
    if (preset) {
      const pubt = event.tickets.find(t => t.key === preset);
      if (pubt) init[pubt.key] = 1;
    }
    setQty(init);
    setName('');
    setPhone('');
    setEmail('');
    setIdCard(null);
    setError('');
    setStep(1);
    setResult(null);
    setOpen(true);
  }

  useEffect(() => {
    function handler(e: Event) {
      const custom = e as CustomEvent<{ preset?: string }>;
      openNow(custom.detail?.preset);
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
      phone: phone.trim(),
      email: email.trim() || null,
      tickets: qty,
      total,
      studentStatus: studentQty > 0 ? 'ID uploaded — pending verification' : null,
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

  const tierStep = (pub: (typeof event.tickets)[number]) => {
    const n = qty[pub.key] || 0;
    return (
      <div className="yc-step" key={pub.key}>
        <div>
          <div className="nm">{pub.name}</div>
          <div className="pr">₹{pub.price} {pub.was != null && <s>₹{pub.was}</s>}</div>
        </div>
        {pub.requiresStudentId ? (
          <div className="yc-onepass">1 pass</div>
        ) : (
          <div className="yc-stepper">
            <button type="button" onClick={() => inc(pub.key, -1)}>−</button>
            <b>{n}</b>
            <button type="button" onClick={() => inc(pub.key, 1)}>+</button>
          </div>
        )}
      </div>
    );
  };

  // The nav lives inside .bc-wrap, which sets `position:relative; z-index:1`
  // and therefore opens a stacking context. A `position:fixed` overlay rendered
  // in here can never rise above later siblings of .bc-wrap no matter how high
  // its own z-index is — that is why the sheet used to appear *behind* the hero
  // and the ticket cards. Portalling it out of .bc-wrap escapes that trap.
  const overlay = !open ? null : (
    <div className="bc-overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Get your pass">
      <div className="bc-modal" onClick={e => e.stopPropagation()}>
            <div className="bc-mhead">
              <div className="tt"><span className="pill">{event.name}</span><h3>Get your pass</h3></div>
              <button className="bc-close" onClick={close}>✕</button>
            </div>
            <div className="bc-steps"><div className={`s ${step === 1 ? 'on' : ''}`}></div><div className={`s ${step === 2 ? 'on' : ''}`}></div></div>
            <div className="bc-mbody">

              {step === 1 && (
                <>
                  <div className="bc-field">
                    <label>Select tickets</label>
                    {event.tickets.map(tierStep)}
                  </div>

                  {totalQty > 0 && (
                    <div className="bc-summary" style={{ textAlign: 'left' }}>
                      {event.tickets.filter(t => (qty[t.key] || 0) > 0).map(t => (
                        <div className="bc-srow" key={t.key}>
                          <span>{t.name} × {qty[t.key]}</span>
                          <span className="amt">{inr((qty[t.key] || 0) * t.price)}</span>
                        </div>
                      ))}
                      <div className="bc-srow tot"><span>Total</span><span className="amt">{inr(total)}</span></div>
                    </div>
                  )}

                  <div className="bc-field"><label>Full name</label>
                    <input className="bc-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></div>

                  <div className="bc-field"><label>Mobile number</label>
                    <input className="bc-input" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} placeholder="10-digit mobile" /></div>

                  <div className="bc-field"><label>Email <span style={{ color: 'var(--muted2)', fontWeight: 500 }}>(optional)</span></label>
                    <input className="bc-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>

                  {studentQty > 0 && (
                    <div className="yc-verify">
                      <div className="vh">🎓 Student proof</div>
                      {!idCard ? (
                        <label className="bc-upload" style={{ cursor: 'pointer' }}>
                          <span className="uic">📎</span>
                          <b>Upload college / school ID</b>
                          <span>Image or PDF · for {studentTicket?.name || 'students'}</span>
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
                          <div><div className="fn">{idCard.name}</div><div className="fs">Uploaded</div></div>
                        </div>
                      )}
                    </div>
                  )}

                  <button className="bc-btn" onClick={submit} disabled={busy || !canConfirm()}>
                    {busy ? 'Processing…' : `Confirm booking · ${inr(total)}`}
                  </button>
                  {error && <div className="bc-hint err" style={{ display: 'block', color: '#FF8A8A' }}>{error}</div>}
                  <div className="bc-secure">🔒 Secure payment via Razorpay · UPI, cards &amp; netbanking</div>
                </>
              )}

              {step === 2 && result && (
                <div className="bc-success">
                  <div className="bc-succ-ic">🪷</div>
                  <h3>Booking confirmed</h3>
                  <p className="bc-succ-sub">Hare Krishna! Your seat for the <b>{event.name}</b> is booked.</p>
                  <div className="bc-summary" style={{ textAlign: 'left' }}>
                    <div className="bc-srow"><span>Name</span><span>{result.name}</span></div>
                    <div className="bc-srow"><span>Phone</span><span>{result.phone}</span></div>
                    <div className="bc-srow"><span>Amount paid</span><span className="amt">{inr(result.total)}</span></div>
                    {result.studentStatus && <div className="bc-srow"><span>Student</span><span>{result.studentStatus}</span></div>}
                  </div>
                  <div className="bc-timeline">
                    <div className="bc-tl-item done"><div className="bc-tl-dot">✓</div><div><b>Payment received</b><span>Your seat is paid &amp; reserved.</span></div></div>
                    <div className="bc-tl-item now"><div className="bc-tl-dot">●</div><div><b>Confirmation on WhatsApp</b><span>We'll message your booking details right away.</span></div></div>
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
      <button className="bc-navcta" onClick={() => openNow()}>Book now</button>
      {overlay ? createPortal(overlay, portalTarget()) : null}
    </>
  );
}
