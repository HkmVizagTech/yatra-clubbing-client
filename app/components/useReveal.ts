'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight scroll-reveal that adds a visible class when the element scrolls
 * into view. Zero dependencies, uses IntersectionObserver, and respects
 * prefers-reduced-motion (the CSS only animates when motion is allowed).
 *
 * Returns a ref to attach to the element. The element should be styled with the
 * `.reveal` base CSS so it comes in with a subtle fade/slide.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}
