import Script from 'next/script';
import '../public.css';
import BookingModal from './BookingModal';
import BookButton from './BookButton';
import Countdown from './Countdown';
import { TempleSkyline, DandiyaPair, DiyaStrip } from './Decor';
import { cdnImage, cdnSrcSet } from '@/lib/img';
import type { PublicEvent } from '@/lib/publicTypes';

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
);
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const BusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
);
const SparkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.4L21 10.6l-5.4 4 .6 6.9-4.2-3.6-4.2 3.6.6-6.9L3 10.6l6.8-2.2z"/></svg>
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
  const highlights = (event.highlights || []).filter(h => h.title || h.image);
  const benefits = (event.benefits || []).filter(Boolean);
  // Shown whole, so only a real uploaded poster is used — no stretched default.
  const posterDesktop = event.branding.heroDesktop || '';
  const posterMobile = event.branding.heroMobile || posterDesktop;
  const poster = posterMobile || posterDesktop;

  // The strip mirrors the poster's dark band. Each cell appears only when the
  // event actually has that detail, so it never shows an empty column.
  const strip: { icon: React.ReactNode; k: string; v: string }[] = [];
  if (event.dates.display) strip.push({ icon: <CalendarIcon />, k: 'Date', v: event.dates.display });
  if (event.timing) strip.push({ icon: <ClockIcon />, k: 'Timing', v: event.timing });
  if (event.ageLimit) strip.push({ icon: <UsersIcon />, k: 'Age limit', v: event.ageLimit });
  if (event.transport) strip.push({ icon: <BusIcon />, k: 'Transport', v: event.transport });

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <div className="bc-root" style={{ ['--accent' as string]: theme }}>
        {/* Decorative ornaments — pure SVG, behind the content, pointer-events:none. */}
        <TempleSkyline uid="el-sky" className="bc-decor bc-decor-sky" />
        <DandiyaPair className="bc-decor bc-decor-dandiya" />

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
                  {posterDesktop && (
                    <source
                      media="(min-width:768px)"
                      srcSet={cdnSrcSet(posterDesktop, [540, 810, 1080]) || posterDesktop}
                      sizes="540px"
                    />
                  )}
                  <img
                    src={cdnImage(poster, 1080) || poster}
                    srcSet={cdnSrcSet(poster, [420, 640, 900]) || undefined}
                    sizes="(min-width:768px) 540px, 100vw"
                    alt={`${event.name} poster`}
                    className="bc-posterimg"
                    fetchPriority="high"
                    decoding="async"
                  />
                </picture>
              </figure>
            )}

            {event.branding.showCountdown && event.dates.start && (
              <Countdown to={event.dates.start} label="Yatra begins in" />
            )}

            {strip.length > 0 && (
              <div className="bc-strip">
                {strip.map(s => (
                  <div className="bc-stripitem" key={s.k}>
                    {s.icon}
                    <span className="k">{s.k}</span>
                    <span className="v">{s.v}</span>
                  </div>
                ))}
              </div>
            )}

            {(event.venue || locations.length > 0) && (
              <div className="bc-metalines">
                {event.venue && <p><span className="k">Starts from</span>{event.venue}</p>}
                {locations.length > 0 && <p><span className="k">Route</span>{locations.join(' · ')}</p>}
              </div>
            )}

            <div className="bc-herorow">
              <BookButton className="bc-herocta">
                Register now
                <ArrowIcon />
              </BookButton>
            </div>
          </header>

          {highlights.length > 0 && (
            <section className="bc-sec">
              <h2 className="bc-sectitle">What the day covers</h2>
              <div className="bc-highlights">
                {highlights.map((h, i) => (
                  <article className="bc-hl" key={i}>
                    {h.image && (
                      <img
                        src={cdnImage(h.image, 700) || h.image}
                        srcSet={cdnSrcSet(h.image, [360, 700]) || undefined}
                        sizes="(min-width:900px) 280px, (min-width:640px) 45vw, 100vw"
                        alt=""
                        className="bc-hl-img"
                        width={700}
                        height={525}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <div className="bc-hl-body">
                      {h.title && <h3 className="bc-hl-title">{h.title}</h3>}
                      {h.caption && <p className="bc-hl-caption">{h.caption}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

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

          {benefits.length > 0 && (
            <section className="bc-sec">
              <h2 className="bc-sectitle">Why join</h2>
              <ul className="bc-benefits">
                {benefits.map((b, i) => (
                  <li key={i}>
                    <span className="ic" aria-hidden="true"><SparkIcon /></span>
                    {b}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {event.tickets.length > 0 && (
            <section className="bc-sec" id="tickets">
              <h2 className="bc-sectitle">Get your pass</h2>
              <p className="bc-ticket-note">One pass per seat — events are open to students with a valid college / school ID.</p>
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
                      Register for {t.name}
                    </BookButton>
                    {t.requiresStudentId && (
                      <div className="bc-stub-note">College or school ID required</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="bc-diya"><DiyaStrip /></div>
          <div className="yc-mantra">{event.branding.mantra || 'Hare Krishna'}</div>

          <footer className="bc-foot">
            <span className="org">{event.org}</span>
            {event.venue && !event.venue.includes(event.org) && <> · {event.venue}</>}
          </footer>
        </div>

        <div className="bc-bar">
          <div className="bc-bar-in">
            <div className="lbl">{event.name}{event.dates.display ? ` · ${event.dates.display}` : ''}</div>
            <BookButton>Register now</BookButton>
          </div>
        </div>

        {/* Portal target for the booking sheet — see BookingModal. Must stay a
            direct child of .bc-root and outside every .bc-wrap. */}
        <div id="yc-modal-root" />
      </div>
    </>
  );
}
