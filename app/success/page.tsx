import type { Metadata } from 'next';
import Link from 'next/link';
import '../public.css';
import '../yatra.css';
import './success.css';
import YatraLogo from '../components/YatraLogo';
import { Confetti, CopyRef, ShareButton } from './SuccessFX';
import { eventPath } from '@/lib/links';
import { fetchEventByCode } from '@/lib/publicEvents';
import { themeFor, themeVars } from '@/lib/tripThemes';

// The booking data arrives in the query string (this page has no auth and no
// cookie), so it must never sit in the static cache or be indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Booking confirmed',
  robots: { index: false, follow: false },
};

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

// Show a little of the number so the person recognizes it, hide the rest.
const maskPhone = (p: string) => (p && p.length >= 6 ? `${p.slice(0, 4)} •••• ${p.slice(-2)}` : p);

interface SearchParams { [key: string]: string | string[] | undefined }

/** "6:00 AM" → [6, 0] */
function clock(timing?: string): [number, number] | null {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(timing || '');
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'pm') h += 12;
  return [h, Number(m[2] || 0)];
}

/** A calendar file the person can open to save the trip. Date-only when the time is unknown. */
function calendarLink(event: { name: string; venue: string; timing?: string; dates: { start?: string } }): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(event.dates.start || '');
  if (!d) return null;
  const day = `${d[1]}${d[2]}${d[3]}`;
  const t = clock(event.timing);
  const pad = (n: number) => String(n).padStart(2, '0');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Yatra Clubbing//EN', 'BEGIN:VEVENT', `UID:${day}-${encodeURIComponent(event.name)}@yatra`, `SUMMARY:${event.name}`, `LOCATION:${event.venue || ''}`];
  if (t) {
    const end = Math.min(t[0] + 10, 23);
    lines.push(`DTSTART:${day}T${pad(t[0])}${pad(t[1])}00`, `DTEND:${day}T${pad(end)}${pad(t[1])}00`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${day}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
}

export default async function SuccessPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const qp = await searchParams;
  const get = (k: string) => (typeof qp[k] === 'string' ? (qp[k] as string) : '');

  const ref = get('ref');
  const eventCode = get('event');
  const name = get('name');
  const phone = get('phone');
  const tierKey = get('tier');
  const total = Number(get('total')) || 0;
  const waived = get('idw') === '1';
  const hasBooking = Boolean(ref);

  // Best-effort: the event may have been unpublished by the time this loads.
  const event = eventCode ? await fetchEventByCode(eventCode) : null;
  const tier = tierKey && event ? event.tickets.find(t => t.key === tierKey) : undefined;
  const theme = themeFor(event?.code || eventCode || 'trip');
  const first = (name || 'friend').trim().split(/\s+/)[0];
  const needsId = !!tier?.requiresStudentId && !waived;
  const cal = event ? calendarLink(event) : null;

  const steps = [
    { icon: '✓', title: 'Payment received', text: 'Your seat is paid and reserved.', done: true },
    { icon: '💬', title: 'Check WhatsApp', text: 'Your confirmation is on its way to your WhatsApp number.' },
    needsId
      ? { icon: '🪪', title: 'Carry your college ID', text: 'Our team checks it before you board.' }
      : tier?.requiresStudentId
        ? { icon: '🎉', title: 'No ID needed', text: 'You are on our special list, so just show up.' }
        : { icon: '🎒', title: 'Be ready', text: 'Wear comfortable shoes and bring a water bottle.' },
    { icon: '🚩', title: 'See you there', text: event ? `${event.timing ? event.timing + ' · ' : ''}${event.venue || 'Details on WhatsApp'}` : 'Boarding details come on WhatsApp.' },
  ];

  return (
    <div className="hk yt sx" data-theme={theme.id} data-hero="dark" style={themeVars(theme) as React.CSSProperties}>
      <Confetti />
      <div className="sx-sparks" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 70}%`, animationDelay: `${(i % 7) * 0.5}s` }} />)}</div>
      <svg className="sx-hills" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 220c140-70 260-90 400-50s260 60 420-10 400-60 620 20v140H0z" fill="var(--hill1)" opacity=".9" />
        <path d="M0 270c180-60 330-70 520-20s330 30 520-30 280-20 400 20v80H0z" fill="var(--hill3)" />
      </svg>

      <main className="sx-main">
        <div className="sx-logo"><YatraLogo org={event?.org} /></div>

        {hasBooking ? (
          <>
            <div className="sx-badge" aria-hidden="true">
              <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27l8 8 15-17" /></svg>
            </div>
            <p className="sx-eyebrow">Hare Krishna</p>
            <h1 className="sx-title">{first}, your seat is <em>reserved</em></h1>
            {event && <p className="sx-sub">{event.name}{event.dates?.display ? ` · ${event.dates.display}` : ''}</p>}

            <section className="sx-ticket" aria-label="Your pass">
              <div className="sx-t-main">
                <div className="sx-t-kicker">{tier?.name ? `${tier.name} pass` : 'Pass'}</div>
                <div className="sx-t-name">{event?.name || 'Yatra'}</div>
                <dl className="sx-t-grid">
                  {event?.dates?.display && <div><dt>Date</dt><dd>{event.dates.display}</dd></div>}
                  {event?.timing && <div><dt>Reporting</dt><dd>{event.timing}</dd></div>}
                  <div><dt>Name</dt><dd>{name || 'Guest'}</dd></div>
                  {phone && <div><dt>Mobile</dt><dd>{maskPhone(phone)}</dd></div>}
                  {event?.venue && <div className="wide"><dt>Meeting point</dt><dd>{event.venue}</dd></div>}
                </dl>
              </div>
              <div className="sx-t-stub">
                <div className="sx-t-kicker">Booking ID</div>
                <div className="sx-t-ref">{ref}</div>
                <CopyRef value={ref} />
                {total > 0 && <div className="sx-t-paid"><span>Paid</span><b>{inr(total)}</b></div>}
              </div>
            </section>

            <section className="sx-steps" aria-label="What happens next">
              <h2>What happens next</h2>
              <ol>
                {steps.map((s, i) => (
                  <li key={i} className={s.done ? 'done' : ''}>
                    <span className="sx-s-ic" aria-hidden="true">{s.icon}</span>
                    <b>{s.title}</b>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="sx-actions">
              {cal && <a className="sx-btn sx-btn-main" href={cal} download="trip.ics">Add to calendar</a>}
              {event && <ShareButton text={`I'm going on ${event.name}${event.dates?.display ? ' · ' + event.dates.display : ''}. Join me!`} path={eventPath(event)} />}
            </div>
          </>
        ) : (
          <div className="sx-empty">
            <h1 className="sx-title">Almost there</h1>
            <p className="sx-sub">We couldn’t find a booking reference, so you may have opened this page on its own. Your confirmation was also sent to WhatsApp, so check there.</p>
            <div className="sx-actions">
              {event ? <Link className="sx-btn sx-btn-main" href={eventPath(event)}>View the trip</Link> : <Link className="sx-btn sx-btn-main" href="/">Explore yatras</Link>}
            </div>
          </div>
        )}

        <footer className="sx-foot">
          <span>Need help?</span>
          <a href="tel:+918977761187">+91 89777 61187</a>
          <i aria-hidden="true">·</i>
          <a href="mailto:social@hkmvizag.org">social@hkmvizag.org</a>
        </footer>
      </main>
    </div>
  );
}
