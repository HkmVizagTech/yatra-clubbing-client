import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import EventLanding from '../components/EventLanding';
import { fetchEventByCode } from '@/lib/publicEvents';

// The admin can publish or unpublish at any moment, so never cache.
export const dynamic = 'force-dynamic';

// Paths that belong to the app itself and must never be read as an event code.
// Next.js already gives static segments (/admin, /login) priority over this
// dynamic one; this list is the belt to that pair of braces, and also covers
// stray requests like /favicon.ico reaching the catch-all.
const RESERVED = new Set([
  'admin', 'login', 'logout', 'api', 'favicon.ico', 'robots.txt',
  'sitemap.xml', '_next', 'static', 'assets', 'public',
]);

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  if (RESERVED.has(code.toLowerCase())) return {};
  const event = await fetchEventByCode(code);
  if (!event) return { title: 'Event not found · Yatra Clubbing' };
  return {
    title: `${event.name} · Yatra Clubbing`,
    description: event.tagline || undefined,
  };
}

export default async function EventPage({ params }: Params) {
  const { code } = await params;
  if (RESERVED.has(code.toLowerCase())) notFound();

  const event = await fetchEventByCode(code);
  if (!event) notFound();

  return <EventLanding event={event} />;
}
