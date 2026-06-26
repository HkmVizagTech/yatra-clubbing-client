// POST /api/register  { ref, name, phone, email, tickets, total, studentStatus, payment }
// Saves a confirmed booking. Forwards to your Bhajan backend if configured; otherwise
// just logs (so the flow still completes in demo).
// Env: BHAJAN_API_URL (base), BHAJAN_API_KEY (optional)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const booking = req.body || {};
  const base = process.env.BHAJAN_API_URL;

  if (!base) {
    console.log('[register] (no BHAJAN_API_URL set) booking:', JSON.stringify(booking));
    return res.status(200).json({ saved: false, configured: false });
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.BHAJAN_API_KEY) headers['Authorization'] = 'Bearer ' + process.env.BHAJAN_API_KEY;
    const r = await fetch(base.replace(/\/$/, '') + '/registrations', {
      method: 'POST', headers, body: JSON.stringify(booking),
    });
    const data = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : 502).json({ saved: r.ok, data });
  } catch (e) {
    return res.status(502).json({ saved: false, error: String(e) });
  }
}
