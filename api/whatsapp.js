// POST /api/whatsapp  { name, phone, ref, tickets, total, ... }
// Sends a WhatsApp booking confirmation via Flaxxa Wapi. Token stays server-side.
// Env vars (Vercel → Settings → Environment Variables):
//   FLAXXA_API_URL   e.g. https://wapi.flaxxa.com/api/send   (use the exact send-message
//                    endpoint from your Flaxxa Wapi dashboard / docs)
//   FLAXXA_TOKEN     your Flaxxa Wapi API token / access key
//   FLAXXA_INSTANCE  (if your account uses an instance / sender id)
//
// NOTE: Flaxxa Wapi's exact field names vary by account/plan. Adjust the `payload`
// below to match your dashboard's API reference (text vs template, `to` format, etc.).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const url = process.env.FLAXXA_API_URL, token = process.env.FLAXXA_TOKEN;
  if (!url || !token) return res.status(200).json({ sent: false, reason: 'WhatsApp not configured' });

  const { name = 'Devotee', phone, ref = '', total = '' } = req.body || {};
  if (!phone) return res.status(400).json({ sent: false, error: 'Missing phone' });

  const message =
    `Hare Krishna ${name}! 🙏\n` +
    `Your booking for the *Ramayana Circuit Yatra* (Sat, 11 July, 9:00 AM) is confirmed.\n` +
    (total ? `Amount paid: ₹${total}\n` : '') +
    (ref ? `Booking ref: ${ref}\n` : '') +
    `Your QR pass will follow before the yatra.\n— Hare Krishna Vaikuntham`;

  // Common Flaxxa-style payload — adjust keys to your account's API reference.
  const payload = {
    instance_id: process.env.FLAXXA_INSTANCE || undefined,
    to: '91' + String(phone).replace(/\D/g, '').slice(-10),
    type: 'text',
    message,
  };

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : 502).json({ sent: r.ok, data });
  } catch (e) {
    return res.status(502).json({ sent: false, error: String(e) });
  }
}
