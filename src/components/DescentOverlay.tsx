import React, { useEffect, useRef } from 'react';
import type { AbandonedMission } from '../data/abandonedMissionsData';
import type { LandingInfo, LandingWorld } from '../data/landingMethods';
import { soundscape } from '../audio/soundscape';

/** Duración de la animación (s); se puede saltar en cualquier momento. */
const DURATION = 4.8;
const FADE_OUT = 0.5;

export interface DescentRequest {
  id: number;
  mission: AbandonedMission;
  landing: LandingInfo;
}

interface DescentOverlayProps {
  request: DescentRequest;
  onDone: (id: number) => void;
}

const SKY: Record<LandingWorld, [string, string]> = {
  mars: ['#2a1206', '#c9773f'],
  moon: ['#000000', '#05070d'],
  titan: ['#3b2108', '#d08a2e'],
  venus: ['#4a3208', '#e0b44c'],
  comet: ['#000000', '#05070d'],
  asteroid: ['#000000', '#05070d'],
};
const GROUND: Record<LandingWorld, string> = {
  mars: '#8a4a26',
  moon: '#7d7d7d',
  titan: '#6b4a22',
  venus: '#8c6a2c',
  comet: '#3a3a3c',
  asteroid: '#6e6352',
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** Progreso 0..1 de u dentro del tramo [a, b] */
const seg = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Animación de descenso al entrar en una misión de superficie: muestra cómo llegó de verdad
 * (grúa espacial, bolsas de aire, retrocohetes, paracaídas...) con un texto corto. Es una
 * ilustración esquemática, no a escala. Toque, clic, Esc, Enter o Espacio la saltan.
 */
export const DescentOverlay: React.FC<DescentOverlayProps> = ({ request, onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(false);
  const { mission, landing } = request;

  useEffect(() => {
    doneRef.current = false;
    // Sonido de cada fase (corta el del viaje de la nave); se apaga al saltar o al terminar
    soundscape.descent(landing.method, landing.world);
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone(request.id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish();
      }
    };
    window.addEventListener('keydown', onKey, true);
    // Respaldo por si el navegador frena la animación (pestaña en segundo plano)
    const safety = window.setTimeout(finish, (DURATION + 0.5) * 1000);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let raf = 0;
    const start = performance.now();
    // Estrellas fijas para los mundos sin aire
    const stars = Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.75, Math.random()]);

    const frame = () => {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = (performance.now() - start) / 1000;
      const u = clamp01(t / (DURATION - FADE_OUT));
      draw(ctx, W, H, t, u, landing, stars);
      // Fundido final hacia la escena de la misión
      const fade = seg(t, DURATION - FADE_OUT, DURATION);
      canvas.style.opacity = String(1 - fade);
      if (t >= DURATION) finish();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      soundscape.stopDescent();
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [request.id, landing, onDone]);

  return (
    <div
      className="fixed inset-0 z-[70] cursor-pointer select-none"
      onClick={() => {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone(request.id);
        }
      }}
      role="presentation"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-center pointer-events-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300/90">Así aterrizó</p>
        <h2 className="mt-1 font-display text-lg sm:text-xl font-semibold text-white">{mission.name}</h2>
        <div role="status" aria-live="polite" className="mx-auto mt-2 max-w-md rounded-xl travix-glass-panel px-3.5 py-2.5">
          <p className="text-sm font-semibold text-amber-300">{landing.title}</p>
          <p className="mt-1 text-[13px] leading-snug text-slate-100">{landing.text}</p>
        </div>
      </div>
      <p className="absolute inset-x-0 bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-slate-300/80 pointer-events-none">
        Ilustración esquemática · Toca para saltar
      </p>
    </div>
  );
};

// ------------------------------------------------------------------ dibujo

function draw(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  u: number,
  landing: LandingInfo,
  stars: number[][],
): void {
  const world = landing.world;
  const groundY = H * 0.84;
  const cx = W * 0.5;

  // Cielo
  const [skyTop, skyBottom] = SKY[world];
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, skyTop);
  sky.addColorStop(1, skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  if (world === 'moon' || world === 'comet' || world === 'asteroid') {
    for (const [sx, sy, b] of stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + b * 0.6})`;
      ctx.fillRect(sx * W, sy * H, 1.4, 1.4);
    }
  }
  if (world === 'titan' || world === 'venus') {
    // Neblina / nubes que pasan hacia arriba (sensación de caída)
    const rgb = world === 'titan' ? '230,150,60' : '250,220,120';
    for (let i = 0; i < 6; i++) {
      const y = H - ((i / 6 + t * 0.25) % 1) * H;
      // Banda difuminada (sin bordes duros)
      const g = ctx.createLinearGradient(0, y - 45, 0, y + 45);
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(0.5, `rgba(${rgb},0.14)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 45, W, 90);
    }
  }

  // Suelo (el horizonte sube un poco al acercarse)
  const gY = lerp(H * 1.05, groundY, ease(seg(u, 0.25, 0.75)));
  ctx.fillStyle = GROUND[world];
  ctx.beginPath();
  ctx.moveTo(0, gY);
  for (let x = 0; x < W + 24; x += 24) {
    const px = Math.min(x, W);
    ctx.lineTo(px, gY + Math.sin(px * 0.03) * 4 + Math.sin(px * 0.011) * 7);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  switch (landing.method) {
    case 'skycrane':
      return drawSkycrane(ctx, W, H, t, u, cx, gY);
    case 'airbags':
      return drawAirbags(ctx, W, H, t, u, cx, gY);
    case 'retro_mars':
      return drawRetroMars(ctx, W, H, t, u, cx, gY);
    case 'apollo':
      return drawLander(ctx, W, H, t, u, cx, gY, 'apollo');
    case 'retro_moon':
      return drawLander(ctx, W, H, t, u, cx, gY, 'surveyor');
    case 'titan':
      return drawParachuteOnly(ctx, W, H, t, u, cx, gY, false);
    case 'venus':
      return drawParachuteOnly(ctx, W, H, t, u, cx, gY, true);
    case 'comet':
      return drawComet(ctx, W, H, t, u, cx, gY);
    case 'asteroid':
      return drawAsteroid(ctx, W, H, t, u, cx, gY);
  }
}

/** Cápsula con escudo térmico; el plasma brilla durante la entrada atmosférica. */
function drawCapsule(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, plasma: number, t: number): void {
  if (plasma > 0) {
    const g = ctx.createRadialGradient(x, y + s * 0.7, 0, x, y + s * 0.7, s * 3.2);
    g.addColorStop(0, `rgba(255,240,200,${0.9 * plasma})`);
    g.addColorStop(0.35, `rgba(255,140,40,${0.6 * plasma})`);
    g.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y + s * 0.7, s * 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Estela de plasma hacia arriba
    for (let i = 0; i < 9; i++) {
      const ox = (i - 4) * s * 0.22 + Math.sin(t * 20 + i) * 2;
      ctx.strokeStyle = `rgba(255,${150 + i * 10},60,${0.35 * plasma})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + ox, y);
      ctx.lineTo(x + ox * 1.6, y - s * (3 + (i % 3)));
      ctx.stroke();
    }
  }
  // Cono trasero
  ctx.fillStyle = '#d7dde5';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.55, y + s * 0.45);
  ctx.lineTo(x + s * 0.55, y + s * 0.45);
  ctx.lineTo(x + s * 0.28, y - s * 0.35);
  ctx.lineTo(x - s * 0.28, y - s * 0.35);
  ctx.closePath();
  ctx.fill();
  // Escudo térmico
  ctx.fillStyle = plasma > 0.2 ? '#ff9a4a' : '#6b4a2e';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.5, s * 0.75, s * 0.22, 0, 0, Math.PI);
  ctx.fill();
}

function drawParachute(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, open: number): void {
  if (open <= 0) return;
  const r = s * 1.6 * open;
  const top = y - s * 3.2;
  ctx.strokeStyle = 'rgba(230,230,230,0.7)';
  ctx.lineWidth = 1;
  for (const k of [-1, -0.4, 0.4, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.3);
    ctx.lineTo(x + k * r, top);
    ctx.stroke();
  }
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.ellipse(x, top, r, r * 0.55, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#e4572e';
  ctx.beginPath();
  ctx.ellipse(x, top, r * 0.45, r * 0.3, 0, Math.PI, 0);
  ctx.fill();
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, w: number, t: number): void {
  const l = len * (0.8 + 0.2 * Math.sin(t * 40 + x));
  const g = ctx.createLinearGradient(x, y, x, y + l);
  g.addColorStop(0, 'rgba(255,255,230,0.95)');
  g.addColorStop(0.4, 'rgba(120,180,255,0.7)');
  g.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + l);
  ctx.closePath();
  ctx.fill();
}

function dust(ctx: CanvasRenderingContext2D, x: number, gY: number, amount: number, color: string): void {
  if (amount <= 0) return;
  const g = ctx.createRadialGradient(x, gY, 0, x, gY, 140 * amount);
  g.addColorStop(0, color.replace('ALPHA', String(0.55 * amount)));
  g.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, gY, 160 * amount, 50 * amount, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRover(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#e9edf2';
  ctx.fillRect(x - s * 0.7, y - s * 0.35, s * 1.4, s * 0.35);
  ctx.fillStyle = '#c7cdd6';
  ctx.fillRect(x + s * 0.35, y - s * 0.95, s * 0.1, s * 0.6); // mástil
  ctx.fillRect(x + s * 0.25, y - s * 1.05, s * 0.3, s * 0.12);
  ctx.fillStyle = '#2c2f36';
  for (const k of [-0.55, 0, 0.55]) {
    ctx.beginPath();
    ctx.arc(x + k * s, y + s * 0.05, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSkycrane(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, u: number, x: number, gY: number): void {
  const s = Math.min(W, H) * 0.06;
  if (u < 0.55) {
    // Entrada y paracaídas
    const y = lerp(H * 0.34, H * 0.56, ease(seg(u, 0, 0.55)));
    drawParachute(ctx, x, y, s, ease(seg(u, 0.28, 0.36)));
    drawCapsule(ctx, x, y, s, 1 - seg(u, 0.15, 0.3), t);
    return;
  }
  // Grúa: la etapa con cohetes baja el rover colgado de cables
  const stageY = lerp(H * 0.58, gY - s * 3.4, ease(seg(u, 0.55, 0.72)));
  const lower = ease(seg(u, 0.66, 0.84));
  const roverY = lerp(stageY + s * 0.9, gY - s * 0.2, lower);
  const cut = u > 0.86;
  const flyAway = ease(seg(u, 0.86, 1));
  const sx = x - flyAway * W * 0.5;
  const sy = stageY - flyAway * H * 0.4;
  if (!cut) {
    ctx.strokeStyle = 'rgba(220,220,220,0.8)';
    ctx.lineWidth = 1;
    for (const k of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(sx + k * s, sy + s * 0.25);
      ctx.lineTo(x + k * s * 0.8, roverY - s * 0.35);
      ctx.stroke();
    }
  }
  for (const k of [-0.9, -0.3, 0.3, 0.9]) flame(ctx, sx + k * s, sy + s * 0.25, s * 1.3, s * 0.12, t);
  ctx.fillStyle = '#b9c1cc';
  ctx.fillRect(sx - s, sy - s * 0.25, s * 2, s * 0.5);
  drawRover(ctx, x, roverY, s);
  dust(ctx, x, gY, seg(u, 0.72, 0.86) * (1 - seg(u, 0.9, 1)), 'rgba(200,120,70,ALPHA)');
}

function drawAirbags(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, u: number, x: number, gY: number): void {
  const s = Math.min(W, H) * 0.06;
  if (u < 0.5) {
    const y = lerp(H * 0.34, H * 0.56, ease(seg(u, 0, 0.5)));
    drawParachute(ctx, x, y, s, ease(seg(u, 0.26, 0.34)));
    drawCapsule(ctx, x, y, s, 1 - seg(u, 0.14, 0.28), t);
    return;
  }
  // Racimo de bolsas de aire que cae y rebota hasta detenerse
  const k = seg(u, 0.5, 1);
  const r = s * 1.1;
  const fall = ease(seg(k, 0, 0.18));
  let y = lerp(H * 0.58, gY - r, fall);
  if (k > 0.18) {
    const b = (k - 0.18) / 0.82;
    y = gY - r - Math.abs(Math.sin(b * Math.PI * 4)) * H * 0.22 * Math.pow(1 - b, 1.6);
  }
  const bx = x + (k > 0.18 ? (k - 0.18) * W * 0.18 : 0);
  ctx.fillStyle = '#e8d9b5';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + k * 6;
    ctx.beginPath();
    ctx.arc(bx + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,100,70,0.6)';
  ctx.beginPath();
  ctx.arc(bx, y, r * 1.05, 0, Math.PI * 2);
  ctx.stroke();
  dust(ctx, bx, gY, k > 0.18 ? 0.5 * (1 - k) : 0, 'rgba(200,120,70,ALPHA)');
}

function drawLegLander(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, gold: boolean): void {
  ctx.strokeStyle = '#c9ced6';
  ctx.lineWidth = 2;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + k * s * 0.5, y);
    ctx.lineTo(x + k * s * 1.05, y + s * 0.75);
    ctx.stroke();
    ctx.fillStyle = '#c9ced6';
    ctx.fillRect(x + k * s * 1.05 - s * 0.12, y + s * 0.72, s * 0.24, s * 0.06);
  }
  ctx.fillStyle = gold ? '#d8a73a' : '#d9dee5';
  ctx.fillRect(x - s * 0.6, y - s * 0.45, s * 1.2, s * 0.6);
}

function drawRetroMars(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, u: number, x: number, gY: number): void {
  const s = Math.min(W, H) * 0.06;
  if (u < 0.55) {
    const y = lerp(H * 0.34, H * 0.56, ease(seg(u, 0, 0.55)));
    drawParachute(ctx, x, y, s, ease(seg(u, 0.28, 0.36)));
    drawCapsule(ctx, x, y, s, 1 - seg(u, 0.15, 0.3), t);
    return;
  }
  const k = ease(seg(u, 0.55, 0.88));
  const y = lerp(H * 0.58, gY - s * 0.75, k);
  if (u < 0.88) for (const o of [-0.4, 0, 0.4]) flame(ctx, x + o * s, y + s * 0.15, s * 1.1, s * 0.1, t);
  drawLegLander(ctx, x, y, s, false);
  dust(ctx, x, gY, seg(u, 0.7, 0.88) * (1 - seg(u, 0.92, 1)), 'rgba(200,120,70,ALPHA)');
}

function drawLander(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  u: number,
  x: number,
  gY: number,
  kind: 'apollo' | 'surveyor',
): void {
  const s = Math.min(W, H) * 0.065;
  const k = ease(seg(u, 0, 0.86));
  const y = lerp(H * 0.34, gY - s * 0.75, k);
  // Sin aire: sin plasma ni paracaídas; el motor frena toda la caída
  if (u < 0.86) {
    if (kind === 'surveyor' && u < 0.55) flame(ctx, x, y + s * 0.15, s * 2.6, s * 0.3, t); // retrocohete principal
    else flame(ctx, x, y + s * 0.15, s * 1.2, s * 0.14, t);
  }
  drawLegLander(ctx, x, y, s, kind === 'apollo');
  if (kind === 'apollo') {
    ctx.fillStyle = '#c9ced6';
    ctx.fillRect(x - s * 0.4, y - s * 0.95, s * 0.8, s * 0.5); // etapa de ascenso
  }
  dust(ctx, x, gY, seg(u, 0.6, 0.86) * (1 - seg(u, 0.9, 1)), 'rgba(170,170,170,ALPHA)');
}

function drawParachuteOnly(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  u: number,
  x: number,
  gY: number,
  venus: boolean,
): void {
  const s = Math.min(W, H) * 0.055;
  const y = lerp(H * 0.34, gY - s * 0.6, ease(u));
  const sway = Math.sin(t * 1.4) * s * 0.3;
  if (venus) {
    // Paracaídas solo arriba; después cae con el disco de frenado
    drawParachute(ctx, x + sway, y, s, u < 0.45 ? ease(seg(u, 0.18, 0.26)) : 0);
    drawCapsule(ctx, x + sway, y, s * 0.8, 1 - seg(u, 0.08, 0.2), t);
    if (u >= 0.45) {
      ctx.fillStyle = '#cfd4da';
      ctx.beginPath();
      ctx.ellipse(x + sway, y + s * 0.1, s * 1.3, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    drawParachute(ctx, x + sway, y, s, ease(seg(u, 0.15, 0.25)));
    drawCapsule(ctx, x + sway, y, s * 0.8, 1 - seg(u, 0.05, 0.18), t);
  }
}

function drawComet(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, u: number, x: number, gY: number): void {
  const s = Math.min(W, H) * 0.045;
  // Cae despacio, rebota dos veces (los arpones no se dispararon) y se queda
  let y: number;
  if (u < 0.45) y = lerp(H * 0.34, gY - s, ease(seg(u, 0, 0.45)));
  else if (u < 0.75) y = gY - s - Math.sin(seg(u, 0.45, 0.75) * Math.PI) * H * 0.22;
  else if (u < 0.9) y = gY - s - Math.sin(seg(u, 0.75, 0.9) * Math.PI) * H * 0.06;
  else y = gY - s;
  const bx = x + seg(u, 0.45, 0.9) * W * 0.15;
  ctx.fillStyle = '#d9dee5';
  ctx.fillRect(bx - s * 0.6, y - s * 0.5, s * 1.2, s * 0.8);
  ctx.fillStyle = '#28356b';
  ctx.fillRect(bx - s * 0.55, y - s * 0.45, s * 1.1, s * 0.2);
  ctx.strokeStyle = '#c9ced6';
  ctx.lineWidth = 2;
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(bx + k * s * 0.4, y + s * 0.3);
    ctx.lineTo(bx + k * s * 0.8, y + s);
    ctx.stroke();
  }
  void t;
}

function drawAsteroid(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, u: number, x: number, gY: number): void {
  const s = Math.min(W, H) * 0.05;
  const y = lerp(H * 0.34, gY - s * 0.6, ease(seg(u, 0, 0.9)));
  // Pequeños empujes de los propulsores
  if (u < 0.9 && Math.sin(t * 6) > 0.3) flame(ctx, x, y + s * 0.4, s * 0.7, s * 0.08, t);
  ctx.fillStyle = '#d9b44a';
  ctx.fillRect(x - s * 0.5, y - s * 0.4, s, s * 0.8);
  ctx.fillStyle = '#1f2f6b';
  for (const k of [-1, 1]) ctx.fillRect(x + k * s * 0.5 + (k < 0 ? -s * 1.6 : 0), y - s * 0.15, s * 1.6, s * 0.3);
}

