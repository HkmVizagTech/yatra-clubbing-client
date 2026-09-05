import type { Metadata } from 'next';
import './globals.css';

// Absolute URLs are required for OpenGraph images, so metadataBase has to be
// the real public origin. Set NEXT_PUBLIC_SITE_URL in Vercel if the domain
// changes.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://test.harekrishnavizag.org').replace(/\/+$/, '');

// Note: there is deliberately no site-wide `robots: noindex` here. It used to
// be set, which kept the public registration pages out of Google entirely.
// /admin and /login are excluded via app/robots.ts instead.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Yatra Clubbing · Hare Krishna Vaikuntham',
    template: '%s · Yatra Clubbing',
  },
  description: 'Temple trails, seva and kirtan — one-day yatras from Hare Krishna Vaikuntham, Visakhapatnam.',
  applicationName: 'Yatra Clubbing',
  openGraph: {
    type: 'website',
    siteName: 'Yatra Clubbing',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
