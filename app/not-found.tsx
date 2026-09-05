import './public.css';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

/**
 * Shown when an event code doesn't exist (/YF when no such yatra is published),
 * and for any other unmatched path. Without this, Next.js serves its bare
 * default 404 — unstyled, no header, no way back — which on a public
 * registration link looks like the site is broken rather than the link being
 * wrong.
 */
export default function NotFound() {
  return (
    <div className="hk bc-root">
      <SiteHeader />
      <div
        className="bc-wrap"
        style={{
          minHeight: '54vh',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          paddingTop: 72,
          paddingBottom: 72,
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div className="bc-eyebrow">Page not found</div>
          <h1 className="bc-title" style={{ marginTop: 12 }}>
            This yatra isn&rsquo;t here
          </h1>
          <p className="bc-lede" style={{ marginInline: 'auto' }}>
            The link may be mistyped, or registrations for this yatra may have closed.
            Every yatra that is open right now is listed on the home page.
          </p>
          <div className="bc-herorow" style={{ justifyContent: 'center' }}>
            <a href="/" className="hk-btn">
              See all yatras
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
