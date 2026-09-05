/**
 * Image delivery helpers.
 *
 * Posters and highlight photos are uploaded straight to Cloudinary at whatever
 * size the phone or camera produced — often two or three megabytes. The poster
 * is the whole hero, so on mobile data it is the slowest thing on the page.
 *
 * Cloudinary can resize and re-encode on delivery, so we only have to ask for
 * it in the URL. Anything that isn't a Cloudinary delivery URL (the admin also
 * accepts a pasted link, and /hero-desktop.jpg is a local file) is returned
 * untouched rather than rewritten into something that 404s.
 */

const UPLOAD_MARKER = '/image/upload/';

function isCloudinary(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes(UPLOAD_MARKER);
}

/**
 * A delivery URL capped to `width`, in the best format the browser accepts.
 *
 * c_limit only ever scales down, so a poster narrower than the cap is left at
 * its own size instead of being upscaled into blur.
 */
export function cdnImage(url: string | undefined, width: number): string {
  if (!url) return '';
  if (!isCloudinary(url)) return url;
  return url.replace(UPLOAD_MARKER, `${UPLOAD_MARKER}f_auto,q_auto,c_limit,w_${width}/`);
}

/**
 * A `srcset` string so the browser downloads the variant that fits its screen.
 * Returns '' for non-Cloudinary URLs, where there is only ever one file — pair
 * it with `srcSet={cdnSrcSet(...) || undefined}` so the attribute is dropped.
 */
export function cdnSrcSet(url: string | undefined, widths: number[]): string {
  if (!url || !isCloudinary(url)) return '';
  return widths.map(w => `${cdnImage(url, w)} ${w}w`).join(', ');
}
