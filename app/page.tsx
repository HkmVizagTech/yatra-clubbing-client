import { redirect } from 'next/navigation';
import EventLanding from './components/EventLanding';
import { fetchActiveEvents, fetchEventByCode } from '@/lib/publicEvents';
import { eventPath } from '@/lib/links';

// Every trip is its own standalone page at /CODE. The root simply forwards to the
// soonest open trip — no chooser, no cards for other trips.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const events = await fetchActiveEvents();
  if (events.length > 0) redirect(eventPath(events[0]));
  const none = await fetchEventByCode('__none__');
  return <EventLanding event={none as never} />;
}
