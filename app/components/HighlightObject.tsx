'use client';

import { useEffect, useRef, useState } from 'react';

import type { ObjectKind } from '@/lib/objectKind';

const C = {
  saffron: 0xe8812a, gold: 0xf5b942, sand: 0xf3e3c3, cream: 0xfff6e4, plum: 0x5b2a6b,
  plumDark: 0x3a1a4a, rose: 0xe58aa0, clay: 0xb4572f, leaf: 0x6fae7c, white: 0xf7f2ea,
};

/**
 * A small floating low-poly object, drawn with three.js. Lives on the page
 * background (no box), turns slowly and bobs. Pauses when off screen, draws a
 * single still frame for visitors who prefer reduced motion, and quietly shows
 * nothing if WebGL is unavailable.
 */
export default function HighlightObject({ kind, label }: { kind: ObjectKind; label?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      if (disposed || !el) return;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 1.5, 9.8);
      camera.lookAt(0, 0.0, 0);

      scene.add(new THREE.HemisphereLight(0xfff1dc, 0x5b2a6b, 1.05));
      const key = new THREE.DirectionalLight(0xffe2b0, 2.4);
      key.position.set(3.5, 5, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xb48cff, 0.9);
      rim.position.set(-4, 2, -3);
      scene.add(rim);

      const mat = (color: number, rough = 0.6, flat = false) =>
        new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05, flatShading: flat });

      const group = new THREE.Group();
      scene.add(group);
      const add = (geo: import('three').BufferGeometry, m: import('three').Material, x = 0, y = 0, z = 0) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        group.add(mesh);
        return mesh;
      };

      // ── the objects ──────────────────────────────────────────────────────
      if (kind === 'temple') {
        add(new THREE.BoxGeometry(2.6, 0.22, 2.6), mat(C.sand), 0, -0.9, 0);
        add(new THREE.BoxGeometry(2.1, 0.22, 2.1), mat(C.cream), 0, -0.7, 0);
        add(new THREE.BoxGeometry(1.5, 1.0, 1.5), mat(C.cream, 0.7), 0, -0.1, 0);
        add(new THREE.BoxGeometry(0.46, 0.62, 0.1), mat(C.plum), 0, -0.3, 0.76); // doorway
        add(new THREE.BoxGeometry(1.7, 0.14, 1.7), mat(C.saffron), 0, 0.46, 0);
        add(new THREE.ConeGeometry(1.0, 0.9, 4, 1), mat(C.saffron, 0.55, true), 0, 1.0, 0).rotation.y = Math.PI / 4;
        add(new THREE.ConeGeometry(0.62, 0.7, 4, 1), mat(C.gold, 0.5, true), 0, 1.65, 0).rotation.y = Math.PI / 4;
        add(new THREE.SphereGeometry(0.13, 16, 12), mat(C.gold, 0.3), 0, 2.08, 0);
        add(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), mat(C.white), 0, 2.36, 0);
        add(new THREE.PlaneGeometry(0.42, 0.26), new THREE.MeshStandardMaterial({ color: C.saffron, side: THREE.DoubleSide, roughness: 0.6 }), 0.21, 2.5, 0);
        group.position.y = -0.2;
        group.scale.setScalar(0.92);
      } else if (kind === 'mountain') {
        add(new THREE.ConeGeometry(1.5, 2.2, 6, 1), mat(C.plum, 0.7, true), -0.45, -0.1, 0);
        add(new THREE.ConeGeometry(0.55, 0.8, 6, 1), mat(C.white, 0.8, true), -0.45, 0.78, 0);
        add(new THREE.ConeGeometry(1.1, 1.5, 6, 1), mat(C.plumDark, 0.7, true), 1.0, -0.45, 0.3);
        add(new THREE.ConeGeometry(0.4, 0.55, 6, 1), mat(C.white, 0.8, true), 1.0, 0.07, 0.3);
        add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), mat(C.white), -0.45, 1.55, 0);
        add(new THREE.PlaneGeometry(0.46, 0.28), new THREE.MeshStandardMaterial({ color: C.saffron, side: THREE.DoubleSide }), -0.22, 1.72, 0);
        group.position.set(-0.1, -0.15, 0);
        group.scale.setScalar(0.95);
      } else if (kind === 'drum') {
        const pts: import('three').Vector2[] = [];
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const r = 0.3 + Math.sin(Math.PI * t) * 0.34 + (t < 0.5 ? 0 : (t - 0.5) * 0.2);
          pts.push(new THREE.Vector2(r, (t - 0.5) * 2.9));
        }
        const drum = new THREE.Group();
        const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat(C.clay, 0.55));
        drum.add(body);
        for (const y of [-0.8, 0.0, 0.8]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 + Math.sin(Math.PI * (y / 2.9 + 0.5)) * 0.34, 0.045, 10, 36), mat(y > 0.3 ? C.gold : C.rose, 0.4));
          ring.rotation.x = Math.PI / 2;
          ring.position.y = y;
          drum.add(ring);
        }
        for (const y of [-1.45, 1.45]) {
          const skin = new THREE.Mesh(new THREE.CircleGeometry(y > 0 ? 0.72 : 0.3, 28), mat(C.white, 0.9));
          skin.rotation.x = y > 0 ? -Math.PI / 2 : Math.PI / 2;
          skin.position.y = y;
          drum.add(skin);
        }
        drum.rotation.z = Math.PI / 2 - 0.22;
        group.add(drum);
        group.scale.setScalar(0.95);
      } else if (kind === 'thali') {
        add(new THREE.CylinderGeometry(1.35, 1.2, 0.14, 40), mat(C.white, 0.35), 0, -0.4, 0);
        add(new THREE.CylinderGeometry(1.0, 1.0, 0.04, 40), mat(0xe9e2d6, 0.5), 0, -0.31, 0);
        const bowls = [C.gold, C.leaf, C.rose, C.saffron, C.cream];
        bowls.forEach((col, i) => {
          const a = (i / bowls.length) * Math.PI * 2;
          add(new THREE.CylinderGeometry(0.28, 0.22, 0.14, 20), mat(col, 0.6), Math.cos(a) * 0.72, -0.24, Math.sin(a) * 0.72);
        });
        add(new THREE.SphereGeometry(0.34, 20, 14), mat(C.white, 0.7), 0, -0.14, 0);
        group.rotation.x = 0.28;
        group.scale.setScalar(0.95);
      } else {
        add(new THREE.IcosahedronGeometry(1.1, 0), mat(C.saffron, 0.35, true));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 10, 60), mat(C.gold, 0.4));
        ring.rotation.x = Math.PI / 2.4;
        group.add(ring);
      }

      // soft ground shadow
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(1.25, 40),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.45;
      scene.add(shadow);

      const resize = () => {
        const w = el.clientWidth || 200;
        const h = el.clientHeight || 200;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let visible = true;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '120px' });
      io.observe(el);

      const base = kind === 'drum' ? 0 : -0.35;
      group.rotation.y = base;
      const t0 = performance.now();
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const t = (now - t0) / 1000;
        group.rotation.y = kind === 'drum' ? Math.sin(t * 0.7) * 0.55 : base + t * 0.45;
        group.position.y += ((kind === 'temple' ? -0.2 : kind === 'mountain' ? -0.15 : 0) + Math.sin(t * 1.4) * 0.09 - group.position.y) * 0.2;
        const s = 1 - Math.sin(t * 1.4) * 0.03;
        shadow.scale.set(s, s, s);
        renderer.render(scene, camera);
      };
      if (still) renderer.render(scene, camera);
      else raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        scene.traverse(o => {
          const m = o as import('three').Mesh;
          if (m.geometry) m.geometry.dispose();
          const mm = m.material as import('three').Material | import('three').Material[] | undefined;
          if (Array.isArray(mm)) mm.forEach(x => x.dispose()); else if (mm) mm.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, [kind]);

  return <div ref={host} className="yt-hl-3d" role="img" aria-label={label || kind} data-failed={failed || undefined} />;
}
