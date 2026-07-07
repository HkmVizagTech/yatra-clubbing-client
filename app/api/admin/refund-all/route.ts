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

async function issueRefund(paymentId: string): Promise<{ ok: boolean; refundId?: string; error?: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return { ok: false, error: 'Razorpay not configured' };

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  try {
    const r = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // empty body = full refund
    });
    const data = await r.json() as { id?: string; error?: { description?: string; code?: string } };

    if (r.ok && data.id) return { ok: true, refundId: data.id };

    const desc = data.error?.description || '';
    // Treat "already fully refunded" as success so re-runs are idempotent
    if (desc.includes('already') || desc.includes('fully refunded') || data.error?.code === 'BAD_REQUEST_ERROR') {
      const details = desc.toLowerCase();
      if (details.includes('refund') && details.includes('already')) return { ok: true, refundId: 'already-refunded' };
    }

    return { ok: false, error: desc || `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return Response.json({ error: 'Not configured' }, { status: 500 });
  const token = getToken(request);
  if (!token || token !== adminToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isMongoConfigured()) return Response.json({ error: 'MongoDB not configured' }, { status: 500 });

  const db = await getDb();
  const paid = await db.collection('registrations')
    .find({ payment_status: 'paid', payment_id: { $exists: true, $ne: null } })
    .project({ ref: 1, name: 1, phone: 1, total: 1, payment_id: 1, payment_status: 1 })
    .toArray();

  const refunded = await db.collection('registrations').countDocuments({ payment_status: 'refunded' });

  return Response.json({ pending: paid.length, alreadyRefunded: refunded, bookings: paid.map(b => ({ ref: b.ref, name: b.name, phone: b.phone, total: b.total, payment_id: b.payment_id })) });
}

export async function POST(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return Response.json({ error: 'Not configured' }, { status: 500 });
  const token = getToken(request);
  if (!token || token !== adminToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isMongoConfigured()) return Response.json({ error: 'MongoDB not configured' }, { status: 500 });

  const db = await getDb();
  const paid = await db.collection('registrations')
    .find({ payment_status: 'paid', payment_id: { $exists: true, $ne: null } })
    .toArray();

  const results: Array<{ ref: string; name: string; phone: string; total: number; ok: boolean; refundId?: string; error?: string }> = [];

  for (const booking of paid) {
    const res = await issueRefund(String(booking.payment_id));
    if (res.ok) {
      await db.collection('registrations').updateOne(
        { ref: booking.ref },
        { $set: { payment_status: 'refunded', refund_id: res.refundId, refunded_at: new Date() } }
      );
    }
    results.push({ ref: booking.ref, name: booking.name, phone: booking.phone, total: booking.total || 0, ok: res.ok, refundId: res.refundId, error: res.error });
  }

  const refunded = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  return Response.json({ refunded, failed, total: paid.length, results });
}
