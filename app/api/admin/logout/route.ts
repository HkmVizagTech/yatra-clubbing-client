import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('yc_admin_token');
  return Response.json({ ok: true });
}
