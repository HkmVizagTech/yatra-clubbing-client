// Set NEXT_PUBLIC_API_URL in Vercel. It is inlined at build time, so changing
// it needs a redeploy, not just a restart.
//
// The fallback used to be http://localhost:3000, which does not exist on a
// serverless host — a missing variable therefore produced a silently empty site
// rather than an error anyone could see. Falling back to the real backend keeps
// the site working, and the warning below says why it is doing so.
const PRODUCTION_API = 'https://yatra-clubbing-server-production.up.railway.app';

function resolveApiBase(): string {
  const configured = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : '';
  if (configured) return configured.replace(/\/+$/, '');

  const isBrowser = typeof window !== 'undefined';
  const onLocalhost = isBrowser && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  if (onLocalhost) return 'http://localhost:3000';

  if (!isBrowser) {
    console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to', PRODUCTION_API);
  }
  return PRODUCTION_API;
}

export const API_BASE = resolveApiBase();

export const ADMIN_TOKEN_KEY = 'yc_admin_token';

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token: string) {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    /* noop */
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* noop */
  }
}

// Admin fetch helper: attaches the Bearer token, forwards 401 to /login.
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getAdminToken();
  if (token) headers.set('Authorization', 'Bearer ' + token);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const r = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (r.status === 401 && typeof window !== 'undefined') {
    clearAdminToken();
    window.location.href = '/login';
  }
  return r;
}

// Public/booking fetch helper (no auth).
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
