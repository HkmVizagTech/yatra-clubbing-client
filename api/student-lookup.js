// POST /api/student-lookup  { mobile }
// Checks whether a mobile already exists as a verified Bhajan Clubbing student,
// so their earlier ID proof can be accepted (no re-upload). Returns { found: true|false }.
// Env: BHAJAN_API_URL (your Bhajan backend base), BHAJAN_API_KEY (optional)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const base = process.env.BHAJAN_API_URL;
  const { mobile } = req.body || {};
  if (!mobile) return res.status(400).json({ found: false, error: 'Missing mobile' });

  // Not configured yet → tell the client to fall back to ID upload.
  if (!base) return res.status(200).json({ found: false, configured: false });

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.BHAJAN_API_KEY) headers['Authorization'] = 'Bearer ' + process.env.BHAJAN_API_KEY;
    const r = await fetch(base.replace(/\/$/, '') + '/students?mobile=' + encodeURIComponent(mobile), { headers });
    const data = await r.json().catch(() => ({}));
    // Adjust to your API's shape; here we treat a non-empty record as "found".
    const found = !!(data && (data.found || (Array.isArray(data) ? data.length : data.id)));
    return res.status(200).json({ found });
  } catch (e) {
    return res.status(200).json({ found: false, error: String(e) });
  }
}
