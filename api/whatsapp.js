// POST /api/whatsapp  { name, phone, ref, tickets, total }
// Sends a WhatsApp booking confirmation via Flaxxa Wapi (Official WhatsApp Business API).
//
// Env vars (Vercel → Settings → Environment Variables):
//   FLAXXA_API_URL      Send-message endpoint from Flaxxa dashboard, e.g.
//                       https://graph.facebook.com/v19.0/<phone-number-id>/messages
//                       OR the Flaxxa proxy endpoint — check your Flaxxa dashboard → API
//   FLAXXA_TOKEN        Access token (from Flaxxa dashboard → API Access)
//   FLAXXA_TEMPLATE     Template name you submitted (default: yatra_booking_confirmation)
//
// Template must be approved in Flaxxa → Templates before messages send.
// While not configured, endpoint returns 200 { sent: false } — booking still completes.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const url   = process.env.FLAXXA_API_URL;
  const token = process.env.FLAXXA_TOKEN;
  const templateName = process.env.FLAXXA_TEMPLATE || 'yatra_booking_confirmation';

  if (!url || !token) {
    return res.status(200).json({ sent: false, reason: 'WhatsApp env vars not set' });
  }

  const { name = 'Devotee', phone, ref = '', total = '', tickets = {} } = req.body || {};
  if (!phone) return res.status(400).json({ sent: false, error: 'Missing phone' });

  const mobile = '91' + String(phone).replace(/\D/g, '').slice(-10);

  const passDesc = [
    tickets.general > 0 ? `General × ${tickets.general}` : '',
    tickets.student > 0 ? `Student × ${tickets.student}` : '',
  ].filter(Boolean).join(', ') || 'Pass';

  // Official WhatsApp Business API — template message
  const payload = {
    messaging_product: 'whatsapp',
    to: mobile,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: name },
            { type: 'text', text: passDesc },
            { type: 'text', text: String(total) },
            { type: 'text', text: ref },
          ],
        },
      ],
    },
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
    if (!r.ok) console.warn('[whatsapp] error', r.status, JSON.stringify(data));
    return res.status(200).json({ sent: r.ok, status: r.status, data });
  } catch (e) {
    console.error('[whatsapp] fetch failed:', e.message);
    return res.status(200).json({ sent: false, error: String(e) });
  }
}
