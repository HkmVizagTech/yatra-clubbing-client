// POST /api/create-order  { amount: <rupees>, receipt: <string> }
// Creates a Razorpay order. Secret key stays here (server-side env), never in the page.
// Env vars (set in Vercel → Settings → Environment Variables):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) return res.status(500).json({ error: 'Razorpay keys not configured' });

  const { amount, receipt } = req.body || {};
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(key + ':' + secret).toString('base64'),
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        receipt: receipt || ('yc_' + Date.now()),
        notes: { event: 'Ramayana Circuit Yatra' },
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.status(200).json({ orderId: data.id, amount: data.amount, currency: data.currency, keyId: key });
  } catch (e) {
    return res.status(502).json({ error: 'Order creation failed', detail: String(e) });
  }
}
