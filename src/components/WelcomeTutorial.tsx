import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  ChevronLeft,
  ChevronRight,
  Compass,
  Globe,
  Hand,
  HelpCircle,
  Keyboard,
  Rocket,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

const TUTORIAL_SEEN_KEY = 'travix-tutorial-seen';
const TUTORIAL_VOICE_KEY = 'travix-tutorial-voice';

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Con voz por defecto; se recuerda la elección de cada navegador. */
function loadVoicePref(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_VOICE_KEY) !== '0';
  } catch {
    return true;
  }
}

function saveVoicePref(on: boolean): void {
  try {
    window.localStorage.setItem(TUTORIAL_VOICE_KEY, on ? '1' : '0');
  } catch {
    // sin almacenamiento: solo vale para esta visita
  }
}

/** Lee el texto con una voz en español del dispositivo (Web Speech; sin archivos ni internet). */
function speak(text: string): void {
  if (!canSpeak) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const es =
    voices.find((v) => /^es[-_](419|CO|MX|US)/i.test(v.lang)) ?? voices.find((v) => /^es\b|^es[-_]/i.test(v.lang));
  if (es) u.voice = es;
  u.lang = es?.lang ?? 'es-ES';
  u.rate = 1;
  synth.speak(u);
}

function stopSpeaking(): void {
  if (canSpeak) window.speechSynthesis.cancel();
}

/** First visit only (per browser); afterwards it reopens from the "?" button. */
export function shouldShowTutorial(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

function markTutorialSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch {
    // storage unavailable: it will simply show again next visit
  }
}

interface TutorialStep {
  /** Value of the `data-tour` attribute of the control this step talks about */
  target?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  /** Extra line shown only on touch screens / only with mouse and keyboard */
  touchTip?: string;
  mouseTip?: string;
}

const STEPS: TutorialStep[] = [
  {
    icon: Sparkles,
    title: '¡Hola, explorador!',
    text: 'Travix 3D es un mapa del espacio. Aquí verás los robots y naves que la NASA dejó en la Luna, Marte y más lejos. Te enseñamos a usarlo en pocos pasos.',
  },
  {
    icon: Hand,
    title: 'Mira a tu alrededor',
    text: 'Gira la vista para mirar el Sistema Solar. Toca un planeta o su nombre para viajar hasta él.',
    touchTip: 'Arrastra con un dedo para girar y junta o separa dos dedos para acercarte.',
    mouseTip: 'Arrastra con el ratón para girar y usa la rueda para acercarte.',
  },
  {
    target: 'search',
    icon: Search,
    title: 'Busca una misión',
    text: 'Con la lupa encuentras rovers, misiones Apolo, satélites, planetas y la Vía Láctea. Escribe un nombre o una pregunta y toca un resultado para ir allí.',
  },
  {
    icon: BookOpen,
    title: 'Lee su historia',
    text: 'Al llegar a una misión se abre su ficha: qué hizo y por qué se quedó allí. En un planeta, el botón del libro muestra sus datos. La X cierra la ficha y sigues viendo en 3D.',
  },
  {
    target: 'tours',
    icon: Compass,
    title: 'Viajes guiados',
    text: 'Toca la brújula y elige un recorrido. Travix te lleva de un lugar a otro y te cuenta lo que ves.',
  },
  {
    target: 'ship',
    icon: Rocket,
    title: 'Modo nave',
    text: 'Enciende el cohete para viajar en una nave. ¡Cada viaje lejano será un salto por el hiperespacio!',
  },
  {
    target: 'sound',
    icon: Volume2,
    title: 'Música y sonidos',
    text: 'Este botón enciende o apaga la música del espacio y los efectos. Empieza apagado.',
  },
  {
    target: 'install',
    icon: Download,
    title: 'Llévala contigo',
    text: 'Desde este botón puedes instalar Travix 3D como una app en tu celular o computador y usarla sin internet.',
  },
  {
    target: 'overview',
    icon: Globe,
    title: 'Volver al inicio',
    text: 'Si te pierdes, toca «Sistema» y regresas a la vista de todo el Sistema Solar.',
    mouseTip: 'También puedes pulsar la tecla Esc.',
  },
  {
    target: 'pause',
    icon: Keyboard,
    title: 'Pausa y atajos',
    text: 'Este botón detiene o sigue el movimiento de los planetas.',
    touchTip: 'La flecha de abajo esconde los controles para ver mejor.',
    mouseTip: 'Atajos: Espacio pausa, H esconde los controles y, con la cámara libre, W A S D o las flechas te mueven.',
  },
  {
    target: 'tutorial',
    icon: HelpCircle,
    title: '¡Listo para explorar!',
    text: 'Si quieres ver este tutorial otra vez, toca el botón con el signo de pregunta.',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const SPOT_PAD = 6;
const CARD_GAP = 14;
const EDGE = 12;

function findTarget(name: string | undefined): HTMLElement | null {
  if (!name) return null;
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    // Only a control actually on screen (not hidden, collapsed or off the viewport)
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) return el;
  }
  return null;
}

interface WelcomeTutorialProps {
  onClose: () => void;
}

/**
 * Welcome tutorial: short steps that spotlight the real controls of Travix 3D. Modal while open
 * (focus trapped, keys kept from the 3D view), fully unmounted when closed.
 */
export const WelcomeTutorial: React.FC<WelcomeTutorialProps> = ({ onClose }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [isTouch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const [voiceOn, setVoiceOn] = useState(() => canSpeak && loadVoicePref());
  const dialogRef = useRef<HTMLElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  const close = useCallback(() => {
    stopSpeaking();
    markTutorialSeen();
    onClose();
  }, [onClose]);

  const chooseVoice = useCallback((on: boolean) => {
    setVoiceOn(on);
    saveVoicePref(on);
  }, []);

  const goNext = useCallback(() => {
    if (index >= STEPS.length - 1) close();
    else setIndex(index + 1);
  }, [index, close]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Focus inside the tutorial on open; give it back to where it was on close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    nextRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);

  // Keys: Esc closes, arrows change step, Tab stays inside. Captured on window before the 3D
  // view and the app shortcuts (Space / H / Esc / WASD) see them, so nothing moves behind.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Tab') {
        const root = dialogRef.current;
        if (!root) return;
        const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (!root.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => e.stopImmediatePropagation();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [close, goNext, goPrev]);

  // Keep the spotlight on the control while it moves (dock sliding in, resize, rotation)
  useEffect(() => {
    let raf = 0;
    let last: string | null = null; // forces the first measure of every step, even "no control"
    const tick = () => {
      const el = findTarget(step.target);
      const r = el?.getBoundingClientRect();
      const next = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      const key = next ? `${Math.round(next.top)}:${Math.round(next.left)}:${Math.round(next.width)}:${Math.round(next.height)}` : '';
      if (key !== last) {
        last = key;
        setRect(next);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCardHeight(el.offsetHeight));
    ro.observe(el);
    setCardHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Card placement: next to the highlighted control (above it in the lower half, below it in the
  // upper half), clamped to the screen; centered when the step has no control.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(380, vw - EDGE * 2);
  let cardStyle: React.CSSProperties;
  if (rect) {
    const centerX = rect.left + rect.width / 2;
    const left = Math.min(Math.max(centerX - cardWidth / 2, EDGE), vw - cardWidth - EDGE);
    const inLowerHalf = rect.top + rect.height / 2 > vh / 2;
    let top = inLowerHalf
      ? rect.top - SPOT_PAD - CARD_GAP - cardHeight
      : rect.top + rect.height + SPOT_PAD + CARD_GAP;
    top = Math.min(Math.max(top, EDGE), Math.max(EDGE, vh - cardHeight - EDGE));
    cardStyle = { top, left, width: cardWidth };
  } else {
    cardStyle = {
      top: Math.max(EDGE, (vh - cardHeight) / 2),
      left: (vw - cardWidth) / 2,
      width: cardWidth,
    };
  }

  const tip = isTouch ? step.touchTip : step.mouseTip;
  const Icon = step.icon;
  const spoken = `${step.title}. ${step.text}${tip ? ` ${tip}` : ''}`;

  // Narración de cada paso (se corta al cambiar de paso, al quitar la voz o al cerrar)
  useEffect(() => {
    if (!voiceOn) {
      stopSpeaking();
      return;
    }
    // Las voces del sistema pueden cargar tarde: se reintenta una vez cuando llegan
    speak(spoken);
    const synth = canSpeak ? window.speechSynthesis : null;
    const onVoices = () => speak(spoken);
    if (synth && synth.getVoices().length === 0) synth.addEventListener('voiceschanged', onVoices, { once: true });
    return () => synth?.removeEventListener('voiceschanged', onVoices);
  }, [spoken, voiceOn]);

  useEffect(() => stopSpeaking, []);

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      {/* Dim layer: a spotlight hole around the control of this step, or a full veil */}
      {rect ? (
        <div
          aria-hidden="true"
          className="tutorial-spot fixed rounded-2xl pointer-events-none"
          style={{
            top: rect.top - SPOT_PAD,
            left: rect.left - SPOT_PAD,
            width: rect.width + SPOT_PAD * 2,
            height: rect.height + SPOT_PAD * 2,
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgba(2,4,10,0.62)]" />
      )}

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="tutorial-card fixed max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl travix-glass-panel p-4 sm:p-5 text-left"
        style={cardStyle}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15 border border-amber-400/40 shrink-0"
          >
            <Icon className="w-5 h-5 text-amber-300" />
          </span>
          <div className={`min-w-0 flex-1 ${isFirst || !canSpeak ? "pr-7" : "pr-16"}`} aria-live="polite">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/90">
              Tutorial · Paso {index + 1} de {STEPS.length}
            </p>
            <h2 id={titleId} className="mt-0.5 font-display text-lg font-semibold text-white leading-tight">
              {step.title}
            </h2>
            <div id={bodyId}>
              <p className="mt-1.5 text-sm text-slate-100 leading-relaxed">{step.text}</p>
              {tip && <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{tip}</p>}
            </div>
          </div>
        </div>

        {/* Al principio: ¿con voz o sin voz? (con voz por defecto) */}
        {isFirst && canSpeak && (
          <div className="mt-3" role="group" aria-label="¿Quieres el tutorial con voz?">
            <p className="text-xs text-slate-300 mb-1.5">¿Cómo quieres el tutorial?</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { on: true, label: 'Con voz', icon: Volume2 },
                { on: false, label: 'Sin voz', icon: VolumeX },
              ].map(({ on, label, icon: VIcon }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={voiceOn === on}
                  onClick={() => chooseVoice(on)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    voiceOn === on
                      ? 'bg-cyan-500/20 border border-cyan-300/60 text-white'
                      : 'travix-glass-control text-slate-300 hover:text-white'
                  }`}
                >
                  <VIcon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-amber-400' : i < index ? 'w-1.5 bg-amber-200/60' : 'w-1.5 bg-white/25'
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={close}
            className="mr-auto px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Saltar tutorial
          </button>
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            aria-label="Paso anterior"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg travix-glass-control text-sm text-slate-100 hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden min-[400px]:inline">Anterior</span>
          </button>
          <button
            ref={nextRef}
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-sm font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <span>{isLast ? '¡A explorar!' : 'Siguiente'}</span>
            {!isLast && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>

        {!isFirst && canSpeak && (
          <button
            type="button"
            onClick={() => chooseVoice(!voiceOn)}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? 'Quitar la voz del tutorial' : 'Poner la voz del tutorial'}
            title={voiceOn ? 'Quitar la voz' : 'Poner la voz'}
            className="absolute top-2 right-10 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-300 hover:text-white hover:bg-white/12 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {voiceOn ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
          </button>
        )}

        <button
          type="button"
          onClick={close}
          aria-label="Cerrar tutorial"
          className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-300 hover:text-white hover:bg-white/12 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
};
