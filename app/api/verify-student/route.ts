import { getDb, isMongoConfigured } from '@/lib/mongodb';

function getToken(request: Request): string {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.match(/yc_admin_token=([^;]+)/)?.[1] || '';
  // Cookie values are URL-encoded when set (e.g. "@" -> "%40"); decode before comparing.
  let cookieToken = '';
  if (raw) {
    try { cookieToken = decodeURIComponent(raw); } catch { cookieToken = raw; }
  }
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return cookieToken || bearer;
}

export async function POST(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return Response.json({ error: 'Not configured' }, { status: 500 });

  const token = getToken(request);
  if (!token || token !== adminToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { ref?: string; action?: string; reason?: string };
  const { ref, action, reason = '' } = body;
  if (!ref || !['approve', 'reject'].includes(action || '')) {
    return Response.json({ error: 'Missing ref or invalid action' }, { status: 400 });
  }

  if (!isMongoConfigured()) {
    return Response.json({ updated: false, reason: 'MongoDB not configured' });
  }

  const newStatus = action === 'approve' ? 'verified' : ('rejected' + (reason ? ` — ${reason}` : ''));

  try {
    const db = await getDb();
    const row = await db.collection('registrations').findOneAndUpdate(
      { ref },
      { $set: { student_status: newStatus } },
      { returnDocument: 'after' }
    );

    if (!row) return Response.json({ updated: false, error: 'Booking not found' }, { status: 404 });

    const wUrl = process.env.FLAXXA_API_URL;
    const wToken = process.env.FLAXXA_TOKEN;
    if (wUrl && wToken && row.phone) {
      const mobile = '91' + String(row.phone).replace(/\D/g, '').slice(-10);
      const templateName = action === 'approve' ? 'student_id_approved' : 'student_id_rejected';
      const params = action === 'approve'
        ? [{ type: 'text', text: row.name || 'Devotee' }, { type: 'text', text: ref }]
        : [{ type: 'text', text: row.name || 'Devotee' }, { type: 'text', text: ref }, { type: 'text', text: reason || 'ID could not be verified' }];

      fetch(wUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + wToken },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: mobile, type: 'template',
          template: { name: templateName, language: { code: 'en' }, components: [{ type: 'body', parameters: params }] },
        }),
      }).catch(e => console.warn('[verify-student] WhatsApp failed:', e.message));
    }

    return Response.json({ updated: true, ref, status: newStatus });
  } catch (e) {
    return Response.json({ updated: false, error: String(e) }, { status: 502 });
  }
}
