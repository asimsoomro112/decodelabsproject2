import { useEffect, useRef } from 'react';
import type { ApiRequestDetail } from '../api/client';

/**
 * "Living nervous system" — a fixed 2D canvas behind everything.
 * Client (left) -> Gateway (middle) -> Server / Service (right), joined by
 * curved nerve paths with drifting particles. REAL traffic fires bright pulses
 * along the nerves, colored by status class, speed scaled by latency.
 */

interface Pt {
  x: number;
  y: number;
}
interface Cubic {
  a: Pt;
  b: Pt;
  c: Pt;
  d: Pt;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
}
interface Pulse {
  route: Cubic[];
  t: number;
  speed: number; // t-units per ms
  color: string;
  alpha: number;
  width: number;
  onDone?: () => void;
}

function cubicAt(c: Cubic, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * c.a.x + 3 * u * u * t * c.b.x + 3 * u * t * t * c.c.x + t * t * t * c.d.x,
    y: u * u * u * c.a.y + 3 * u * u * t * c.b.y + 3 * u * t * t * c.c.y + t * t * t * c.d.y,
  };
}

function routePoint(route: Cubic[], t: number): Pt {
  const seg = Math.min(route.length - 1, Math.floor(t * route.length));
  return cubicAt(route[seg], t * route.length - seg);
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return '#34d399';
  if (status >= 400 && status < 500) return '#fbbf24';
  if (status >= 500 || status === 0) return '#fb7185';
  return '#8b5cf6';
}

export default function NerveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;

    // Scene geometry (fractions of viewport).
    let nodes: { p: Pt; label: string; color: string }[] = [];
    let mains: Cubic[][] = [];
    let branches: Cubic[][] = [];
    let particles: Particle[] = [];
    const pulses: Pulse[] = [];

    // Parallax targets.
    let px = 0;
    let py = 0;
    let tpx = 0;
    let tpy = 0;

    // Optional media layer (/media/bg.mp4, else /media/poster.jpg, else none).
    const media: { mode: 'none' | 'video' | 'image'; video?: HTMLVideoElement; img?: HTMLImageElement } = {
      mode: 'none',
    };
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('canplay', () => {
      media.mode = 'video';
      media.video = video;
      video.play().catch(() => {});
    });
    video.addEventListener('error', () => {
      const img = new Image();
      img.onload = () => {
        media.mode = 'image';
        media.img = img;
      };
      img.onerror = () => {
        media.mode = 'none';
      };
      img.src = '/media/poster.jpg';
    });
    video.src = '/media/bg.mp4';

    function layout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const F = (fx: number, fy: number): Pt => ({ x: fx * w, y: fy * h });
      const client = F(0.1, 0.56);
      const gateway = F(0.48, 0.44);
      const server = F(0.86, 0.3);
      const service = F(0.86, 0.68);

      nodes = [
        { p: client, label: 'CLIENT', color: '#22d3ee' },
        { p: gateway, label: 'GATEWAY', color: '#8b5cf6' },
        { p: server, label: 'SERVER', color: '#34d399' },
        { p: service, label: 'SERVICE', color: '#fb7185' },
      ];

      const curve = (a: Pt, d: Pt, bend: number): Cubic => ({
        a,
        b: { x: a.x + (d.x - a.x) * 0.35, y: a.y + bend },
        c: { x: a.x + (d.x - a.x) * 0.65, y: d.y - bend },
        d,
      });

      mains = [
        [curve(client, gateway, -h * 0.08)],
        [curve(gateway, server, -h * 0.06)],
        [curve(gateway, service, h * 0.06)],
      ];
      branches = [
        [curve(F(0.1, 0.8), F(0.48, 0.62), h * 0.05)],
        [curve(F(0.48, 0.3), F(0.86, 0.5), -h * 0.04)],
      ];

      const count = w >= 1024 ? 100 : 40;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.12,
        r: 0.6 + Math.random() * 1.6,
        a: 0.12 + Math.random() * 0.3,
      }));
    }

    function drawStatic(now: number) {
      ctx.clearRect(0, 0, w, h);

      // Media layer (Ken Burns drift).
      if (media.mode !== 'none') {
        const src = media.mode === 'video' ? media.video : media.img;
        const vw = media.mode === 'video' ? (src as HTMLVideoElement).videoWidth : (src as HTMLImageElement).naturalWidth;
        const vh = media.mode === 'video' ? (src as HTMLVideoElement).videoHeight : (src as HTMLImageElement).naturalHeight;
        if (vw && vh && src) {
          const zoom = reduced ? 1.15 : 1.15 + 0.05 * Math.sin(now * 0.00006);
          const scale = Math.max(w / vw, h / vh) * zoom;
          const dw = vw * scale;
          const dh = vh * scale;
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.drawImage(src as CanvasImageSource, (w - dw) / 2, (h - dh) / 2, dw, dh);
          ctx.restore();
          ctx.fillStyle = 'rgba(5, 8, 22, 0.62)';
          ctx.fillRect(0, 0, w, h);
        }
      }

      ctx.save();
      ctx.translate(px, py);

      // Nerve paths.
      ctx.lineWidth = 1.5;
      for (const route of mains) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
        ctx.beginPath();
        route.forEach((c, i) => {
          if (i === 0) ctx.moveTo(c.a.x, c.a.y);
          ctx.bezierCurveTo(c.b.x, c.b.y, c.c.x, c.c.y, c.d.x, c.d.y);
        });
        ctx.stroke();
      }
      for (const route of branches) {
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.07)';
        ctx.beginPath();
        route.forEach((c, i) => {
          if (i === 0) ctx.moveTo(c.a.x, c.a.y);
          ctx.bezierCurveTo(c.b.x, c.b.y, c.c.x, c.c.y, c.d.x, c.d.y);
        });
        ctx.stroke();
      }

      // Particles.
      for (const p of particles) {
        ctx.fillStyle = `rgba(148, 197, 255, ${p.a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pulses with trails.
      for (const pu of pulses) {
        for (let k = 0; k < 10; k++) {
          const tt = pu.t - k * 0.012;
          if (tt < 0) break;
          const pos = routePoint(pu.route, tt);
          const fade = (1 - k / 10) * pu.alpha;
          ctx.fillStyle = pu.color + Math.round(fade * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pu.width * (1 - k / 16), 0, Math.PI * 2);
          ctx.fill();
        }
        const head = routePoint(pu.route, pu.t);
        const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, pu.width * 4);
        glow.addColorStop(0, pu.color);
        glow.addColorStop(1, 'transparent');
        ctx.globalAlpha = pu.alpha * 0.8;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(head.x, head.y, pu.width * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Nodes.
      ctx.font = '10px "JetBrains Mono", monospace';
      for (const n of nodes) {
        const glow = ctx.createRadialGradient(n.p.x, n.p.y, 0, n.p.x, n.p.y, 26);
        glow.addColorStop(0, n.color + '55');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.p.x, n.p.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.p.x, n.p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = n.color + '88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.p.x, n.p.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(232, 236, 248, 0.42)';
        ctx.fillText(n.label, n.p.x + 15, n.p.y + 4);
      }

      ctx.restore();
    }

    function spawnPulse(route: Cubic[], color: string, durMs: number, alpha: number, onDone?: () => void) {
      pulses.push({ route, t: 0, speed: 1 / durMs, color, alpha, width: 3.2, onDone });
    }

    // The client->gateway->server round trip used for real traffic.
    function trafficRoute(): Cubic[] {
      return [...mains[0], ...mains[1]];
    }
    function returnRoute(): Cubic[] {
      return [...mains[1], ...mains[0]].reverse().map((c) => ({ a: c.d, b: c.c, c: c.b, d: c.a }));
    }

    const onRequest = (e: Event) => {
      if (reduced) return;
      const { status, latency } = (e as CustomEvent<ApiRequestDetail>).detail;
      const color = statusColor(status);
      const dur = Math.min(2200, Math.max(380, 350 + latency * 1.6));
      spawnPulse(trafficRoute(), color, dur, 0.95, () => {
        spawnPulse(returnRoute(), color, dur * 0.7, 0.45);
      });
    };
    window.addEventListener('api:request', onRequest);

    let lastAmbient = 0;
    let last = performance.now();

    function frame(now: number) {
      if (!running) return;
      const dt = Math.min(50, now - last);
      last = now;

      // Parallax easing.
      px += (tpx - px) * 0.04;
      py += (tpy - py) * 0.04;

      // Drift particles.
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      }

      // Faint ambient heartbeat along a random nerve.
      if (now - lastAmbient > 2800) {
        lastAmbient = now;
        const route = mains[Math.floor(Math.random() * mains.length)];
        spawnPulse(route, '#22d3ee', 2600, 0.28);
      }

      // Advance pulses.
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i];
        pu.t += pu.speed * dt;
        if (pu.t >= 1) {
          pulses.splice(i, 1);
          pu.onDone?.();
        }
      }

      drawStatic(now);
      raf = requestAnimationFrame(frame);
    }

    const onMouse = (e: MouseEvent) => {
      tpx = (e.clientX / w - 0.5) * 18;
      tpy = (e.clientY / h - 0.5) * 14;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tpx = Math.max(-14, Math.min(14, (e.gamma / 45) * 14));
      tpy = Math.max(-10, Math.min(10, ((e.beta - 45) / 45) * 10));
    };
    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    layout();
    window.addEventListener('resize', layout);
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('deviceorientation', onOrient);
    document.addEventListener('visibilitychange', onVis);

    if (reduced) {
      drawStatic(0); // one static frame
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('api:request', onRequest);
      window.removeEventListener('resize', layout);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('deviceorientation', onOrient);
      document.removeEventListener('visibilitychange', onVis);
      video.pause();
      video.removeAttribute('src');
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
