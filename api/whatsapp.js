// POST /api/whatsapp  { name, phone, ref, tickets, total, pass_type }
// Sends a WhatsApp booking confirmation via Flaxxa Wapi.
//
// Env vars (Vercel → Settings → Environment Variables):
//   FLAXXA_API_URL     The send-message endpoint, e.g. https://app.flaxxa.com/api/v1/message/send
//   FLAXXA_TOKEN       Your Flaxxa API token (from dashboard → API Access)
//   FLAXXA_INSTANCE    Your WhatsApp instance / device ID (from Flaxxa dashboard)
//
// If any var is missing the endpoint returns 200 { sent: false } — booking still succeeds.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const url = process.env.FLAXXA_API_URL;
  const token = process.env.FLAXXA_TOKEN;
  const instance = process.env.FLAXXA_INSTANCE;

  if (!url || !token || !instance) {
    return res.status(200).json({ sent: false, reason: 'WhatsApp env vars not set' });
  }

  const { name = 'Devotee', phone, ref = '', total = '', tickets = {} } = req.body || {};
  if (!phone) return res.status(400).json({ sent: false, error: 'Missing phone' });

  const mobile = '91' + String(phone).replace(/\D/g, '').slice(-10);

  const passLines = [];
  if (tickets.general > 0) passLines.push(`• General pass × ${tickets.general}`);
  if (tickets.student > 0) passLines.push(`• Student pass × ${tickets.student}`);

  const message =
    `Hare Krishna ${name}! 🙏\n\n` +
    `Your booking for the *Ramayana Circuit Yatra* is confirmed.\n\n` +
    `📅 Sat, 11 July 2026 · 7:00 AM\n` +
    (passLines.length ? passLines.join('\n') + '\n' : '') +
    (total ? `💰 Paid: ₹${total}\n` : '') +
    (ref ? `🎟 Ref: *${ref}*\n` : '') +
    `\nYour pass details will be shared before the yatra.\n` +
    `— Hare Krishna Vaikuntham 🙏`;

  // Flaxxa Wapi send-message payload
  const payload = {
    instance_id: instance,
    to: mobile,
    type: 'text',
    message,
  };

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) console.warn('[whatsapp] Flaxxa error', r.status, JSON.stringify(data));
    return res.status(200).json({ sent: r.ok, status: r.status, data });
  } catch (e) {
    console.error('[whatsapp] fetch failed:', e.message);
    return res.status(200).json({ sent: false, error: String(e) });
  }
}
