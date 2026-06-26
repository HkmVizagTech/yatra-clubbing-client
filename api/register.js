// POST /api/register
//   { ref, name, phone, email, tickets:{general,student}, total, studentStatus,
//     payment:{paymentId,orderId,signature,status}, idCard:{data,type,name} }
//
// Saves a confirmed booking to Supabase. If a student ID image is included it is
// uploaded to the private `student-ids` bucket and its path stored on the row.
// Falls back to a console log (demo) when Supabase env vars are not set.
//
// Env (Vercel → Settings → Environment Variables):
//   SUPABASE_URL            e.g. https://abcd.supabase.co
//   SUPABASE_SERVICE_KEY    the service_role secret (server-side only)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const b = req.body || {};
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.log('[register] (Supabase not configured) booking:', JSON.stringify({ ...b, idCard: b.idCard ? '[image]' : undefined }));
    return res.status(200).json({ saved: false, configured: false });
  }

  const base = url.replace(/\/$/, '');
  const tickets = b.tickets || {};
  const payment = b.payment || {};

  try {
    // 1) Upload student ID image (if present) to the private bucket
    let idCardPath = null;
    if (b.idCard && b.idCard.data) {
      const m = /^data:([^;]+);base64,(.*)$/.exec(b.idCard.data);
      const mime = (m && m[1]) || b.idCard.type || 'application/octet-stream';
      const b64 = m ? m[2] : b.idCard.data;
      const ext = mime.includes('pdf') ? 'pdf' : (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      idCardPath = `${b.ref || 'id'}-${Date.now()}.${ext}`;
      const up = await fetch(`${base}/storage/v1/object/student-ids/${idCardPath}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': mime, 'x-upsert': 'true' },
        body: Buffer.from(b64, 'base64'),
      });
      if (!up.ok) {
        const detail = await up.text().catch(() => '');
        console.warn('[register] ID upload failed:', up.status, detail);
        idCardPath = null; // don't block the booking on an upload hiccup
      }
    }

    // 2) Insert the registration row
    const row = {
      ref: b.ref,
      name: b.name,
      phone: b.phone,
      email: b.email || null,
      pass_type: (tickets.student > 0 && !(tickets.general > 0)) ? 'student' : 'general',
      qty_general: tickets.general || 0,
      qty_student: tickets.student || 0,
      total: b.total || 0,
      student_status: b.studentStatus || null,
      id_card_path: idCardPath,
      payment_id: payment.paymentId || null,
      order_id: payment.orderId || null,
      payment_signature: payment.signature || null,
      payment_status: payment.status || (payment.paymentId ? 'paid' : 'pending'),
      raw: { ...b, idCard: undefined },
    };

    const r = await fetch(`${base}/rest/v1/registrations`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(502).json({ saved: false, error: 'insert failed', detail });
    }
    return res.status(200).json({ saved: true, idStored: !!idCardPath });
  } catch (e) {
    return res.status(502).json({ saved: false, error: String(e) });
  }
}
