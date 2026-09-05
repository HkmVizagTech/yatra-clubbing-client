import Script from 'next/script';
import '../public.css';
import BookingModal from './BookingModal';
import BookButton from './BookButton';
import Countdown from './Countdown';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { cdnImage, cdnSrcSet } from '@/lib/img';
import type { PublicEvent } from '@/lib/publicTypes';

const Arrow = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);
const Calendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
);
const Clock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
);
const Users = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const Bus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
);
const Rupee = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 13h4a5 5 0 0 0 0-10"/><path d="m6 13 8 8"/></svg>
);
const Pin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);

/** Badge icons for the "why join" list, matched to the words people use. */
const Leaf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
);
const Heart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);
const Mountain = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
);
const Star = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5 14 8l6 .9-4.3 4.2 1 6-5.2-2.8L6.3 19l1-6L3 8.9 9 8z"/></svg>
);

const BADGE_ICONS = [<Leaf key="a" />, <Users key="b" />, <Mountain key="c" />, <Heart key="d" />, <Star key="e" />];

function Ornament({ onNavy }: { onNavy?: boolean }) {
  return <div className="hk-orn" aria-hidden="true" style={onNavy ? { opacity: 0.9 } : undefined}><i /></div>;
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="hk-sechead">
      <h2 className="hk-sectitle">{title}</h2>
      <Ornament />
      {sub && <p className="hk-secsub">{sub}</p>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hk bc-root">
      <SiteHeader />
      <div className="bc-wrap" style={{ minHeight: '52vh', display: 'grid', placeItems: 'center', textAlign: 'center', paddingTop: 64, paddingBottom: 64 }}>
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Shell>
      <div>
        <h1 className="bc-title" style={{ marginTop: 0 }}>Yatra Clubbing</h1>
        <p className="bc-lede" style={{ marginInline: 'auto' }}>{message}</p>
        <div className="bc-herorow" style={{ justifyContent: 'center' }}>
          <a href="/" className="hk-btn">See all yatras <Arrow /></a>
        </div>
      </div>
    </Shell>
  );
}

function Cancelled({ event }: { event: PublicEvent }) {
  return (
    <Shell>
      <div style={{ maxWidth: 480 }}>
        <div className="bc-eyebrow">Cancelled</div>
        <h1 className="bc-title">{event.name}</h1>
        <p className="bc-lede" style={{ marginInline: 'auto' }}>
          We regret to inform you that this yatra has been cancelled.
        </p>
        <div className="bc-summary" style={{ textAlign: 'left', marginTop: 26 }}>
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
  if (!event) return <EmptyState message="No active yatra right now. Please check back soon." />;
  if (event.status === 'cancelled') return <Cancelled event={event} />;
  if (event.status === 'draft' || event.status === 'closed') {
    return <EmptyState message="Registrations for this yatra are currently closed." />;
  }

  const locations = (event.locations || []).filter(Boolean);
  const highlights = (event.highlights || []).filter(h => h.title || h.image);
  const benefits = (event.benefits || []).filter(Boolean).slice(0, 5);

  const posterDesktop = event.branding.heroDesktop || '';
  const posterMobile = event.branding.heroMobile || posterDesktop;
  const poster = posterMobile || posterDesktop;

  // Headline fee. Showing the minimum alone read as "₹49" on an event whose
  // general pass is ₹99, so a mixed-price event is labelled "From ₹49" and a
  // single-price one shows the flat figure.
  const prices = event.tickets.map(t => t.price).filter(p => typeof p === 'number');
  const lowest = prices.length ? Math.min(...prices) : null;
  const oneFlatPrice = prices.length > 0 && new Set(prices).size === 1;
  const feeText =
    lowest == null ? null
      : lowest === 0 ? 'Free'
      : oneFlatPrice ? `₹${lowest}/-`
      : `From ₹${lowest}`;

  // Detail tiles, each shown only when the event actually has that fact.
  const tiles: { icon: React.ReactNode; k: string; v: string }[] = [];
  if (event.dates.display) tiles.push({ icon: <Calendar />, k: 'Date', v: event.dates.display });
  if (event.timing) tiles.push({ icon: <Clock />, k: 'Timing', v: event.timing });
  if (event.ageLimit) tiles.push({ icon: <Users />, k: 'Age limit', v: event.ageLimit });
  if (event.transport) tiles.push({ icon: <Bus />, k: 'Transport', v: event.transport });
  if (feeText) tiles.push({ icon: <Rupee />, k: 'Registration fee', v: feeText });

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <div className="hk bc-root">
        <SiteHeader cta={<BookingModal event={event} />} />

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="bc-hero-band">
          <div className="bc-hero">
            <div className="bc-hero-main">
              <div className="bc-eyebrow">Travel · Explore · Connect · Grow</div>
              <h1 className="bc-title">{event.name}</h1>
              {event.tagline && <p className="bc-lede">{event.tagline}</p>}

              {benefits.length > 0 && (
                <ul className="bc-badges">
                  {benefits.map((b, i) => (
                    <li key={b}>
                      <span className="ic" aria-hidden="true">{BADGE_ICONS[i % BADGE_ICONS.length]}</span>
                      <span className="lb">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {event.branding.showCountdown && event.dates.start && (
                <Countdown to={event.dates.start} label="Yatra begins in" />
              )}

              <div className="bc-herorow">
                <BookButton className="hk-btn">Register now <Arrow /></BookButton>
                <a href="#tickets" className="hk-btn hk-btn-navy">See passes</a>
              </div>
            </div>

            <aside className="bc-hero-aside">
              {poster && (
                <figure className="bc-posterframe">
                  <picture>
                    {posterDesktop && (
                      <source media="(min-width:768px)" srcSet={cdnSrcSet(posterDesktop, [400, 600, 800]) || posterDesktop} sizes="400px" />
                    )}
                    <img
                      src={cdnImage(poster, 800) || poster}
                      srcSet={cdnSrcSet(poster, [400, 640, 900]) || undefined}
                      sizes="(min-width:980px) 400px, 92vw"
                      alt={`${event.name} poster`}
                      className="bc-posterimg"
                      fetchPriority="high"
                      decoding="async"
                    />
                  </picture>
                </figure>
              )}

              {feeText && (
                <div className="bc-pricecard">
                  <span className="lb">Registration fee</span>
                  <span className="amt">{feeText}</span>
                  <span className="note">Early bird registration now open</span>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* ── Highlights ────────────────────────────────────────────────── */}
        {highlights.length > 0 && (
          <div className="bc-sec-alt">
            <div className="bc-wrap">
              <SectionHead
                title="Yatra Highlights"
                sub={`${highlights.length} sacred destinations · one unforgettable experience`}
              />
              <div className="bc-highlights">
                {highlights.map((h, i) => (
                  <article className="bc-hl" key={i}>
                    {h.image && (
                      <div className="bc-hl-media">
                        <img
                          src={cdnImage(h.image, 700) || h.image}
                          srcSet={cdnSrcSet(h.image, [360, 700]) || undefined}
                          sizes="(min-width:900px) 340px, 92vw"
                          alt=""
                          className="bc-hl-img"
                          width={700}
                          height={481}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="bc-hl-badge" aria-hidden="true">
                          {BADGE_ICONS[i % BADGE_ICONS.length]}
                        </span>
                      </div>
                    )}
                    <div className="bc-hl-body" style={h.image ? undefined : { paddingTop: 26 }}>
                      {h.title && <h3 className="bc-hl-title">{h.title}</h3>}
                      {h.caption && <p className="bc-hl-caption">{h.caption}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Event details ─────────────────────────────────────────────── */}
        {tiles.length > 0 && (
          <section className="bc-sec">
            <div className="bc-wrap">
              <SectionHead title="Event Details" />
              <div className="bc-strip">
                {tiles.map(t => (
                  <div className="bc-stripitem" key={t.k}>
                    {t.icon}
                    <span className="k">{t.k}</span>
                    <span className="v">{t.v}</span>
                  </div>
                ))}
              </div>
              {(event.venue || locations.length > 0) && (
                <div className="bc-metalines">
                  {event.venue && <p><span className="k">Starts from</span>{event.venue}</p>}
                  {locations.length > 0 && <p><span className="k">Route</span>{locations.join(' · ')}</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── About ─────────────────────────────────────────────────────── */}
        {event.description && (
          <section className="bc-sec">
            <div className="bc-wrap">
              <SectionHead title="About the Yatra" />
              <div className="bc-about" dangerouslySetInnerHTML={{ __html: event.description }} />
            </div>
          </section>
        )}

        {/* ── Flow of the day ───────────────────────────────────────────── */}
        {event.timeline.length > 0 && (
          <section className="bc-sec">
            <div className="bc-wrap">
              <SectionHead title="Flow of the Day" />
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
                <div className="bc-flow-note">
                  Timings are indicative · the final schedule is shared on your confirmation
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Passes ────────────────────────────────────────────────────── */}
        {event.tickets.length > 0 && (
          <section className="bc-sec" id="tickets">
            <div className="bc-wrap">
              <SectionHead title="Get Your Pass" sub="Secure your seat — limited places each yatra" />
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
                        {t.features.map((f, i) => <li key={i}><Check />{f}</li>)}
                      </ul>
                    )}
                    <BookButton className="hk-btn hk-btn-block" preset={t.key}>
                      Get {t.name} pass
                    </BookButton>
                    {t.requiresStudentId && (
                      <div className="bc-stub-note">College or school ID required</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="yc-mantra">{event.branding.mantra || 'Hare Krishna'}</div>

        {/* ── Closing call to action ────────────────────────────────────── */}
        <section className="bc-cta">
          <div className="bc-cta-in">
            <h2>More than a trip.<br />A higher purpose.</h2>
            <p>{event.dates.display ? `${event.dates.display} · ` : ''}{event.venue || 'Hare Krishna Vaikuntham, Visakhapatnam'}</p>
            <div className="row">
              <BookButton className="hk-btn">Register now <Arrow /></BookButton>
              {event.tickets.length > 0 && (
                <a href="#tickets" className="hk-btn hk-btn-outline">View passes</a>
              )}
            </div>
            <div className="words">Travel · Serve · Discover · Grow</div>
          </div>
        </section>

        <SiteFooter />

        <div className="bc-bar">
          <div className="bc-bar-in">
            <div className="lbl"><b>{event.name}</b>{event.dates.display || ''}</div>
            <BookButton className="hk-btn hk-btn-sm">Register</BookButton>
          </div>
        </div>

        {/* Portal target for the booking sheet — see BookingModal. Must stay a
            direct child of .bc-root and outside every .bc-wrap. */}
        <div id="yc-modal-root" />
      </div>
    </>
  );
}
