'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Buttery inertial scrolling for the public pages (Lenis). Skipped when the
 * visitor prefers reduced motion. In-page anchors (#tickets …) are routed
 * through Lenis so they glide instead of jumping.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 3), smoothWheel: true });
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      const id = a?.getAttribute('href');
      if (!a || !id || id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -72 });
    };
    document.addEventListener('click', onClick);

    // Pause smooth scroll while the booking sheet locks the page.
    const watch = new MutationObserver(() => {
      if (document.body.style.overflow === 'hidden') lenis.stop(); else lenis.start();
    });
    watch.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener('click', onClick);
      watch.disconnect();
      lenis.destroy();
    };
  }, []);
  return null;
}
