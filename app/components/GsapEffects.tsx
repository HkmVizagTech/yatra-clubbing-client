'use client';

import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP layer for the event page: staggered hero entrance and scroll-linked
 * parallax. Renders nothing. Skipped entirely under reduced motion (the CSS
 * fallbacks in yatra.css already show everything).
 */
export default function GsapEffects() {
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.querySelector('.yt');
    if (!root) return;
    root.classList.add('yt-gsap'); // switches the CSS entrance animation off

    const ctx = gsap.context(() => {
      gsap.from('.yt-up', { y: 36, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.1 });

      gsap.to('.yt-scene', { y: 90, ease: 'none', scrollTrigger: { trigger: '.yt-hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.from('.yt-close-name', {
        scale: 0.88, opacity: 0.2, ease: 'none',
        scrollTrigger: { trigger: '.yt-close', start: 'top 85%', end: 'center 55%', scrub: true },
      });
      gsap.from('.yt-hero .yt-sun', { y: 240, duration: 2.6, ease: 'power2.out' });
      const hs = { trigger: '.yt-hero', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.yt-hero .yt-layer-far', { y: 26, ease: 'none', scrollTrigger: hs });
      gsap.to('.yt-hero .yt-layer-mid', { y: 56, ease: 'none', scrollTrigger: hs });
      gsap.to('.yt-hero .yt-layer-near', { y: 92, ease: 'none', scrollTrigger: hs });
    }, root as Element);

    return () => { ctx.revert(); root.classList.remove('yt-gsap'); };
  }, []);
  return null;
}
