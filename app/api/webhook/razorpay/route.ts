import crypto from 'crypto';
import { getDb, isMongoConfigured } from '@/lib/mongodb';

type RazorpayEvent = {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
        contact?: string;
        email?: string;
      };
    };
    order?: {
      entity: { id: string; receipt?: string };
    };
  };
};

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    console.warn('[webhook/razorpay] Invalid signature');
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as RazorpayEvent;
  const eventName = event.event;

  if (eventName === 'payment.captured' || eventName === 'order.paid') {
    const payment = event.payload.payment?.entity;
    if (!payment) return Response.json({ ok: true });

    if (!isMongoConfigured()) {
      console.warn('[webhook/razorpay] MongoDB not configured');
      return Response.json({ ok: true });
    }

    try {
      const db = await getDb();

      // Find and update the booking
      const row = await db.collection('registrations').findOneAndUpdate(
        { order_id: payment.order_id, payment_status: { $ne: 'paid' } },
        { $set: { payment_status: 'paid', payment_id: payment.id } },
        { returnDocument: 'after' }
      );

      if (!row) {
        // Already paid or not found — idempotent, not an error
        return Response.json({ ok: true });
      }

      console.log('[webhook/razorpay] Payment confirmed:', payment.order_id, '→', payment.id);

      // Send WhatsApp confirmation (fire-and-forget)
      const wUrl = process.env.FLAXXA_API_URL;
      const wToken = process.env.FLAXXA_TOKEN;
      if (wUrl && wToken && row.phone) {
        const mobile = '91' + String(row.phone).replace(/\D/g, '').slice(-10);
        const passDesc = [
          (row.qty_general || 0) > 0 ? `General × ${row.qty_general}` : '',
          (row.qty_student || 0) > 0 ? `Student × ${row.qty_student}` : '',
        ].filter(Boolean).join(', ') || 'Pass';

        fetch(wUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + wToken },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: mobile,
            type: 'template',
            template: {
              name: 'yatra_booking_confirmation',
              language: { code: 'en' },
              components: [{
                type: 'body',
                parameters: [
                  { type: 'text', text: row.name || 'Devotee' },
                  { type: 'text', text: passDesc },
                  { type: 'text', text: String(row.total || 0) },
                  { type: 'text', text: row.ref || '' },
                ],
              }],
            },
          }),
        }).catch(e => console.warn('[webhook/razorpay] WhatsApp failed:', e.message));
      }
    } catch (e) {
      console.error('[webhook/razorpay] DB error:', e);
      return Response.json({ error: String(e) }, { status: 502 });
    }
  }

  return Response.json({ ok: true });
}
