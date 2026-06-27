export async function POST(request: Request) {
  const url = process.env.FLAXXA_API_URL;
  const token = process.env.FLAXXA_TOKEN;
  const templateName = 'yatra_booking_confirmation';

  if (!url || !token) {
    return Response.json({ sent: false, reason: 'WhatsApp env vars not set' });
  }

  const body = await request.json().catch(() => ({})) as {
    name?: string; phone?: string; ref?: string; total?: number | string;
    tickets?: { general?: number; student?: number };
  };
  const { name = 'Devotee', phone, ref = '', total = '', tickets = {} } = body;
  if (!phone) return Response.json({ sent: false, error: 'Missing phone' }, { status: 400 });

  const mobile = '91' + String(phone).replace(/\D/g, '').slice(-10);
  const passDesc = [
    (tickets.general ?? 0) > 0 ? `General × ${tickets.general}` : '',
    (tickets.student ?? 0) > 0 ? `Student × ${tickets.student}` : '',
  ].filter(Boolean).join(', ') || 'Pass';

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: mobile,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: name },
            { type: 'text', text: passDesc },
            { type: 'text', text: String(total) },
            { type: 'text', text: ref },
          ],
        }],
      },
    }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) console.warn('[whatsapp] error', r.status, JSON.stringify(data));
  return Response.json({ sent: r.ok, status: r.status, data });
}
