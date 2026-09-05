import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://test.harekrishnavizag.org').replace(/\/+$/, '');

/**
 * The public event pages should be findable; the console should not.
 *
 * This replaces the site-wide `robots: noindex,nofollow` that used to sit in
 * the root layout and kept every registration page out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/login', '/api/'],
      },
    ],
    host: SITE_URL,
  };
}
