'use client';

import { useEffect } from 'react';

/**
 * Marks <body> while the registration form or the footer is on screen, so the
 * fixed "Register" bar can slide away instead of sitting on top of them.
 */
export default function RegisterWatch() {
  useEffect(() => {
    const els = [document.getElementById('register'), document.querySelector('.yt-foot')].filter(Boolean) as Element[];
    if (els.length === 0) return;
    const on = new Set<Element>();
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) on.add(e.target); else on.delete(e.target);
      }
      if (on.size > 0) document.body.setAttribute('data-in-reg', '1');
      else document.body.removeAttribute('data-in-reg');
    }, { threshold: 0.12 });
    els.forEach(e => io.observe(e));
    return () => { io.disconnect(); document.body.removeAttribute('data-in-reg'); };
  }, []);
  return null;
}
