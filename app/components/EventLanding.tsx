import Script from 'next/script';
import {
  ArrowRight, Bus, CalendarDays, Check, Clock, Compass, Flower2, Heart, IndianRupee,
  Landmark, MapPin, Mountain, Music2, Sparkles, Users, Utensils,
} from 'lucide-react';
import '../public.css';
import '../yatra.css';
import BookingModal from './BookingModal';
import BookButton from './BookButton';
import YtCountdown from './YtCountdown';
import RegisterWatch from './RegisterWatch';
import TripFooter from './TripFooter';
import HeroSceneLoader from './HeroSceneLoader';
import HeroIllustration from './HeroIllustration';
import SmoothScroll from './SmoothScroll';
import GsapEffects from './GsapEffects';
import Timeline from './Timeline';
import YatraLogo from './YatraLogo';
import Reveal from './Reveal';
import Doodle from './Doodle';
import HighlightObject from './HighlightObject';
import { kindFor } from '@/lib/objectKind';
import { cdnImage, cdnSrcSet } from '@/lib/img';
import { themeFor, themeVars } from '@/lib/tripThemes';
import type { PublicEvent } from '@/lib/publicTypes';

/* Pick an icon from the words an organiser actually writes in a title/benefit. */
function iconFor(text: string, i: number) {
  const t = text.toLowerCase();
  if (/(temple|darshan|mandir|shrine|rama|krishna)/.test(t)) return <Landmark />;
  if (/(kirtan|bhajan|chant|music|sing)/.test(t)) return <Music2 />;
  if (/(hill|trek|walk|climb|mountain)/.test(t)) return <Mountain />;
  if (/(prasad|feast|lunch|food|meal)/.test(t)) return <Utensils />;
  if (/(friend|youth|connect|community|people)/.test(t)) return <Users />;
  if (/(seva|service|heart|love)/.test(t)) return <Heart />;
  return [<Sparkles key="a" />, <Flower2 key="b" />, <Compass key="c" />][i % 3];
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hk bc-root">
      <div className="bc-wrap" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', paddingTop: 64, paddingBottom: 64 }}>
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
        <p className="bc-secure">For any queries, please contact us through the temple.</p>
      </div>
    </Shell>
  );
}

function Closed({ event }: { event: PublicEvent }) {
  const theme = themeFor(event.code);
  return (
    <div className="hk bc-root yt" data-theme={theme.id} data-hero={theme.mode} style={themeVars(theme) as React.CSSProperties}>
      <section className="yt-hero" style={{ minHeight: '100svh', paddingBottom: 'clamp(180px,26vh,300px)' }}>
        <div className="yt-top"><YatraLogo org={event.org} /></div>
        <HeroIllustration />
        <div className="yt-hero-copy">
          <span className="yt-chip"><Sparkles size={14} />{event.ended ? 'This yatra has ended' : 'Registrations closed'}</span>
          <h1 className="yt-title">
            <span className="l1">{event.name}</span>
          </h1>
          {event.dates.display && <p className="yt-lede">{event.dates.display}{event.venue ? ` · ${event.venue}` : ''}</p>}
          <p className="yt-lede" style={{ marginTop: 12 }}>
            {event.ended
              ? 'Thank you to everyone who joined us. Keep an eye out for the next yatra.'
              : 'Registrations for this yatra are now closed.'}
          </p>
        </div>
      </section>
    </div>
  );
}

function SecHead({ eyebrow, title, sub, light }: { eyebrow: string; title: string; sub?: string; light?: boolean }) {
  return (
    <Reveal className={`yt-sechead${light ? ' is-light' : ''}`}>
      <span className="yt-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </Reveal>
  );
}

export default function EventLanding({ event }: { event: PublicEvent }) {
  if (!event) return <EmptyState message="No active yatra right now. Please check back soon." />;
  if (event.status === 'cancelled') return <Cancelled event={event} />;
  if (event.status === 'closed') return <Closed event={event} />;
  if (event.status === 'draft') {
    return <EmptyState message="Registrations for this yatra are not open yet." />;
  }

  const theme = themeFor(event.code);
  const locations = (event.locations || []).filter(Boolean);
  const highlights = (event.highlights || []).filter(h => h.image || h.title);
  const benefits = (event.benefits || []).filter(Boolean).slice(0, 6);

  const posterDesktop = event.branding.heroDesktop || '';
  const posterMobile = event.branding.heroMobile || posterDesktop;
  const poster = posterMobile || posterDesktop;

  const prices = event.tickets.map(t => t.price).filter(p => typeof p === 'number');
  const lowest = prices.length ? Math.min(...prices) : null;
  const oneFlatPrice = prices.length > 0 && new Set(prices).size === 1;
  const feeText =
    lowest == null ? null
      : lowest === 0 ? 'Free'
      : oneFlatPrice ? `₹${lowest}`
      : `From ₹${lowest}`;

  // Who can book, from the passes the admin created.
  const stuTiers = event.tickets.filter(t => t.requiresStudentId);
  const wrkTiers = event.tickets.filter(t => !t.requiresStudentId);
  const audienceText =
    stuTiers.length && wrkTiers.length ? 'Students & working professionals'
      : stuTiers.length ? 'Students only'
      : wrkTiers.length ? 'Working professionals'
      : '';
  const facts: { icon: React.ReactNode; k: string; v: string }[] = [];
  if (event.dates.display) facts.push({ icon: <CalendarDays />, k: 'Date', v: event.dates.display.split('·')[0].trim() });
  if (event.timing) facts.push({ icon: <Clock />, k: 'Timing', v: event.timing.replace(/\s*[-–]\s*/, ' – ') });
  if (audienceText) facts.push({ icon: <Users />, k: 'Open to', v: audienceText });
  if (event.ageLimit) facts.push({ icon: <Sparkles />, k: 'Age', v: event.ageLimit });
  if (event.transport) facts.push({ icon: <Bus />, k: 'Travel', v: event.transport });
  if (feeText) facts.push({ icon: <IndianRupee />, k: 'Fee', v: feeText });

  // "Ramateertham Yatra" → the last word is set in the accent gradient.
  const words = event.name.trim().split(/\s+/);
  const lead = words.length > 1 ? words.slice(0, -1).join(' ') : event.name;
  const tail = words.length > 1 ? words[words.length - 1] : '';

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <SmoothScroll />
      <GsapEffects />
      <div className="hk bc-root yt" data-theme={theme.id} data-hero={theme.mode} style={themeVars(theme) as React.CSSProperties}>

        {/* ── Hero: a sunrise over the hill ─────────────────────────────── */}
        <section className="yt-hero">
          <div className="yt-top"><YatraLogo org={event.org} /></div>
          <HeroIllustration />
          <HeroSceneLoader color={theme.mode === 'light' ? '#FFFFFF' : theme.gold} light={theme.mode === 'light'} />

          <div className="yt-hero-copy">
            <span className="yt-chip yt-up"><Sparkles size={14} />{event.dates.display || 'Upcoming yatra'}</span>
            <h1 className="yt-title yt-up">
              <span className="l1">{lead}</span>
              {tail && <span className="l2"><em>{tail}</em></span>}
            </h1>
            {event.tagline && <p className="yt-lede yt-up">{event.tagline}</p>}

            {event.branding.showCountdown && event.dates.start && (
              <div className="yt-up yt-count-d"><YtCountdown to={event.dates.start} /></div>
            )}

            <div className="yt-cta-row yt-up">
              <BookButton className="yt-btn yt-btn-gold">Register now <ArrowRight size={18} /></BookButton>
              {event.tickets.length > 0 && <a href="#register" className="yt-btn yt-btn-glass">View details</a>}
            </div>
          </div>
          <a href="#about" className="yt-scrollcue" aria-label="Scroll down"><i /></a>
        </section>

        {event.branding.showCountdown && event.dates.start && (
          <div className="yt-count-m" style={{ marginTop: 22 }}>
            <div className="cap">The yatra begins in</div>
            <YtCountdown to={event.dates.start} />
          </div>
        )}

        {/* ── Key facts ─────────────────────────────────────────────────── */}
        {facts.length > 0 && (
          <div className="yt-facts-wrap">
            <Reveal>
              <div className="yt-facts">
                {facts.map(f => (
                  <div className="yt-fact" key={f.k}>
                    <span className="ic">{f.icon}</span>
                    <span className="k">{f.k}</span>
                    <span className="v">{f.v}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        )}

        {/* ── About ─────────────────────────────────────────────────────── */}
        {(event.description || locations.length > 0 || event.venue) && (
          <section className="yt-sec" id="about">
            <Doodle name="temple" className="d-sm-hide" style={{ top: 70, right: "5%", width: 66 }} />
            <div className="yt-wrap yt-about">
              <div>
                <SecHead eyebrow="The journey" title={`About the ${event.name}`} />
                {event.description && (
                  <Reveal delay={80}>
                    <div className="yt-prose" dangerouslySetInnerHTML={{ __html: event.description }} />
                  </Reveal>
                )}
                {(event.venue || locations.length > 0) && (
                  <Reveal delay={160} className="yt-route">
                    {event.venue && (
                      <div><MapPin size={18} /><span><b>Starts from</b>{event.venue}</span></div>
                    )}
                    {locations.length > 0 && (
                      <div><Compass size={18} /><span><b>Route</b>{locations.join('  →  ')}</span></div>
                    )}
                  </Reveal>
                )}
                {benefits.length > 0 && (
                  <Reveal delay={220}>
                    <ul className="yt-benefits">
                      {benefits.slice(0, 4).map((b, i) => (
                        <li key={b}><span className="ic">{iconFor(b, i)}</span>{b}</li>
                      ))}
                    </ul>
                  </Reveal>
                )}
              </div>

              <Reveal delay={120} className="yt-about-art">
                <div className="yt-arch">
                  {poster ? (
                    <picture>
                      {posterDesktop && (
                        <source media="(min-width:768px)" srcSet={cdnSrcSet(posterDesktop, [400, 600, 800]) || posterDesktop} sizes="400px" />
                      )}
                      <img
                        src={cdnImage(poster, 800) || poster}
                        srcSet={cdnSrcSet(poster, [400, 640, 900]) || undefined}
                        sizes="(min-width:980px) 400px, 78vw"
                        alt={`${event.name} poster`}
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>
                  ) : (
                    <div className="yt-arch-empty"><HeroIllustration compact /></div>
                  )}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ── Highlights ────────────────────────────────────────────────── */}
        {highlights.length > 0 && (
          <section className="yt-sec yt-sec-tint" id="highlights">
            <Doodle name="mountain" className="d-sm-hide" style={{ top: 70, right: "5%", width: 72 }} />
            <div className="yt-wrap">
              <SecHead
                eyebrow="Highlights"
                title="What the day holds"
                sub={`${highlights.length} moments · one unforgettable yatra`}
              />
              <div className="yt-hl">
                {highlights.map((h, i) => (
                  <Reveal as="article" className="yt-hl-row" key={i} delay={i * 80}>
                    <div className={`yt-hl-vis${h.image ? ' has-img' : ''}`}>
                      {h.image ? (
                        <img
                          src={cdnImage(h.image, 520) || h.image}
                          srcSet={cdnSrcSet(h.image, [320, 520]) || undefined}
                          sizes="(min-width:900px) 240px, 80vw"
                          alt=""
                          width={520}
                          height={520}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <HighlightObject kind={kindFor(h.title)} label={h.title} />
                      )}
                    </div>
                    <div className="yt-hl-text">
                      {h.title && <h3>{h.title}</h3>}
                      {h.caption && <p>{h.caption}</p>}
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Itinerary ─────────────────────────────────────────────────── */}
        {event.timeline.length > 0 && (
          <section className="yt-sec" id="itinerary">
            <Doodle name="feet" className="d-sm-hide" style={{ top: 70, right: "6%", width: 58, rotate: "16deg" }} />
            <div className="yt-wrap yt-narrow">
              <SecHead eyebrow="Itinerary" title="Flow of the day" sub="Timings are indicative · the final schedule is shared on confirmation" />
              <Timeline items={event.timeline} />
            </div>
          </section>
        )}

        {/* ── Registration: the form itself, on the page ─────────────────── */}
        {event.tickets.length > 0 && (
          <section className="yt-sec yt-dark" id="register">
            <Doodle name="bus" className="d-sm-hide" style={{ top: 70, right: "5%", width: 72 }} />
            <div className="yt-wrap">
              <SecHead light eyebrow="Register" title="Join the yatra" sub="Limited places — fill in your details below to secure your seat" />
              <Reveal className="yt-regcard">
                <BookingModal event={event} inline />
              </Reveal>
            </div>
          </section>
        )}

        <TripFooter org={event.org} />

        <RegisterWatch />
        <div className="yt-bar">
          <div className="lbl"><b>{event.name}</b><span>{event.dates.display || ''}</span></div>
          <BookButton className="yt-btn yt-btn-gold">Register</BookButton>
        </div>

        {/* Portal target for the booking sheet — see BookingModal. Must stay a
            direct child of .bc-root and outside every wrapper. */}
        <div id="yc-modal-root" />
      </div>
    </>
  );
}
