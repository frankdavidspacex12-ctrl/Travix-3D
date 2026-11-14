import React, { useEffect, useRef } from 'react';
import { MapPin, Rocket, X } from 'lucide-react';

export const TEAM_NAME = 'Artemis Colombia';
const EVENT_NAME = 'NASA Space Apps Challenge 2026';
const VENUE = 'Sede presencial San Vicente';
const TEAM_MEMBERS = [
  'Juan José Quintero Giraldo',
  'Luis Fernando Alzate',
  'Frank David Sierra Guerra',
  'Luz Angela Parra',
  'Ivan Molina',
];

const WELCOME_SEEN_KEY = 'travix-welcome-seen';

/** First visit only (per browser); afterwards it reopens from the Travix logo. */
export function shouldShowWelcome(): boolean {
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

function markWelcomeSeen(): void {
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    // storage unavailable: it will simply show again next visit
  }
}

function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return (parts[0][0] + (parts[parts.length > 2 ? 2 : 1]?.[0] ?? '')).toUpperCase();
}

interface WelcomeCreditsProps {
  onClose: () => void;
}

/** Welcome screen with the Artemis Colombia team that created Travix 3D. */
export const WelcomeCredits: React.FC<WelcomeCreditsProps> = ({ onClose }) => {
  const startRef = useRef<HTMLButtonElement | null>(null);

  const close = () => {
    markWelcomeSeen();
    onClose();
  };

  useEffect(() => {
    startRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        markWelcomeSeen();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/60"
      onClick={close}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(440px,100%)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl travix-glass-panel px-5 pt-6 pb-5 sm:px-7 sm:pt-7 text-center"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar bienvenida"
          className="absolute top-2.5 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-300 hover:text-white hover:bg-white/12 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <X className="w-4 h-4" />
        </button>

        <img
          src="/team/artemis-colombia.jpg"
          alt={`Insignia del equipo ${TEAM_NAME}`}
          width={150}
          height={150}
          className="mx-auto w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover shadow-[0_0_40px_rgba(56,189,248,0.25)] ring-1 ring-white/15"
          draggable={false}
        />

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
          Bienvenido a Travix 3D
        </p>
        <h2 id="welcome-title" className="mt-1 font-display text-xl sm:text-2xl font-semibold text-white tracking-tight">
          Creado por el equipo {TEAM_NAME}
        </h2>

        <div className="mt-3 flex flex-col items-center gap-1 text-xs text-slate-200">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-100 font-medium">
            <Rocket className="w-3.5 h-3.5 text-amber-300" />
            {EVENT_NAME}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {VENUE}
          </span>
        </div>

        <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Integrantes
        </h3>
        <ul className="mt-2 grid gap-1.5 text-left">
          {TEAM_MEMBERS.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg travix-glass-subcard"
            >
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-cyan-400/15 border border-cyan-300/30 text-[10px] font-bold text-cyan-100 shrink-0"
              >
                {initials(name)}
              </span>
              <span className="text-sm text-white break-words">{name}</span>
            </li>
          ))}
        </ul>

        <button
          ref={startRef}
          type="button"
          onClick={close}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-sm font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          Comenzar a explorar
        </button>
        <p className="mt-2 text-[10px] text-slate-400">
          Vuelve a ver esta presentación tocando el logo de Travix.
        </p>
      </section>
    </div>
  );
};
