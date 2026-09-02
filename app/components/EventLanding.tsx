import Script from 'next/script';
import '../public.css';
import BookingModal from './BookingModal';
import BookButton from './BookButton';
import type { PublicEvent } from '@/lib/publicTypes';

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bc-root">
      <div className="bc-wrap" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🪔</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '1.8rem', margin: '0 0 0.5rem' }}>Yatra Clubbing</h1>
          <p style={{ color: 'var(--muted)' }}>{message}</p>
        </div>
      </div>
    </div>
  );
}

function CancelledOverlay({ event }: { event: PublicEvent }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#FBF5E9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem', lineHeight: 1 }}>🙏</div>
        <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2.25rem)', fontWeight: 900, color: '#2A1A08', margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>Event Cancelled</h1>
        <p style={{ color: '#6E5C44', margin: '0 0 1.25rem', lineHeight: 1.65, fontSize: '1rem' }}>
          We regret to inform you that the <strong style={{ color: '#2A1A08' }}>{event.name}</strong><br />has been cancelled.
        </p>
        <div style={{ background: '#fff', border: '1px solid rgba(224,123,0,0.18)', borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#2A1A08', fontSize: '0.95rem' }}>Refund Information</p>
          <p style={{ margin: 0, color: '#6E5C44', fontSize: '0.9rem', lineHeight: 1.6 }}>
            All payments will be <strong style={{ color: '#B85C00' }}>fully refunded</strong> to your original payment method
            within <strong style={{ color: '#B85C00' }}>5–7 business days</strong>.<br />
            No action is needed from your side.
          </p>
        </div>
        <p style={{ color: '#B85C00', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
          For any queries, please contact us through the temple.<br />
          <strong>Hare Krishna.</strong> 🙏
        </p>
      </div>
    </div>
  );
}

export default function EventLanding({ event }: { event: PublicEvent }) {
  if (!event) {
    return <EmptyState message="No active event right now. Please check back later." />;
  }

  if (event.status === 'cancelled') {
    return (
      <>
        <CancelledOverlay event={event} />
        <div className="bc-root" />
      </>
    );
  }

  if (event.status === 'draft' || event.status === 'closed') {
    return <EmptyState message="Registrations for this event are currently closed." />;
  }

  const heroDesktop = event.branding.heroDesktop || '/hero-desktop.jpg';
  const heroMobile = event.branding.heroMobile || '/hero-mobile.jpg';
  const theme = event.branding.themeColor || '#E07B00';
  const locations = event.locations || [];
  // The synthetic poster card only earns its place when there is no real hero
  // artwork; with a custom hero it just repeats the name over the image.
  const showPosterCard = !event.branding.heroDesktop && !event.branding.heroMobile;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <div className="bc-root" style={{ ['--gold' as string]: theme }}>
        <div className="bc-wrap">
          <nav className="bc-nav">
            {/* Back to the chooser — the home page lists every open yatra. */}
            <a href="/" className="bc-brand" title="See all yatras">
              <span className="bc-brand-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="18" r="4" /><path d="M12 18V2l7 4" /></svg>
              </span>
              <span>Yatra Clubbing<small>{event.org || 'Hare Krishna Vaikuntham'}</small></span>
            </a>
            <BookingModal event={event} />
          </nav>
        </div>

        <div className="bc-marquee" aria-hidden="true">
          <div className="bc-marquee-track">
            <span>KIRTAN · YATRA · PASTIMES · FEAST · BLISS · HARE KRISHNA ·&nbsp;</span>
          </div>
        </div>

        <div className="bc-wrap">
          <header className="bc-hero">
            <picture>
              <source srcSet={heroDesktop} media="(min-width:768px)" />
              <img src={heroMobile} alt="" className="bc-hero-img" fetchPriority="high" />
            </picture>
            <div className="bc-eyebrow">{event.name}</div>
            <h1 className="bc-title">Yatra<br />Clubbing</h1>
            {event.tagline && (
              <div className="bc-band">
                {event.tagline}
                {event.org && <span className="by"> by {event.org}</span>}
              </div>
            )}
            <div className="bc-tag">Kirtan · Pastimes · Bliss</div>

            <div className="bc-meta">
              {event.dates.display && (
                <span className="bc-chip">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                  {event.dates.display}
                </span>
              )}
              {event.venue && (
                <span className="bc-chip">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  {event.venue}
                </span>
              )}
              {event.ageLimit && (
                <span className="bc-chip">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Age {event.ageLimit}
                </span>
              )}
              <span className="bc-chip">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-3 5v6c0 1.1.9 2 2 2h1Z"/></svg>
                Lunch feast
              </span>
            </div>

            {locations.length > 0 && (
              <div className="bc-meta">
                {locations.map((loc, i) => (
                  <span className="bc-chip" key={i}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {loc}
                  </span>
                ))}
              </div>
            )}

            <div className="bc-herorow">
              <BookButton className="bc-herocta">
                Book tickets
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </BookButton>
            </div>

            {showPosterCard && (
              <div className="bc-poster">
                <div className="bc-stars"></div>
                <div className="ring"></div><div className="ring2"></div>
                <div className="core">
                  <div className="glow">🪔</div>
                  <h3>{event.name}</h3>
                  {event.tagline && <p>{event.tagline.toUpperCase()}</p>}
                </div>
              </div>
            )}
          </header>

          <div className="yc-bowdiv" aria-hidden="true">
            <svg viewBox="0 0 440 54" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="27" x2="150" y2="27" stroke="currentColor" strokeOpacity=".22" />
              <line x1="290" y1="27" x2="440" y2="27" stroke="currentColor" strokeOpacity=".22" />
              <path d="M198 5 C 176 27, 176 27, 198 49" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <line x1="198" y1="5" x2="198" y2="49" stroke="currentColor" strokeWidth="1.4" strokeOpacity=".65" />
              <g className="yc-arrow">
                <line x1="186" y1="27" x2="252" y2="27" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M252 27 l-10 -5 m10 5 l-10 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M184 22 l-7 5 l7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          </div>

          {event.description && (
            <section className="bc-sec">
              <h2 className="bc-sectitle">About the yatra</h2>
              <p className="bc-about" dangerouslySetInnerHTML={{ __html: event.description }} />
            </section>
          )}

          {event.timeline.length > 0 && (
            <section className="bc-sec">
              <h2 className="bc-sectitle">Flow of the day</h2>
              <div className="bc-flow">
                {event.timeline.map((item, i) => (
                  <div className="bc-flow-item" key={i}>
                    <div className="bc-flow-time">{item.time}</div>
                    <div className="bc-flow-rail"><div className="bc-flow-dot"></div></div>
                    <div><h4>{item.title}</h4>{item.description && <p>{item.description}</p>}</div>
                  </div>
                ))}
              </div>
              <div className="bc-flow-note">Timings indicative · final schedule shared on your confirmation</div>
            </section>
          )}

          {event.tickets.length > 0 && (
            <section className="bc-sec" id="tickets">
              <h2 className="bc-sectitle">Get your pass</h2>
              <div className="bc-ticket-wrap">
                {event.tickets.map(t => (
                  <div className="bc-stub" key={t.key}>
                    <div className="bc-stub-glow"></div>
                    {t.tag && <span className="bc-stub-tag">{t.tag}</span>}
                    <div className="bc-stub-name">{t.name}</div>
                    {t.description && <div className="bc-stub-desc">{t.description}</div>}
                    <div className="bc-tear"></div>
                    <div className="bc-price">
                      <span className="cur">₹</span>
                      <span className="amt">{t.price}</span>
                      {t.was != null && <span className="was">₹{t.was}</span>}
                      <span className="per">/ person</span>
                    </div>
                    {(t.features?.length || 0) > 0 && (
                      <ul className="bc-stub-feat">
                        {t.features.map((f, i) => (
                          <li key={i}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <BookButton className="bc-stubcta" preset={t.key}>
                      Get {t.name} Pass
                    </BookButton>
                    <div className="bc-stub-note">🔒 No payment online · team confirms your seat</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="yc-diyas" aria-hidden="true"><span>🪔</span><span>🪔</span><span>🪔</span><span>🪔</span><span>🪔</span></div>
          <div className="yc-mantra">{event.branding.mantra || 'जय श्री राम'}</div>

          <footer className="bc-foot">
            <div><span className="org">{event.org}</span></div>
            <div>📍 {event.venue}</div>
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
