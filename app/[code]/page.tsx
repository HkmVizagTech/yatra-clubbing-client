import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import EventLanding from '../components/EventLanding';
import { fetchEventByCode } from '@/lib/publicEvents';
import { cdnImage } from '@/lib/img';
import { readableSlug, eventPath } from '@/lib/links';

// The admin can publish or unpublish at any moment, so never cache.
export const dynamic = 'force-dynamic';

// Paths that belong to the app itself and must never be read as an event code.
// Next.js already gives static segments (/admin, /login) priority over this
// dynamic one; this list is the belt to that pair of braces, and also covers
// stray requests like /favicon.ico reaching the catch-all.
const RESERVED = new Set([
  'admin', 'login', 'logout', 'api', 'favicon.ico', 'robots.txt',
  'sitemap.xml', '_next', 'static', 'assets', 'public', 'success',
]);

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  if (RESERVED.has(code.toLowerCase())) return {};
  const event = await fetchEventByCode(code);
  if (!event) return { title: 'Event not found' };

  // Shared on WhatsApp far more than it is found on Google, so the poster and a
  // one-line summary matter more here than anything else. og:image needs a real
  // pixel size to render as a large card rather than a thumbnail.
  const poster = event.branding.heroDesktop || event.branding.heroMobile || '';
  const cheapest = event.tickets.reduce<number | null>(
    (min, t) => (typeof t.price === 'number' && (min === null || t.price < min) ? t.price : min),
    null
  );

  const summary = [
    event.dates.display,
    event.venue,
    cheapest != null ? (cheapest > 0 ? `From \u20b9${cheapest}` : 'Free entry') : null,
  ].filter(Boolean).join(' · ');

  const description = event.tagline ? `${event.tagline} — ${summary}` : summary;
  const url = eventPath(event);

  return {
    title: event.name,
    description: description || undefined,
    alternates: { canonical: url },
    openGraph: {
      title: `${event.name} · Yatra Clubbing`,
      description: description || undefined,
      url,
      type: 'website',
      images: poster
        ? [{ url: cdnImage(poster, 1200), width: 1200, height: 1500, alt: `${event.name} poster` }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.name} · Yatra Clubbing`,
      description: description || undefined,
      images: poster ? [cdnImage(poster, 1200)] : undefined,
    },
    // A closed or cancelled event shouldn't be collecting search traffic.
    robots: event.status === 'active' ? undefined : { index: false, follow: true },
  };
}

export default async function EventPage({ params }: Params) {
  const { code } = await params;
  if (RESERVED.has(code.toLowerCase())) notFound();

  const event = await fetchEventByCode(code);
  if (!event) notFound();

  // The readable slug is the canonical address; /RT26 and any other alias
  // forward to it so there is one link per trip.
  const canonical = readableSlug(event.slug);
  if (canonical && code.toLowerCase() !== canonical.toLowerCase()) {
    permanentRedirect('/' + canonical);
  }

  return <EventLanding event={event} />;
}
