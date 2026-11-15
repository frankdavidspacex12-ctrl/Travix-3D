import React, { useEffect, useRef, useState } from 'react';
import { WarpScene, WarpTarget } from '../three/warpScene';
import { tr } from '../i18n';

export interface WarpRequest {
  id: number;
  /** Destination name shown during the jump */
  label: string;
  /** Starts the real trip in the 3D engine (called mid-jump, hidden behind the tunnel) */
  go: () => void;
  /** Destination kept in view ahead, growing as the ship arrives */
  target?: WarpTarget;
}

interface WarpOverlayProps {
  request: WarpRequest | null;
  onDone: (id: number) => void;
  /**
   * True while the jump fully covers the screen: the 3D view underneath can skip drawing
   * (nobody can see it), leaving the whole GPU to the jump. Called with false before it shows.
   */
  onCoverChange?: (covered: boolean) => void;
}

// Timeline (seconds)
const T_GO = 0.5;
const T_ENGAGED = 0.75;
const T_EXIT = 2.5;
const T_FLASH = 2.72;
const T_END = 3.2;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * "Modo nave" hyperspace jump: covers the screen for ~3 s while the engine travels underneath,
 * then drops out of the wormhole with a flash onto the destination. Tap to skip.
 */
const WarpOverlay: React.FC<WarpOverlayProps> = ({ request, onDone, onCoverChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<WarpScene | null>(null);
  const failedRef = useRef(false);
  const skipRef = useRef<() => void>(() => {});
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const coverRef = useRef(onCoverChange);
  coverRef.current = onCoverChange;

  /** One renderer for the whole session in ship mode (created lazily, then reused). */
  const ensureScene = (): WarpScene | null => {
    if (sceneRef.current || failedRef.current) return sceneRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    try {
      const lowPower = window.matchMedia('(max-width: 639.98px)').matches;
      const scene = new WarpScene(canvas, lowPower);
      scene.setSize(window.innerWidth, window.innerHeight);
      scene.warmUp();
      sceneRef.current = scene;
    } catch {
      failedRef.current = true;
    }
    return sceneRef.current;
  };

  // Built and warmed up in idle time after ship mode is turned on (not in the same frame as the
  // toggle), so the first jump starts instantly without stalling the toggle itself
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId = 0;
    let timerId = 0;
    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(() => ensureScene(), { timeout: 2500 });
    } else {
      timerId = window.setTimeout(() => ensureScene(), 1200);
    }
    const onResize = () => sceneRef.current?.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => {
      if (idleId && typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
      window.removeEventListener('resize', onResize);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!request) return;
    const scene = ensureScene();
    const root = rootRef.current;
    if (!scene || !root || failedRef.current) {
      request.go();
      onDone(request.id);
      return;
    }

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let went = false;
    let finished = false;
    let covered = false;
    const setCovered = (c: boolean) => {
      if (c === covered) return;
      covered = c;
      coverRef.current?.(c);
    };
    const go = () => {
      if (went) return;
      went = true;
      request.go();
    };
    skipRef.current = () => {
      go();
      t = Math.max(t, T_EXIT - 0.05);
    };

    setActiveLabel(request.label);
    scene.setTarget(request.target ?? null);
    scene.setSize(window.innerWidth, window.innerHeight);
    root.style.display = 'block';

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      if (t >= T_GO) go();

      const speed =
        t < T_ENGAGED
          ? Math.pow(clamp01(t / T_ENGAGED), 2)
          : t < T_EXIT
            ? 1
            : 1 - clamp01((t - T_EXIT) / 0.45);
      const shipIn = clamp01((t - 0.05) / 0.85);
      const shipOut = clamp01((t - (T_EXIT - 0.1)) / 0.45);
      // Destination grows from a dot to a large disc right before dropping out of the jump
      const approach = clamp01((t - 0.15) / (T_FLASH - 0.15));
      scene.render(dt, speed, shipIn, shipOut, 1 - Math.pow(1 - approach, 1.6));

      const fadeIn = clamp01(t / 0.28);
      const fadeOut = 1 - clamp01((t - (T_FLASH + 0.05)) / (T_END - T_FLASH - 0.05));
      root.style.opacity = String(Math.min(fadeIn, fadeOut));
      // Fully opaque from the end of the fade-in until the exit begins; the 3D view resumes a
      // little before the overlay starts fading, so the destination is already drawn
      setCovered(fadeIn >= 1 && t < T_EXIT);
      if (flashRef.current) {
        const f = Math.exp(-Math.pow((t - T_FLASH) / 0.1, 2));
        flashRef.current.style.opacity = String(f * 0.9);
      }

      if (t >= T_END) {
        finished = true;
        setCovered(false);
        root.style.display = 'none';
        setActiveLabel(null);
        onDone(request.id);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      setCovered(false);
      if (!finished) {
        // Interrupted (new jump or ship mode turned off): still take the user there
        go();
        root.style.display = 'none';
        setActiveLabel(null);
      }
      skipRef.current = () => {};
    };
    // onDone is stable (useCallback in App); a new request id restarts the sequence
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  return (
    <div
      ref={rootRef}
      role="presentation"
      onClick={() => skipRef.current()}
      className="fixed inset-0 z-[60] cursor-pointer select-none"
      style={{ display: 'none', opacity: 0 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      <div
        ref={flashRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0,
          background:
            'radial-gradient(circle at 50% 45%, rgba(255,255,255,1) 0%, rgba(214,228,255,0.9) 35%, rgba(160,180,255,0.55) 70%, rgba(120,140,255,0.3) 100%)',
        }}
      />
      {activeLabel && (
        <div className="absolute top-5 inset-x-0 flex flex-col items-center gap-0.5 pointer-events-none px-4 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-200/90">
            {tr('Hipersalto', 'Hyperspace jump')}
          </span>
          <span className="font-display text-sm sm:text-base font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
            {tr('Rumbo a', 'Heading to')} {activeLabel}
          </span>
        </div>
      )}
      {/* D05: el hipersalto es una convención visual; las naves reales tardan meses o años */}
      <span className="absolute bottom-5 inset-x-0 px-4 text-center text-[10px] leading-snug text-slate-300/80 pointer-events-none">
        {tr('Transición visual: las naves reales no viajan así, tardan meses o años', 'Visual transition: real spacecraft do not travel like this, they take months or years')}
        <br />
        {tr('Toca para saltar', 'Tap to skip')}
      </span>
    </div>
  );
};

export default WarpOverlay;
