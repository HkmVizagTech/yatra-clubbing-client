import { DAILY_SCHEDULE, LEGAL, MAIN_SITE, NAV, ORG, SOCIALS } from '@/lib/site';

const MANTRA = [
  'Hare Krishna Hare Krishna Krishna Krishna Hare Hare',
  'Hare Rama Hare Rama Rama Rama Hare Hare',
];

/* Filled glyphs — the stroke-outline versions of these marks read as blobs at
   17px, so each is a solid path instead. */
const GLYPHS: Record<string, React.ReactNode> = {
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </>
  ),
  YouTube: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor" />
    </>
  ),
  Facebook: (
    <path
      d="M13.6 21v-7.4h2.5l.4-2.9h-2.9V8.9c0-.84.23-1.41 1.44-1.41h1.54V4.9A20 20 0 0 0 14.35 4.8c-2.22 0-3.75 1.36-3.75 3.85v2.05H8.1v2.9h2.5V21z"
      fill="currentColor"
    />
  ),
  'WhatsApp Channel': (
    <path
      d="M12 3a8.9 8.9 0 0 0-7.6 13.5L3 21l4.6-1.3A8.9 8.9 0 1 0 12 3m0 1.8a7.1 7.1 0 1 1-3.7 13.2l-.3-.2-2.4.7.7-2.3-.2-.3A7.1 7.1 0 0 1 12 4.8m-2.9 3.6c-.15 0-.4.06-.6.3-.2.24-.78.76-.78 1.85s.8 2.15.9 2.3c.12.15 1.55 2.47 3.83 3.36 1.9.74 2.28.6 2.7.56.4-.04 1.32-.54 1.5-1.06.19-.52.19-.97.13-1.06-.06-.1-.2-.15-.44-.27-.23-.12-1.32-.65-1.53-.72-.2-.08-.35-.12-.5.11-.14.24-.56.72-.69.87-.13.15-.25.17-.48.06a6.1 6.1 0 0 1-1.8-1.11 6.8 6.8 0 0 1-1.25-1.56c-.13-.23-.01-.35.1-.47.1-.1.24-.27.35-.41.12-.14.16-.24.24-.4.08-.15.04-.29-.02-.4-.06-.12-.5-1.24-.7-1.7-.17-.42-.35-.36-.48-.37z"
      fill="currentColor"
    />
  ),
};

const Icon = ({ name }: { name: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    {GLYPHS[name] ?? GLYPHS.Instagram}
  </svg>
);

/**
 * Footer for the Yatra Clubbing subdomain — the same address, aarti schedule
 * and links the parent site carries, so the page closes the way
 * harekrishnavizag.org does.
 */
export default function SiteFooter() {
  return (
    <footer className="hk-footer">
      <div className="hk-footer-in">
        <div className="hk-footer-brand">
          <b>Hare Krishna Vaikuntham<br />Cultural Centre</b>
          <span className="sub">{ORG.city}</span>
          <p>{ORG.addressLines.map(l => <span key={l} style={{ display: 'block' }}>{l}</span>)}</p>
          <p style={{ marginTop: 14 }}>
            <a href={ORG.directions} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-bright)', fontWeight: 600 }}>
              Get directions →
            </a>
          </p>
          <p style={{ marginTop: 8 }}>
            <a href={ORG.phoneHref}>{ORG.phone}</a>{' · '}<a href={ORG.emailHref}>{ORG.email}</a>
          </p>
          <p className="hk-mantra">{MANTRA.map(l => <span key={l} style={{ display: 'block' }}>{l}</span>)}</p>
        </div>

        <div>
          <h4>Daily Schedule</h4>
          <ul className="hk-sched">
            {DAILY_SCHEDULE.map(([name, time]) => (
              <li key={name}><span>{name}</span><span>{time}</span></li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Quick Links</h4>
          <ul className="hk-links">
            {NAV.map(i => (
              <li key={i.label}><a href={i.href} {...(i.local ? {} : { rel: 'noopener' })}>{i.label}</a></li>
            ))}
          </ul>
          <h4 style={{ marginTop: 26 }}>Follow Us</h4>
          <div className="hk-socials">
            {SOCIALS.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                <Icon name={s.label} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="hk-footer-bottom">
        <div className="hk-footer-bottom-in">
          <span>
            © {new Date().getFullYear()} {ORG.name} India, {ORG.city}.{' '}
            <a href={MAIN_SITE} rel="noopener" style={{ color: 'var(--gold-bright)' }}>harekrishnavizag.org</a>
          </span>
          <nav aria-label="Legal">
            {LEGAL.map(l => <a key={l.label} href={l.href} rel="noopener">{l.label}</a>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
