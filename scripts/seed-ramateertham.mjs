/**
 * Creates/updates the "Ramateertham Yatra" (6 Dec 2026) event.
 *
 *   node scripts/seed-ramateertham.mjs            -> saves as DRAFT (safe)
 *   node scripts/seed-ramateertham.mjs --publish  -> status "active" (live on the site)
 *
 * Needs MONGODB_URI (and optionally MONGODB_DB) in the environment, e.g.
 *   MONGODB_URI="..." node scripts/seed-ramateertham.mjs
 *
 * Idempotent (upsert on code). Prices, timings and seats below are PLACEHOLDERS —
 * edit them here or in Admin → Events before publishing. Additional trips are
 * just more events with their own code; the admin dashboard filters "All events".
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(2); }
const publish = process.argv.includes('--publish');
const now = new Date().toISOString();

const event = {
  code: 'RT26',
  slug: 'ramateertham-trip',
  name: 'Ramateertham Yatra',
  tagline: 'A day on the sacred hill where Lord Rama is said to have walked — kirtan, climb and prasadam.',
  org: 'Hare Krishna Vaikuntham',
  description:
    '<p>Ramateertham is an ancient pilgrimage hill in Vizianagaram district, home to a Rama temple older than memory and the ruins of Buddhist and Jain monasteries. Join Yatra Clubbing for a day of chanting, sacred stories, a guided trek and a shared feast.</p>',
  venue: 'Hare Krishna Vaikuntham, Visakhapatnam',
  ageLimit: '16–30',
  timing: '6:00 AM – 7:00 PM',
  transport: 'Bus from Vaikuntham',
  locations: ['Hare Krishna Vaikuntham', 'Ramateertham Temple'],
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
  payments: {
    receiptPrefix: 'RT-',
    whatsapp: { booking: 'yatra_booking_confirmation', studentApproved: 'student_id_approved', studentRejected: 'student_id_rejected' },
  },
};

const client = new MongoClient(uri);
try {
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || 'yatra').collection('events');
  const existing = await col.findOne({ code: event.code });
  if (existing) {
    // Don't clobber edits made in the admin: only fill fields that are missing,
    // and only change status when --publish is passed.
    const missing = Object.fromEntries(Object.entries(event).filter(([k]) => existing[k] === undefined));
    const $set = { ...missing, updatedAt: now, ...(publish ? { status: 'active' } : {}) };
    await col.updateOne({ code: event.code }, { $set });
    console.log('Updated existing RT26 (filled missing fields only).');
  } else {
    await col.insertOne({ ...event, status: publish ? 'active' : 'draft', createdAt: now, updatedAt: now });
    console.log(`Created RT26 as ${publish ? 'ACTIVE' : 'DRAFT'}.`);
  }
} finally {
  await client.close();
}
