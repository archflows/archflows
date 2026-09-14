"use client";

import { useEffect, useRef, useState } from "react";

const MERIDIAN_STEP = 30;
const PARALLEL_STEP = 30;

/** Orbits: radius factor, inclination (rad), speed (rad/s), phase, label glyph */
const ORBITS = [
  { r: 0.4, tilt: 0.28, speed: 0.22, phase: 0 },
  { r: 0.52, tilt: -0.5, speed: 0.15, phase: 2.1 },
  { r: 0.64, tilt: 0.62, speed: 0.1, phase: 4.3 },
];

type Vec = { x: number; y: number; z: number };

/** Orthographic projection of a lon/lat point on a rotated globe. */
function project(lonDeg: number, latDeg: number, rotDeg: number, tiltRad: number): Vec {
  const lon = ((lonDeg - rotDeg) * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const cosTilt = Math.cos(tiltRad);
  const sinTilt = Math.sin(tiltRad);
  return {
    x: cosLat * Math.sin(lon),
    y: cosTilt * sinLat - sinTilt * cosLat * Math.cos(lon),
    z: sinTilt * sinLat + cosTilt * cosLat * Math.cos(lon),
  };
}

function strokePolyline(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

/** Padlock mark used for every orbiting position. */
function drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dim: boolean) {
  const beam = dim ? "rgba(69,168,255,0.45)" : "#45a8ff";
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "#05060d";
  ctx.strokeStyle = dim ? "rgba(69,168,255,0.4)" : "rgba(69,168,255,0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(-s, -s, s * 2, s * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = beam;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -s * 0.18, s * 0.34, Math.PI, 0);
  ctx.stroke();

  ctx.fillStyle = beam;
  ctx.fillRect(-s * 0.46, -s * 0.16, s * 0.92, s * 0.72);
  ctx.restore();
}

function StaticOrbit() {
  return (
    <div className="orbit-stage" aria-hidden>
      <div className="orbit-glow" />
      <svg viewBox="0 0 220 220" className="orbit-canvas">
        <ellipse
          cx="110"
          cy="110"
          rx="96"
          ry="34"
          fill="none"
          stroke="rgba(69,168,255,0.45)"
          strokeDasharray="3 5"
          transform="rotate(-16 110 110)"
        />
        <circle cx="110" cy="110" r="54" fill="rgba(8,11,22,0.9)" stroke="rgba(150,172,255,0.5)" />
        <ellipse cx="110" cy="110" rx="54" ry="18" fill="none" stroke="rgba(150,172,255,0.28)" />
        <ellipse cx="110" cy="110" rx="18" ry="54" fill="none" stroke="rgba(150,172,255,0.28)" />
        <rect x="178" y="82" width="14" height="14" fill="#05060d" stroke="#45a8ff" />
        <rect x="32" y="132" width="12" height="12" fill="#05060d" stroke="#45a8ff" />
      </svg>
    </div>
  );
}

export function HeroOrbit() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const sync = () => setReduced(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let visible = true;
    let rot = -25;
    let t = 0;
    let last = performance.now();
    let frame = 0;

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(canvas);

    const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.25 : 1.75);
      const size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      if (isMobile()) {
        frame += 1;
        if (frame % 2 === 1) return;
      }

      const dt = Math.min(48, now - last) / 1000;
      last = now;
      rot = (rot + dt * 7) % 360;
      t += dt;

      const size = canvas.clientWidth;
      const cx = size / 2;
      const cy = size / 2;
      const R = size * 0.25;
      const tilt = -0.36;

      ctx.clearRect(0, 0, size, size);

      // ── orbit paths ─────────────────────────────────────────────
      for (const orbit of ORBITS) {
        const radius = size * orbit.r;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(orbit.tilt);
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = "rgba(150,172,255,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // ── planet ring, back half ──────────────────────────────────
      const ringR = size * 0.34;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.28);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(69,168,255,0.28)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * 0.3, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── planet body ─────────────────────────────────────────────
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, "rgba(26,33,60,0.95)");
      body.addColorStop(0.62, "rgba(10,13,26,0.96)");
      body.addColorStop(1, "rgba(4,5,11,0.98)");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      const toScreen = (v: Vec) => ({ x: cx + R * v.x, y: cy - R * v.y });

      // wireframe: meridians then parallels, front bright / back dim
      for (const pass of [0, 1]) {
        // dimmer, less saturated wireframe so the azure locks stay the focal point
        ctx.strokeStyle = pass === 0 ? "rgba(190,204,235,0.09)" : "rgba(190,204,235,0.36)";
        ctx.lineWidth = pass === 0 ? 0.6 : 0.8;

        for (let lon = 0; lon < 360; lon += MERIDIAN_STEP) {
          const pts: Array<{ x: number; y: number }> = [];
          for (let lat = -90; lat <= 90; lat += 6) {
            const v = project(lon, lat, rot, tilt);
            if (pass === 0 ? v.z <= 0 : v.z > 0) pts.push(toScreen(v));
            else if (pts.length) {
              strokePolyline(ctx, pts);
              pts.length = 0;
            }
          }
          strokePolyline(ctx, pts);
        }

        for (let lat = -60; lat <= 60; lat += PARALLEL_STEP) {
          const pts: Array<{ x: number; y: number }> = [];
          for (let lon = 0; lon <= 360; lon += 6) {
            const v = project(lon, lat, rot, tilt);
            if (pass === 0 ? v.z <= 0 : v.z > 0) pts.push(toScreen(v));
            else if (pts.length) {
              strokePolyline(ctx, pts);
              pts.length = 0;
            }
          }
          strokePolyline(ctx, pts);
        }
      }

      // limb + atmosphere
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200,214,245,0.5)";
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(69,168,255,0.2)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // ── planet ring, front half ─────────────────────────────────
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.28);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(69,168,255,0.8)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * 0.3, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);

      // ── orbiting locks ──────────────────────────────────────────
      for (const orbit of ORBITS) {
        const radius = size * orbit.r;
        const a = t * orbit.speed + orbit.phase;
        const ox = Math.cos(a) * radius;
        const oy = Math.sin(a) * radius * 0.34;
        const behind = Math.sin(a) < 0;
        const x = cx + ox * Math.cos(orbit.tilt) - oy * Math.sin(orbit.tilt);
        const y = cy + ox * Math.sin(orbit.tilt) + oy * Math.cos(orbit.tilt);

        // tether back to the planet — the lock is bound to the chain
        ctx.beginPath();
        ctx.setLineDash([1.5, 4]);
        ctx.strokeStyle = behind ? "rgba(69,168,255,0.12)" : "rgba(69,168,255,0.32)";
        ctx.lineWidth = 1;
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);

        drawLock(ctx, x, y, size * 0.021, behind);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  if (reduced) return <StaticOrbit />;

  return (
    <div className="orbit-stage" aria-hidden>
      <div className="orbit-glow" />
      <div className="orbit-ring orbit-ring-a" />
      <div className="orbit-ring orbit-ring-b" />
      <canvas ref={canvasRef} className="orbit-canvas" />
    </div>
  );
}
