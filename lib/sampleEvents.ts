import type { PublicEvent, PublicEventCard } from '@/lib/publicTypes';

/**
 * Local-preview fallback only. When the backend/database is unreachable during
 * `next dev`, the public pages render this so the design can still be worked on.
 * It is never used in production builds (see publicEvents.ts).
 *
 * Keep in sync with scripts/seed-ramateertham.mjs, which writes the real record.
 */
export const SAMPLE_EVENTS: PublicEvent[] = [
  {
    code: 'RT26',
    slug: 'ramateertham-trip',
    name: 'Ramateertham Yatra',
    tagline: 'A day on the sacred hill where Lord Rama is said to have walked — kirtan, climb and prasadam.',
    org: 'Hare Krishna Vaikuntham',
    ageLimit: '16–30',
    locations: ['Hare Krishna Vaikuntham', 'Ramateertham Temple'],
    description:
      '<p>Ramateertham is an ancient pilgrimage hill in Vizianagaram district, home to a Rama temple older than memory and the ruins of Buddhist and Jain monasteries. Join Yatra Clubbing for a day of chanting, sacred stories, a guided trek and a shared feast.</p>',
    venue: 'Hare Krishna Vaikuntham, Visakhapatnam',
    timing: '6:00 AM – 7:00 PM',
    transport: 'Bus from Vaikuntham',
    highlights: [
      { image: '', title: 'Sri Rama Temple', caption: 'Darshan at the hilltop temple, tied to the Ramayana trail.' },
      { image: '', title: 'Trekking', caption: 'A guided trek up the sacred hill with stories and wide views along the way.' },
      { image: '', title: 'Kirtan & Pastimes', caption: 'Congregational chanting and stories of Lord Rama under the open sky.' },
    ],
    benefits: ['Sacred darshan', 'Kirtan circle', 'Trekking', 'Prasadam feast', 'New friends'],
    dates: { display: 'Sat, 6 December · 6:00 AM', start: '2026-12-06T06:00:00', end: '2026-12-06T19:00:00' },
    timeline: [
      { time: '6:00 AM', title: 'Depart from Vaikuntham', description: 'Board the bus, begin with japa and a short briefing.' },
      { time: '9:00 AM', title: 'Arrival & temple darshan', description: 'Welcome kirtan and darshan at Ramateertham.' },
      { time: '10:30 AM', title: 'Trekking up the hill', description: 'A guided trek with stories of the place.' },
      { time: '1:00 PM', title: 'Prasadam feast', description: 'Pure vegetarian lunch, served together.' },
      { time: '3:00 PM', title: 'Pastimes & concluding kirtan', description: 'Stories of Lord Rama and a closing kirtan.' },
      { time: '7:00 PM', title: 'Return to Vaikuntham', description: 'Back by evening with a heart full of memories.' },
    ],
    tickets: [
      { key: 'student', name: 'Student', price: 599, was: 799, maxQty: 1, description: 'For students with a valid ID', requiresStudentId: true, features: ['Bus travel both ways', 'Prasadam lunch', 'Student ID required'] },
    ],
    branding: { heroDesktop: '', heroMobile: '', themeColor: '#1F5A3D', showCountdown: true, mantra: '' },
    receiptPrefix: 'RT-',
    status: 'active',
  },
];

export function sampleCards(): PublicEventCard[] {
  return SAMPLE_EVENTS.map(e => ({
    code: e.code,
    slug: e.slug,
    name: e.name,
    tagline: e.tagline,
    org: e.org,
    venue: e.venue,
    ageLimit: e.ageLimit,
    locations: e.locations,
    dates: e.dates,
    priceFrom: Math.min(...e.tickets.map(t => t.price)),
    wasFrom: Math.min(...e.tickets.map(t => t.was ?? t.price)),
    ticketCount: e.tickets.length,
    branding: { heroDesktop: e.branding.heroDesktop, heroMobile: e.branding.heroMobile, themeColor: e.branding.themeColor },
    status: e.status,
  }));
}
