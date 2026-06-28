import crypto from 'crypto';
import { getDb, isMongoConfigured } from '@/lib/mongodb';

async function uploadToCloudinary(b64: string, mime: string, publicId: string): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'student-ids';
  const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha256').update(paramsToSign + apiSecret).digest('hex');

  const form = new FormData();
  form.append('file', `data:${mime};base64,${b64}`);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', folder);
  form.append('public_id', publicId);

  const resourceType = mime.includes('pdf') ? 'raw' : 'image';
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!r.ok) return null;
  const data = await r.json() as { secure_url?: string };
  return data.secure_url || null;
}

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as Record<string, unknown>;

  if (!isMongoConfigured()) {
    console.log('[register] MongoDB not configured — booking:', JSON.stringify({ ...b, idCard: '[omitted]' }));
    return Response.json({ saved: false, configured: false });
  }

  const tickets = (b.tickets || {}) as Record<string, number>;
  const payment = (b.payment || {}) as Record<string, string>;

  let idCardUrl: string | null = null;
  const idCard = b.idCard as { data?: string; type?: string } | null;
  if (idCard?.data) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(idCard.data);
    const mime = m?.[1] || idCard.type || 'application/octet-stream';
    const b64 = m ? m[2] : idCard.data;
    const publicId = `${b.ref || 'id'}-${Date.now()}`;
    idCardUrl = await uploadToCloudinary(b64, mime, publicId).catch(() => null);
  }

  const now = new Date();
  const setFields: Record<string, unknown> = {
    ref: b.ref,
    name: b.name,
    phone: b.phone,
    email: b.email || null,
    pass_type: (tickets.student > 0 && !(tickets.general > 0)) ? 'student' : 'general',
    qty_general: tickets.general || 0,
    qty_student: tickets.student || 0,
    total: b.total || 0,
    student_status: b.studentStatus || null,
    payment_id: payment.paymentId || null,
    order_id: payment.orderId || null,
    payment_signature: payment.signature || null,
    payment_status: payment.status || (payment.paymentId ? 'paid' : 'pending'),
    raw: { ...b, idCard: undefined },
    updated_at: now,
  };
  // Only write the ID URL when a fresh upload succeeded, so the later "paid"
  // update (sent without the file) never wipes a previously stored ID.
  if (idCardUrl) setFields.id_card_url = idCardUrl;

  try {
    const db = await getDb();
    // Upsert by ref: the booking is saved once on entry (status: pending) and
    // updated in place when payment completes — so incomplete bookings are
    // still captured and completed ones don't create a duplicate row.
    await db.collection('registrations').updateOne(
      { ref: b.ref },
      { $set: setFields, $setOnInsert: { created_at: now } },
      { upsert: true },
    );
    return Response.json({ saved: true, idStored: !!idCardUrl });
  } catch (e) {
    return Response.json({ saved: false, error: String(e) }, { status: 502 });
  }
}
