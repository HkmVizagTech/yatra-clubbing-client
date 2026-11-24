'use client';

import dynamic from 'next/dynamic';

// three.js is client-only and heavy; load it after first paint.
const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

export default function HeroSceneLoader({ color, light }: { color?: string; light?: boolean }) {
  return <HeroScene color={color} light={light} />;
}
