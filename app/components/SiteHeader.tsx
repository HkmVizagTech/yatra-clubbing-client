import { NAV, ORG } from '@/lib/site';

const PhoneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.78.7 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.27a2 2 0 0 1 2.11-.45c.83.34 1.71.57 2.61.7A2 2 0 0 1 22 16.92z"/></svg>
);
const MailIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);
const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);

/**
 * Header for the Yatra Clubbing subdomain.
 *
 * Deliberately mirrors harekrishnavizag.org: the slim navy utility strip with
 * phone and email, then a sticky white bar with the temple mark, the parent
 * site's navigation (linking back out to it) and a booking call-to-action.
 * Someone arriving here from the main site should not feel they've left it.
 *
 * `cta` is the page's own action — the booking button on an event page, nothing
 * on the chooser.
 */
export default function SiteHeader({ cta, activeHref }: { cta?: React.ReactNode; activeHref?: string }) {
  return (
    <>
      <div className="hk-utility">
        <div className="hk-utility-in">
          <div className="hk-utility-group">
            <a href={ORG.phoneHref}><PhoneIcon />{ORG.phone}</a>
            <a href={ORG.emailHref}><MailIcon />{ORG.email}</a>
          </div>
          <div className="hk-utility-group is-secondary">
            <a href={ORG.directions} target="_blank" rel="noopener noreferrer">
              <PinIcon />Gambhiram, Visakhapatnam
            </a>
          </div>
        </div>
      </div>

      <header className="hk-header">
        <div className="hk-header-in">
          <a href="/" className="hk-logo" aria-label="Yatra Clubbing — home">
            <span className="hk-logo-mark" aria-hidden="true">॥</span>
            <span className="hk-logo-text">
              <b>Yatra Clubbing</b>
              <span>{ORG.name} · {ORG.city}</span>
            </span>
          </a>

          <nav className="hk-nav" aria-label="Main">
            {NAV.map(item => (
              <a
                key={item.label}
                href={item.href}
                aria-current={activeHref && item.href === activeHref ? 'page' : undefined}
                {...(item.local ? {} : { rel: 'noopener' })}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hk-header-cta">{cta}</div>
        </div>
      </header>
    </>
  );
}
