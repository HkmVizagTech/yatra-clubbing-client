import Link from 'next/link';
import './home.css';
import EventLanding from './components/EventLanding';
import { fetchActiveEvents, fetchEventByCode } from '@/lib/publicEvents';
import type { PublicEventCard } from '@/lib/publicTypes';

// The admin can publish or unpublish at any moment, so never cache.
export const dynamic = 'force-dynamic';

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
);
const PinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

// "In 3 days" reads better than a bare date, but only when there is a real
// parseable start — the display date is free text and often isn't one.
function whenLabel(card: PublicEventCard): string | null {
  const t = Date.parse(card.dates?.start || '');
  if (!Number.isFinite(t)) return null;
  const days = Math.ceil((t - Date.now()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 14) return `In ${days} days`;
  return null;
}

function EventCard({ card }: { card: PublicEventCard }) {
  const hero = card.branding?.heroDesktop || card.branding?.heroMobile || '';
  const soon = whenLabel(card);

  return (
    <Link href={`/${card.code}`} className="ych-card" prefetch={false}>
      <div
        className={`ych-cardimg${hero ? '' : ' is-empty'}`}
        style={hero ? { backgroundImage: `url(${hero})` } : undefined}
      >
        {!hero && <span aria-hidden="true">🪔</span>}
        {soon && <div className="ych-tag">{soon}</div>}
      </div>

      <div className="ych-cardbody">
        <div className="ych-cardname">{card.name}</div>
        {card.dates?.display && (
          <div className="ych-when"><CalendarIcon />{card.dates.display}</div>
        )}
        {card.tagline && <p className="ych-cardtag">{card.tagline}</p>}

        <div className="ych-chips">
          {card.ageLimit && <span className="ych-chip"><UsersIcon />Age {card.ageLimit}</span>}
          {card.venue && <span className="ych-chip is-venue"><PinIcon /><span>{card.venue}</span></span>}
        </div>

        <div className="ych-cardfoot">
          <div className="ych-price">
            {card.priceFrom != null ? <>From<b>₹{card.priceFrom}</b></> : <b style={{ marginTop: 0 }}>Free</b>}
          </div>
          <span className="ych-go">Book now <ArrowIcon /></span>
        </div>
      </div>
    </Link>
  );
}

function Shell({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="ych">
      <div className="ych-wrap">
        <nav className="ych-nav">
          <div className="ych-brand">
            <span className="ych-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="18" r="4" /><path d="M12 18V2l7 4" /></svg>
            </span>
            <span>Yatra Clubbing<small>Hare Krishna Vaikuntham</small></span>
          </div>
          {note && <div className="ych-navnote">{note}</div>}
        </nav>
      </div>

      <div className="ych-wrap">{children}</div>
    </div>
  );
}

export default async function HomePage() {
  const events = await fetchActiveEvents();

  // Nothing published — say so plainly rather than showing an empty grid.
  if (events.length === 0) {
    return (
      <Shell>
        <div className="ych-empty">
          <div className="ic">🪔</div>
          <h2>No yatras open right now</h2>
          <p>Registrations open closer to each yatra. Please check back soon — Hare Krishna.</p>
        </div>
      </Shell>
    );
  }

  // Exactly one live event: skip the chooser and open it directly, so the
  // common case stays a single tap. /CODE is still its canonical URL.
  if (events.length === 1) {
    const only = await fetchEventByCode(events[0].code);
    if (only) return <EventLanding event={only} />;
  }

  return (
    <Shell note={`${events.length} yatras open`}>
      <header className="ych-head">
        <div className="ych-eyebrow">Choose your yatra</div>
        <h1 className="ych-title">Yatra<br />Clubbing</h1>
        <p className="ych-sub">
          {events.length} yatras are open for booking. Pick the one you want to join —
          each has its own dates, route and passes.
        </p>
      </header>

      <div className="ych-grid">
        {events.map(card => <EventCard key={card.code} card={card} />)}
      </div>

      <footer className="ych-foot">
        <div><span className="org">Hare Krishna Vaikuntham</span> · Visakhapatnam</div>
        <div>Hare Krishna</div>
      </footer>
    </Shell>
  );
}
