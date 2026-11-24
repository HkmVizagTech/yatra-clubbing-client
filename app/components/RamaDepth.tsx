'use client';

import { useEffect, useRef } from 'react';

/** fit "cover" fills the frame (backgrounds); "contain" keeps the whole picture inside it (a figure on a transparent background). */
export type DepthLayer = { name: string; z: number; fit?: "cover" | "contain"; scale?: number; y?: number };

const EXT = ['webp', 'png', 'jpg', 'jpeg', 'avif'];

/**
 * A picture with depth. Each layer (background, Rama, foreground petals) is a
 * flat plane at its own distance, and the camera sways, so the layers slide past
 * each other like a pop-up book. Gold dust floats between them. On a laptop the
 * mouse steers it; on a phone it follows how far you have scrolled, plus a slow
 * idle sway. Pauses off screen; one still frame for reduced motion.
 */
export default function RamaDepth({ layers, label, onResult }: { layers: DepthLayer[]; label: string; onResult?: (found: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || layers.length === 0) return;
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      if (disposed) return;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
      const CAM_Z = 6;
      camera.position.set(0, 0, CAM_Z);

      const loader = new THREE.TextureLoader();
      const planes: { mesh: import('three').Mesh; aspect: number; z: number; fit: "cover" | "contain"; scale: number; y: number }[] = [];

      const fit = () => {
        const w = el.clientWidth || 300;
        const h = el.clientHeight || 375;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        for (const p of planes) {
          const viewH = 2 * Math.tan((camera.fov * Math.PI) / 360) * (CAM_Z - p.z);
          const viewW = viewH * camera.aspect;
          // cover the frame (with a little extra so the sway never shows an edge)
          if (p.fit === 'contain') {
            let ph = viewH * p.scale;
            let pw = ph * p.aspect;
            if (pw > viewW * p.scale) { pw = viewW * p.scale; ph = pw / p.aspect; }
            p.mesh.scale.set(pw, ph, 1);
            p.mesh.position.y = viewH * p.y;
            continue;
          }
          const over = 1.1 + Math.abs(p.z) * 0.06;
          let ph = viewH * over;
          let pw = ph * p.aspect;
          if (pw < viewW * over) { pw = viewW * over; ph = pw / p.aspect; }
          p.mesh.scale.set(pw, ph, 1);
        }
      };

      // each layer is /rama/<name>.<ext>; the first extension that exists wins
      const loadLayer = (name: string, i = 0): Promise<import('three').Texture | null> =>
        i >= EXT.length ? Promise.resolve(null) : new Promise(res => {
          loader.load(`/rama/${name}.${EXT[i]}`, res, undefined, () => res(loadLayer(name, i + 1) as never));
        });

      await Promise.all(layers.map(l => new Promise<void>(resolve => {
        loadLayer(l.name).then(tex => {
          if (!tex) return resolve();
          if (disposed) { tex.dispose(); return resolve(); }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          const img = tex.image as { width: number; height: number };
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true })
          );
          mesh.position.z = l.z;
          scene.add(mesh);
          planes.push({ mesh, aspect: img.width / img.height, z: l.z, fit: l.fit || 'cover', scale: l.scale ?? 1, y: l.y ?? 0 });
          resolve();
        });
      })));
      if (disposed) { renderer.dispose(); renderer.domElement.remove(); return; }
      if (planes.length === 0) { renderer.dispose(); renderer.domElement.remove(); onResult?.(false); return; }
      fit();
      onResult?.(true);

      // gold dust
      const N = 110;
      const pos = new Float32Array(N * 3);
      const seed = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 5;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
        pos[i * 3 + 2] = -0.5 + Math.random() * 1.6;
        seed[i] = Math.random() * 6.28;
      }
      const dotCanvas = document.createElement('canvas');
      dotCanvas.width = dotCanvas.height = 64;
      const g = dotCanvas.getContext('2d')!;
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,226,150,1)');
      grd.addColorStop(0.4, 'rgba(255,190,80,.55)');
      grd.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      const dotTex = new THREE.CanvasTexture(dotCanvas);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const dust = new THREE.Points(geo, new THREE.PointsMaterial({
        map: dotTex, size: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85,
      }));
      scene.add(dust);

      const ro = new ResizeObserver(fit);
      ro.observe(el);

      // input: mouse on laptops, scroll position on phones
      let mx = 0, my = 0, tx = 0, ty = 0, usedMouse = false;
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        const r = el.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        my = ((e.clientY - r.top) / r.height - 0.5) * 2;
        usedMouse = true;
      };
      const onLeave = () => { mx = 0; my = 0; };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);

      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let visible = true;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '80px' });
      io.observe(el);

      const t0 = performance.now();
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const t = (now - t0) / 1000;
        if (!usedMouse) {
          const r = el.getBoundingClientRect();
          const prog = Math.min(Math.max((window.innerHeight - r.top) / (window.innerHeight + r.height), 0), 1);
          mx = Math.sin(t * 0.55) * 0.55;
          my = (prog - 0.5) * 1.6;
        }
        tx += (mx - tx) * 0.06;
        ty += (my - ty) * 0.06;
        camera.position.x = tx * 0.4;
        camera.position.y = -ty * 0.28;
        camera.lookAt(0, 0, 0);
        const a = geo.getAttribute('position') as import('three').BufferAttribute;
        for (let i = 0; i < N; i++) {
          let y = a.getY(i) + 0.0035 + Math.sin(t + seed[i]) * 0.0008;
          if (y > 3) y = -3;
          a.setY(i, y);
          a.setX(i, a.getX(i) + Math.sin(t * 0.6 + seed[i]) * 0.0012);
        }
        a.needsUpdate = true;
        renderer.render(scene, camera);
      };
      if (still) renderer.render(scene, camera); else raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect(); io.disconnect();
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
        for (const p of planes) {
          const m = p.mesh.material as import('three').MeshBasicMaterial;
          m.map?.dispose(); m.dispose(); p.mesh.geometry.dispose();
        }
        geo.dispose(); dotTex.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, [layers]);

  return <div ref={host} className="yt-rama-stage" role="img" aria-label={label} />;
}
