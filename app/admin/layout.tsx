'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch, clearAdminToken } from '@/lib/api';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: DashboardIcon },
  { href: '/admin/events', label: 'Events', icon: EventsIcon },
  { href: '/admin/registrations', label: 'Registrations', icon: UsersIcon },
  { href: '/admin/colleges', label: 'Colleges', icon: CollegeIcon },
  { href: '/admin/refund', label: 'Refunds', icon: RefundIcon },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Below lg the sidebar is an off-canvas drawer; from lg up it is always
  // visible and this flag is ignored.
  const [navOpen, setNavOpen] = useState(false);

  const current = NAV.find(item =>
    item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
  );

  // Tapping a link navigates — close the drawer so the new page is visible.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  // Don't let the page behind the drawer scroll, and let Escape close it.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setNavOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

  async function logout() {
    clearAdminToken();
    try { await apiFetch('/api/admin/logout', { method: 'POST' }); } catch { /* best-effort */ }
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-white/95 backdrop-blur border-b border-stone-200">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={navOpen}
          className="icon-btn -ml-1 shrink-0"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          Y
        </div>
        <span className="font-extrabold text-sm text-stone-900 tracking-tight truncate">
          {current?.label || 'Admin'}
        </span>
      </header>

      {/* Backdrop (mobile only) */}
      {navOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          navOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-stone-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-base font-bold shrink-0">
              Y
            </div>
            <div className="min-w-0">
              <div className="text-stone-900 font-extrabold text-sm tracking-tight leading-none truncate">Yatra Clubbing</div>
              <div className="text-stone-400 text-[10px] tracking-widest leading-none mt-1 uppercase">Admin Console</div>
            </div>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className="icon-btn lg:hidden shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const isActive = item.href === current?.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-stone-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
          >
            <LogoutIcon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-60 min-w-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

/* Icons (inline SVG, 24x24, currentColor) */
type IconProps = { className?: string; strokeWidth?: number };

function DashboardIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
      <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
    </svg>
  );
}

function EventsIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2v4M16 2v4" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
    </svg>
  );
}

function UsersIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 20c.8-3.2 2.9-5 5.5-5s4.7 1.8 5.5 5" />
      <path d="M16 5a3.5 3.5 0 0 1 0 6.5" />
      <path d="M17.5 15.5c1.6.6 2.6 2 3 4.5" />
    </svg>
  );
}

function RefundIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
      <path d="M9 12l3 3 3-3" />
      <path d="M12 15V7" />
    </svg>
  );
}

function CollegeIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 9 12 5 2 9l10 4 10-4Z" />
      <path d="M6 10.6V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5.4" />
      <path d="M22 9v5" />
    </svg>
  );
}

function MenuIcon({ className, strokeWidth = 1.9 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function LogoutIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" />
      <path d="M15 12H3" />
      <path d="M6 8l-4 4 4 4" />
    </svg>
  );
}