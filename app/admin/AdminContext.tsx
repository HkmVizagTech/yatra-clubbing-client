'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminFetch, apiFetch, clearAdminToken, getAdminToken, getAdminUser, setAdminToken, setAdminUser, type AdminUser,
} from '@/lib/api';

type Ctx = {
  user: AdminUser;
  can: (permission: string) => boolean;
  signOut: () => Promise<void>;
  /** After a password change: swap in the fresh token and user. */
  replaceSession: (token: string, user: AdminUser) => void;
};

const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin(): Ctx {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin must be used inside <AdminProvider>');
  return c;
}

/**
 * Holds the signed-in admin for the whole console. The cached copy renders
 * instantly; /me then re-checks it with the server so a disabled account or a
 * changed role takes effect on the next page load, not at token expiry.
 */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [offline, setOffline] = useState(false);

  const check = useCallback(async () => {
    if (!getAdminToken()) { router.replace('/login'); return; }
    const cached = getAdminUser();
    if (cached) setUser(cached);
    setOffline(false);
    try {
      const r = await adminFetch('/api/admin/auth/me'); // a 401 sends the person to /login
      if (r.ok) {
        const d = await r.json() as { user: AdminUser };
        setAdminUser(d.user);
        setUser(d.user);
      } else if (!cached) {
        setOffline(true);
      }
    } catch {
      if (!cached) setOffline(true);
    }
  }, [router]);

  useEffect(() => { check(); }, [check]);

  const signOut = useCallback(async () => {
    try { await apiFetch('/api/admin/auth/logout', { method: 'POST' }); } catch { /* best-effort */ }
    clearAdminToken();
    router.replace('/login');
  }, [router]);

  const replaceSession = useCallback((token: string, next: AdminUser) => {
    setAdminToken(token);
    setAdminUser(next);
    setUser(next);
  }, []);

  const value = useMemo<Ctx | null>(
    () => (user ? { user, can: (p: string) => user.permissions.includes(p), signOut, replaceSession } : null),
    [user, signOut, replaceSession]
  );

  if (!value) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-stone-100 p-6 text-center">
        {offline ? (
          <div>
            <p className="text-stone-700 font-semibold mb-1">Can&apos;t reach the server</p>
            <p className="text-stone-500 text-sm mb-4">Check your connection and try again.</p>
            <button onClick={check} className="btn-primary text-sm">Retry</button>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-amber-500 animate-spin" aria-label="Loading" />
        )}
      </div>
    );
  }
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
