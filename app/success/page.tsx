import type { Metadata } from 'next';
import Link from 'next/link';
import './success.css';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { fetchEventByCode } from '@/lib/publicEvents';
import { ORG } from '@/lib/site';

// The booking data arrives in the query string (this page has no auth and no
// cookie), so it must never sit in the static cache or be indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Booking confirmed',
  robots: { index: false, follow: false },
};

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

// Show a little of the number so the person recognizes it, hide the rest.
const maskPhone = (p: string) =>
  p && p.length >= 6 ? `${p.slice(0, 4)} •••• ${p.slice(-2)}` : p;

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

export default async function SuccessPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const qp = await searchParams;
  const get = (k: string) => (typeof qp[k] === 'string' ? (qp[k] as string) : '');

  const ref = get('ref');
  const eventCode = get('event');
  const name = get('name');
  const phone = get('phone');
  const totalRaw = get('total');
  const tierKey = get('tier');

  const total = Number(totalRaw) || 0;
  const hasBooking = Boolean(ref);

  // Best-effort: the event may have been unpublished by the time this loads.
  const event = eventCode ? await fetchEventByCode(eventCode) : null;
  const tier = tierKey && event ? event.tickets.find(t => t.key === tierKey) : undefined;

  return (
    <div className="hk succ">
      <SiteHeader />
      <main className="succ-main">
        <div className="succ-top">
          <span className="succ-eyebrow">Hare Krishna</span>
          <h1 className="succ-title">
            {hasBooking ? 'Your seat is reserved' : 'Almost there'}
          </h1>
          <p className="succ-sub">
            {event
              ? `${event.name}${event.dates?.display ? ' · ' + event.dates.display : ''}`
              : 'See you on the yatra!'}
          </p>
        </div>

        <div className="succ-wrap">

          {hasBooking ? (
            <div className="succ-card">
              <div className="succ-ref">
                <span>Booking ref</span>
                <b>{ref}</b>
              </div>

              <div className="bc-summary">
                <div className="bc-srow"><span>Name</span><span>{name || 'Guest'}</span></div>
                {phone && <div className="bc-srow"><span>Phone</span><span className="amt">{maskPhone(phone)}</span></div>}
                {tier && <div className="bc-srow"><span>Pass</span><span>{tier.name}</span></div>}
                {total > 0 && <div className="bc-srow tot"><span>Amount paid</span><span className="amt">{inr(total)}</span></div>}
              </div>

              <div className="bc-timeline">
                <div className="bc-tl-item done"><div className="bc-tl-dot">✓</div><div><b>Payment received</b><span>Your seat is paid &amp; reserved.</span></div></div>
                <div className="bc-tl-item now"><div className="bc-tl-dot">●</div><div><b>Bring your college ID</b><span>Carry your college / school ID — our team verifies it on the day, before you board.</span></div></div>
                <div className="bc-tl-item"><div className="bc-tl-dot">♪</div><div><b>See you there</b><span>Boarding details come to your WhatsApp a day before the yatra.</span></div></div>
              </div>

              <div className="succ-note">If you don’t receive our WhatsApp confirmation, keep this booking ref handy and call {ORG.phone}.</div>

              <div className="succ-actions">
                {event && <Link className="hk-btn" href={`/${event.code}`}>View event</Link>}
                <Link className="hk-btn succ-btn-ghost" href="/">Go to home</Link>
              </div>
            </div>
          ) : (
            <div className="succ-card succ-empty">
              <p>We couldn’t find a booking reference — you may have opened this page on its own. Your confirmation was also sent to WhatsApp; check there, or visit the yatra page to book.</p>
              <Link className="hk-btn" href="/">Explore yatras</Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}