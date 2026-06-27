import crypto from 'crypto';

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return Response.json({ error: 'Razorpay secret not configured' }, { status: 500 });

  const body = await request.json().catch(() => ({})) as Record<string, string>;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return Response.json({ valid: false, error: 'Missing fields' }, { status: 400 });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(String(razorpay_signature));
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  return Response.json({ valid }, { status: valid ? 200 : 400 });
}
