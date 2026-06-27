export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Response.json({ error: 'Razorpay not configured' }, { status: 503 });
  }

  const { amount, receipt } = await request.json().catch(() => ({})) as { amount?: number; receipt?: string };
  if (!amount) return Response.json({ error: 'amount required' }, { status: 400 });

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: receipt || 'yatra' }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return Response.json({ error: 'Razorpay order failed', detail }, { status: 502 });
  }

  const order = await r.json() as { id: string; amount: number; currency: string };
  return Response.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
}
