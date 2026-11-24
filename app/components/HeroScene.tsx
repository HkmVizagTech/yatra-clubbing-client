'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Hero backdrop: warm embers drifting upward (like diya sparks) around a slowly
 * turning mandala ring. Pure decoration — pointer-transparent, paused when off
 * screen, a single still frame under reduced motion.
 */
export default function HeroScene({ color = '#E0A020', light = false }: { color?: string; light?: boolean }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 720;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !small, powerPreference: 'low-power' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 9;
    const tint = new THREE.Color(color);

    // Soft round sprite drawn once on a canvas.
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(c);

    const N = small ? 70 : 150;
    const pos = new Float32Array(N * 3);
    const speed = new Float32Array(N);
    const drift = new Float32Array(N);
    const rnd = (i: number) => {
      const x = Math.sin(i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rnd(i) - 0.5) * 16;
      pos[i * 3 + 1] = (rnd(i + 99) - 0.5) * 11;
      pos[i * 3 + 2] = (rnd(i + 7) - 0.5) * 6;
      speed[i] = 0.12 + rnd(i + 3) * 0.32;
      drift[i] = rnd(i + 55) * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: sprite,
      color: tint,
      size: 0.2,
      transparent: true,
      opacity: light ? 0.7 : 0.85,
      depthWrite: false,
      blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(geo, mat));

    // Mandala: three nested rings, tilted, hairline.
    const mandala = new THREE.Group();
    const rings: [number, number, number][] = [[3.1, 0.34, 96], [2.35, 0.24, 8], [1.6, 0.2, 12]];
    rings.forEach(([r, o, segs], idx) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const rr = r * (idx > 0 && i % 2 ? 0.86 : 1);
        pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0));
      }
      mandala.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: tint, transparent: true, opacity: o })
        )
      );
    });
    mandala.position.set(small ? 0 : 3.6, 0.3, -2);
    mandala.rotation.x = 0.35;

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let mx = 0;
    let my = 0;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    if (!reduced) window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < N; i++) {
        let y = p.getY(i) + speed[i] * dt;
        if (y > 5.8) y = -5.8;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(now / 1800 + drift[i]) * 0.1 * dt);
      }
      p.needsUpdate = true;
      mandala.rotation.z += 0.05 * dt;
      camera.position.x += (mx * 1.2 - camera.position.x) * 0.04;
      camera.position.y += (-my * 0.8 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      if (visible && !reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      geo.dispose();
      mat.dispose();
      sprite.dispose();
      mandala.children.forEach(l => {
        (l as THREE.Line).geometry.dispose();
        ((l as THREE.Line).material as THREE.Material).dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [color, light]);

  return <div ref={host} className="yt-scene" aria-hidden="true" />;
}
