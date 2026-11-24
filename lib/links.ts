/**
 * The public address of a trip.
 *
 * Trips created before the "Page link" field existed were given a random slug
 * like "event-mtilhkqh". That is not something to put on a poster, so it is
 * ignored: such a trip keeps using its short code (/YF) until someone sets a
 * readable page link for it in the admin.
 */
const AUTO_SLUG = /^event-[a-z0-9]{5,}$/;

export function readableSlug(slug?: string | null): string {
  const s = String(slug || '').trim();
  return s && !AUTO_SLUG.test(s) ? s : '';
}

export function eventPath(e: { code: string; slug?: string | null }): string {
  return '/' + (readableSlug(e.slug) || e.code);
}
