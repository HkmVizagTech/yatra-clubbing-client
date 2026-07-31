import { getDb, isMongoConfigured } from '@/lib/mongodb';

function getToken(request: Request): string {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.match(/yc_admin_token=([^;]+)/)?.[1] || '';
  let cookieToken = '';
  if (raw) {
    try { cookieToken = decodeURIComponent(raw); } catch { cookieToken = raw; }
  }
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return cookieToken || bearer;
}

type RazorpayPayment = {
  id: string;
  amount: number;
  currency: string;
  status: string; // created, authorized, captured, refunded, failed
  captured: boolean;
  refund_status: string | null; // null, partial, full
  amount_refunded: number;
  email?: string;
  contact?: string;
  created_at: number;
  notes?: Record<string, string>;
};

async function fetchAllPayments(keyId: string, keySecret: string): Promise<RazorpayPayment[]> {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const all: RazorpayPayment[] = [];
  let skip = 0;
  const count = 100;

  while (true) {
    const r = await fetch(`https://api.razorpay.com/v1/payments?count=${count}&skip=${skip}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!r.ok) throw new Error(`Razorpay payments list failed: HTTP ${r.status}`);
    const data = await r.json() as { items: RazorpayPayment[] };
    all.push(...data.items);
    if (data.items.length < count) break;
    skip += count;
    if (skip > 10000) break; // safety cap
  }

  return all;
}

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return Response.json({ error: 'Not configured' }, { status: 500 });
  const token = getToken(request);
  if (!token || token !== adminToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return Response.json({ error: 'Razorpay not configured' }, { status: 500 });

  let payments: RazorpayPayment[];
  try {
    payments = await fetchAllPayments(keyId, keySecret);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }

  // Only payments that were actually captured (money taken) matter for refund purposes
  const captured = payments.filter(p => p.captured || p.status === 'captured' || p.status === 'refunded');

  // Cross-reference with MongoDB for name/ref where available
  const regByPaymentId = new Map<string, { ref: string; name: string; phone: string }>();
  if (isMongoConfigured()) {
    const db = await getDb();
    const regs = await db.collection('registrations')
      .find({ payment_id: { $exists: true, $ne: null } })
      .project({ ref: 1, name: 1, phone: 1, payment_id: 1 })
      .toArray();
    for (const r of regs) {
      regByPaymentId.set(String(r.payment_id), { ref: r.ref, name: r.name, phone: r.phone });
    }
  }

  const rows = captured.map(p => {
    const match = regByPaymentId.get(p.id);
    const fullyRefunded = p.refund_status === 'full' || p.amount_refunded >= p.amount;
    const partiallyRefunded = p.refund_status === 'partial' && !fullyRefunded;
    return {
      paymentId: p.id,
      ref: match?.ref || null,
      name: match?.name || p.notes?.name || null,
      phone: match?.phone || p.contact || null,
      amount: p.amount, // paise
      amountRefunded: p.amount_refunded,
      status: fullyRefunded ? 'refunded' : partiallyRefunded ? 'partial' : 'not_refunded',
      trackedInDb: Boolean(match),
      createdAt: new Date(p.created_at * 1000).toISOString(),
    };
  });

  const notRefunded = rows.filter(r => r.status !== 'refunded');
  const refunded = rows.filter(r => r.status === 'refunded');
  const untracked = rows.filter(r => !r.trackedInDb);

  return Response.json({
    totalCaptured: rows.length,
    refundedCount: refunded.length,
    notRefundedCount: notRefunded.length,
    untrackedCount: untracked.length,
    notRefundedAmount: notRefunded.reduce((s, r) => s + (r.amount - r.amountRefunded), 0),
    rows: rows.sort((a, b) => (a.status === 'refunded' ? 1 : 0) - (b.status === 'refunded' ? 1 : 0)),
  });
}
