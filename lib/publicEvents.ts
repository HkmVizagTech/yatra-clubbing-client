import { API_BASE } from '@/lib/api';
import type { PublicEvent, PublicEventCard } from '@/lib/publicTypes';

// Normalise whatever the API returns into a shape the pages can rely on, so
// every field access downstream is safe without optional chaining everywhere.
export function toPublic(e: PublicEvent): PublicEvent {
  const branding = e.branding || {};
  return {
    code: e.code,
    slug: e.slug,
    name: e.name || 'Yatra Clubbing',
    tagline: e.tagline || '',
    org: e.org || '',
    ageLimit: e.ageLimit || '',
    locations: Array.isArray(e.locations) ? e.locations.filter(Boolean) : [],
    description: e.description || '',
    venue: e.venue || '',
    dates: {
      display: e.dates?.display || '',
      start: e.dates?.start,
      end: e.dates?.end,
    },
    timeline: Array.isArray(e.timeline) ? e.timeline : [],
    tickets: (Array.isArray(e.tickets) ? e.tickets : []).map(t => ({
      key: t.key,
      name: t.name,
      price: t.price,
      was: t.was,
      maxQty: t.maxQty,
      description: t.description,
      tag: t.tag,
      requiresStudentId: t.requiresStudentId || false,
      features: t.features || [],
    })),
    branding: {
      heroDesktop: branding.heroDesktop,
      heroMobile: branding.heroMobile,
      themeColor: branding.themeColor,
      showCountdown: branding.showCountdown,
      mantra: branding.mantra,
    },
    receiptPrefix: e.receiptPrefix || 'YC-',
    status: e.status,
  };
}

// A failed fetch here is nearly always NEXT_PUBLIC_API_URL being unset, which
// leaves API_BASE pointing at localhost on the serverless host.
function logFetchFailure(url: string, err: unknown) {
  console.error(`[public] failed to fetch ${url}:`, err);
}

// Every published event, soonest first — what the home page lists.
export async function fetchActiveEvents(): Promise<PublicEventCard[]> {
  const url = `${API_BASE}/api/public/events`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      console.error(`[public] ${url} responded ${r.status}`);
      return [];
    }
    const data = await r.json();
    return Array.isArray(data?.events) ? (data.events as PublicEventCard[]) : [];
  } catch (err) {
    logFetchFailure(url, err);
    return [];
  }
}

// One event by its public code (the /YJ route).
export async function fetchEventByCode(code: string): Promise<PublicEvent | null> {
  const url = `${API_BASE}/api/public/event/${encodeURIComponent(code)}`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const data = await r.json();
    const event = data?.event as PublicEvent | null;
    return event ? toPublic(event) : null;
  } catch (err) {
    logFetchFailure(url, err);
    return null;
  }
}
