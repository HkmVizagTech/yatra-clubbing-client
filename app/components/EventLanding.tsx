import Script from 'next/script';
import '../public.css';
import BookingModal from './BookingModal';
import BookButton from './BookButton';
import type { PublicEvent } from '@/lib/publicTypes';

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bc-root">
      <div className="bc-wrap" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Shell>
      <div>
        <h1 className="bc-title" style={{ marginTop: 0 }}>Yatra Clubbing</h1>
        <p className="bc-lede" style={{ marginInline: 'auto' }}>{message}</p>
        <div className="bc-herorow">
          <a href="/" className="bc-herocta">See all yatras <ArrowIcon /></a>
        </div>
      </div>
    </Shell>
  );
}

function Cancelled({ event }: { event: PublicEvent }) {
  return (
    <Shell>
      <div style={{ maxWidth: 460 }}>
        <div className="bc-eyebrow">Cancelled</div>
        <h1 className="bc-title">{event.name}</h1>
        <p className="bc-lede" style={{ marginInline: 'auto' }}>
          We regret to inform you that this yatra has been cancelled.
        </p>
        <div className="bc-summary" style={{ textAlign: 'left', marginTop: 24 }}>
          <div className="bc-srow tot"><span>Refund</span></div>
          <div className="bc-srow">
            <span>
              All payments are refunded in full to the original payment method within
              5–7 business days. No action is needed from your side.
            </span>
          </div>
        </div>
        <p className="bc-secure">For any queries, please contact us through the temple. Hare Krishna.</p>
      </div>
    </Shell>
  );
}

export default function EventLanding({ event }: { event: PublicEvent }) {
  if (!event) {
    return <EmptyState message="No active yatra right now. Please check back soon." />;
  }
  if (event.status === 'cancelled') {
    return <Cancelled event={event} />;
  }
  if (event.status === 'draft' || event.status === 'closed') {
    return <EmptyState message="Registrations for this yatra are currently closed." />;
  }

  const theme = event.branding.themeColor || '#E07B00';
  const locations = (event.locations || []).filter(Boolean);
  // Shown whole, so only a real uploaded poster is used — no stretched default.
  const posterDesktop = event.branding.heroDesktop || '';
  const posterMobile = event.branding.heroMobile || posterDesktop;
  const poster = posterMobile || posterDesktop;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <div className="bc-root" style={{ ['--accent' as string]: theme }}>
        <div className="bc-navline">
        <nav className="bc-nav">
          {/* Back to the chooser — the home page lists every open yatra. */}
          <a href="/" className="bc-brand" title="See all yatras">
            <span className="bc-brand-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="18" r="4" /><path d="M12 18V2l7 4" /></svg>
            </span>
            <span>Yatra Clubbing<small>{event.org || 'Hare Krishna Vaikuntham'}</small></span>
          </a>
          <BookingModal event={event} />
        </nav>
        </div>

        <div className="bc-wrap">
          <header className="bc-hero">
            <div className="bc-eyebrow">{event.org || 'Hare Krishna Vaikuntham'}</div>
            <h1 className="bc-title">{event.name}</h1>
            {event.tagline && <p className="bc-lede">{event.tagline}</p>}

            {/* The poster carries its own typography, so it is never cropped or
                written over — it simply sits in the page at its own ratio. */}
            {poster && (
              <figure className="bc-posterframe">
                <picture>
                  {posterDesktop && <source srcSet={posterDesktop} media="(min-width:768px)" />}
                  <img src={poster} alt={`${event.name} poster`} className="bc-posterimg" fetchPriority="high" />
                </picture>
              </figure>
            )}

            <dl className="bc-facts">
              {event.dates.display && (
                <div className="bc-fact"><dt className="k">When</dt><dd className="v">{event.dates.display}</dd></div>
              )}
              {event.venue && (
                <div className="bc-fact"><dt className="k">Starts from</dt><dd className="v">{event.venue}</dd></div>
              )}
              {event.ageLimit && (
                <div className="bc-fact"><dt className="k">Age</dt><dd className="v">{event.ageLimit}</dd></div>
              )}
              <div className="bc-fact"><dt className="k">Includes</dt><dd className="v">Lunch feast</dd></div>
              {locations.length > 0 && (
                <div className="bc-fact wide">
                  <dt className="k">Route</dt>
                  <dd className="v">{locations.join(' · ')}</dd>
                </div>
              )}
            </dl>

            <div className="bc-herorow">
              <BookButton className="bc-herocta">
                Book tickets
                <ArrowIcon />
              </BookButton>
            </div>
          </header>

          {event.description && (
            <section className="bc-sec">
              <h2 className="bc-sectitle">About the yatra</h2>
              <div className="bc-about" dangerouslySetInnerHTML={{ __html: event.description }} />
            </section>
          )}

          {event.timeline.length > 0 && (
            <section className="bc-sec">
              <h2 className="bc-sectitle">Flow of the day</h2>
              <div className="bc-flow">
                {event.timeline.map((item, i) => (
                  <div className="bc-flow-item" key={i}>
                    <div className="bc-flow-time">{item.time}</div>
                    <div className="bc-flow-rail"><div className="bc-flow-dot" /></div>
                    <div>
                      <h4>{item.title}</h4>
                      {item.description && <p>{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bc-flow-note">Timings are indicative · the final schedule is shared on your confirmation</div>
            </section>
          )}

          {event.tickets.length > 0 && (
            <section className="bc-sec" id="tickets">
              <h2 className="bc-sectitle">Get your pass</h2>
              <div className="bc-ticket-wrap">
                {event.tickets.map(t => (
                  <div className={`bc-stub${t.tag ? ' is-featured' : ''}`} key={t.key}>
                    {t.tag && <span className="bc-stub-tag">{t.tag}</span>}
                    <div className="bc-stub-name">{t.name}</div>
                    {t.description && <div className="bc-stub-desc">{t.description}</div>}
                    <div className="bc-tear" />
                    <div className="bc-price">
                      <span className="cur">₹</span>
                      <span className="amt">{t.price}</span>
                      {t.was != null && <span className="was">₹{t.was}</span>}
                      <span className="per">/ person</span>
                    </div>
                    {(t.features?.length || 0) > 0 && (
                      <ul className="bc-stub-feat">
                        {t.features.map((f, i) => (
                          <li key={i}><CheckIcon />{f}</li>
                        ))}
                      </ul>
                    )}
                    <BookButton className="bc-stubcta" preset={t.key}>
                      Get {t.name} pass
                    </BookButton>
                    {t.requiresStudentId && (
                      <div className="bc-stub-note">College or school ID required</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="yc-mantra">{event.branding.mantra || 'Hare Krishna'}</div>

          <footer className="bc-foot">
            <span className="org">{event.org}</span>
            {event.venue && !event.venue.includes(event.org) && <> · {event.venue}</>}
          </footer>
        </div>

        <div className="bc-bar">
          <div className="bc-bar-in">
            <div className="lbl">{event.name}{event.dates.display ? ` · ${event.dates.display}` : ''}</div>
            <BookButton>Book now</BookButton>
          </div>
        </div>

        {/* Portal target for the booking sheet — see BookingModal. Must stay a
            direct child of .bc-root and outside every .bc-wrap. */}
        <div id="yc-modal-root" />
      </div>
    </>
  );
}
