/**
 * Seeds the cancelled "Ramayana Circuit Yatra" event into the events collection.
 *
 * This inserts the historical event (which was cancelled) as the first Event record
 * so it shows up in Admin → Events history. It is an idempotent upsert keyed on slug.
 *
 * Usage (set MONGODB_URI / MONGODB_DB in the environment first):
 *   node scripts/seed-event.mjs
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Can only update payments/whatsapp fields.');
  process.exitCode = 2;
}

const dbName = process.env.MONGODB_DB || 'yatra';
const code = 'RC26';
const slug = 'ramayana-circuit-yatra';

const event = {
  code,
  slug,
  name: 'Ramayana Circuit Yatra',
  tagline: 'Rama Tirtham × Ramanarayanam',
  org: 'Hare Krishna Vaikuntham',
  description:
    '<p>Experience the divine journey of Lord Rama with a special Yatra Clubbing program. Join us for an unforgettable day of kirtan, pastimes, and feast.</p>',
  venue: 'Visakhapatnam',
  dates: { display: 'Sat, 11 July · 7:00 AM', start: '2025-07-11T07:00:00', end: '2025-07-11T16:00:00' },
  timeline: [
    { time: '7:00 AM', title: 'Welcome arati & kirtan', description: 'Begin the yatra with congregational chanting.' },
    { time: '9:00 AM', title: 'Rama pastimes', description: 'Stories and pastimes of Lord Sri Rama.' },
    { time: '1:00 PM', title: 'Lunch feast', description: 'Pure vegetarian prasadam feast.' },
    { time: '3:30 PM', title: 'Concluding kirtan', description: 'Final kirtan and distribution of praises.' },
  ],
  tickets: [
    { key: 'general', name: 'General', price: 799, was: 1000, maxQty: 20, description: 'Full day yatra experience', tag: 'Most loved', requiresStudentId: false, features: ['Entry + lunch feast', 'Transport from central meeting point', 'Everyone welcome'] },
    { key: 'student', name: 'Student', price: 199, was: 500, maxQty: 1, description: 'For students with a valid student ID', tag: 'Student', requiresStudentId: true, features: ['Entry + lunch feast', 'Student ID required'] },
  ],
  branding: { heroDesktop: '/hero-desktop.jpg', heroMobile: '/hero-mobile.jpg', themeColor: '#E07B00', showCountdown: false, mantra: 'जय श्री राम' },
  payments: {
    receiptPrefix: 'YC-',
    whatsapp: { booking: 'yatra_booking_confirmation', studentApproved: 'student_id_approved', studentRejected: 'student_id_rejected' },
  },
  status: 'cancelled',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  if (!uri) return;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection('events');
    await col.updateOne(
      { slug },
      { $setOnInsert: { ...event, createdAt: event.createdAt, updatedAt: event.updatedAt } },
      { upsert: true }
    );
    // Ensure code + slug + receiptPrefix are consistent even if event already existed but fields differ
    await col.updateOne({ slug }, { $set: { code, status: 'cancelled', payments: event.payments } });
    const doc = await col.findOne({ slug });
    console.log('Seeded event:', doc ? JSON.stringify({ slug: doc.slug, name: doc.name, status: doc.status }) : 'not found');
  } finally {
    await client.close();
  }
}

main().catch(e => {
  console.error('Seed failed:', e);
  process.exitCode = 1;
});
