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

async function issueRefund(paymentId: string): Promise<{ ok: boolean; refundId?: string; error?: string; amount?: number }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return { ok: false, error: 'Razorpay not configured' };

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  try {
    // First fetch payment details to get the amount
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const payData = await payRes.json() as { amount?: number; status?: string; error?: { description?: string } };

    if (!payRes.ok) {
      return { ok: false, error: payData.error?.description || `Payment fetch failed: HTTP ${payRes.status}` };
    }

    // Attempt full refund
    const refRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const refData = await refRes.json() as { id?: string; error?: { description?: string; code?: string } };

    if (refRes.ok && refData.id) {
      return { ok: true, refundId: refData.id, amount: payData.amount };
    }

    const desc = refData.error?.description || '';
    if (desc.toLowerCase().includes('already') && desc.toLowerCase().includes('refund')) {
      return { ok: true, refundId: 'already-refunded', amount: payData.amount };
    }

    return { ok: false, error: desc || `HTTP ${refRes.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function POST(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return Response.json({ error: 'Not configured' }, { status: 500 });
  const token = getToken(request);
  if (!token || token !== adminToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { paymentIds?: string[] };
  const ids = (body.paymentIds || []).map((s: string) => s.trim()).filter(Boolean);

  if (!ids.length) return Response.json({ error: 'No payment IDs provided' }, { status: 400 });

  const db = isMongoConfigured() ? await getDb() : null;

  const results: Array<{ paymentId: string; ok: boolean; refundId?: string; amount?: number; error?: string }> = [];

  for (const paymentId of ids) {
    const res = await issueRefund(paymentId);

    // Try to mark in MongoDB if booking exists with this payment_id
    if (db && res.ok) {
      await db.collection('registrations').updateOne(
        { payment_id: paymentId },
        { $set: { payment_status: 'refunded', refund_id: res.refundId, refunded_at: new Date() } }
      ).catch(() => {});
    }

    results.push({ paymentId, ...res });
  }

  const refunded = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  return Response.json({ refunded, failed, results });
}
