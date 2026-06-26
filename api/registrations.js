// GET /api/registrations
//   Header:  Authorization: Bearer <ADMIN_TOKEN>
//   Returns all registrations (newest first) for the admin panel, with a
//   short-lived signed URL for each student ID image.
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const admin = process.env.ADMIN_TOKEN;
  if (!url || !key || !admin) return res.status(500).json({ error: 'Server not configured' });

  // Auth — shared admin password via Bearer header (or ?token= fallback)
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = auth || (req.query && req.query.token) || '';
  if (token !== admin) return res.status(401).json({ error: 'Unauthorized' });

  const base = url.replace(/\/$/, '');
  const headers = { apikey: key, Authorization: 'Bearer ' + key };

  try {
    const r = await fetch(`${base}/rest/v1/registrations?select=*&order=created_at.desc`, { headers });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(502).json({ error: 'fetch failed', detail });
    }
    const rows = await r.json();

    // Sign ID-card paths so the admin can view them (1 hour validity)
    await Promise.all(rows.map(async (row) => {
      if (!row.id_card_path) return;
      try {
        const s = await fetch(`${base}/storage/v1/object/sign/student-ids/${row.id_card_path}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: 3600 }),
        });
        if (s.ok) {
          const data = await s.json();
          if (data && data.signedURL) row.id_card_url = base + '/storage/v1' + data.signedURL;
        }
      } catch (_) { /* ignore individual sign failures */ }
    }));

    return res.status(200).json({ count: rows.length, registrations: rows });
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
}
