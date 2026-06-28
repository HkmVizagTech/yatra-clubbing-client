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

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return Response.json({ error: 'Not configured' }, { status: 500 });

  const token = getToken(request);
  if (!token || token !== adminToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isMongoConfigured()) {
    return Response.json({ count: 0, registrations: [] });
  }

  try {
    const db = await getDb();
    const rows = await db.collection('registrations')
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    const registrations = rows.map(r => ({
      ...r,
      _id: r._id.toString(),
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));

    return Response.json({ count: registrations.length, registrations });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
