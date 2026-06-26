// POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Verifies the Razorpay payment signature server-side. Returns { valid: true|false }.
// Env: RAZORPAY_KEY_SECRET
import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(500).json({ error: 'Razorpay secret not configured' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ valid: false, error: 'Missing fields' });
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  const a = Buffer.from(expected), b = Buffer.from(String(razorpay_signature));
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  return res.status(valid ? 200 : 400).json({ valid });
}
