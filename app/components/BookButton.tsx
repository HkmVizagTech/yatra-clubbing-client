'use client';

import type { ReactNode } from 'react';

/**
 * Client-side trigger for the booking modal.
 *
 * The homepage is an async Server Component, so it cannot attach an onClick
 * handler itself — doing so throws "Event handlers cannot be passed to Client
 * Component props" and renders as a 500 server-side exception. This tiny
 * client component owns the handler instead.
 */
export default function BookButton({
  className,
  preset,
  children,
}: {
  className?: string;
  preset?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent('yatra:open-booking', { detail: preset ? { preset } : {} })
        )
      }
    >
      {children}
    </button>
  );
}
