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

/** Créditos de datos, modelos, imágenes, sonido, código y uso de IA (ver también README.md). */
const CREDITS: Array<{ what: string; from: string }> = [
  {
    what: 'Datos de las misiones',
    from: 'NASA Space Science Data Coordinated Archive (NSSDCA) y páginas de misión de NASA Science (science.nasa.gov). Cada ficha enlaza su fuente.',
  },
  {
    what: 'Modelos 3D de las naves',
    from: 'NASA 3D Resources (github.com/nasa/NASA-3D-Resources), según las pautas de uso de medios de la NASA.',
  },
  { what: 'Fotos', from: 'NASA Image and Video Library (images.nasa.gov), con su identificador NASA en cada foto.' },
  {
    what: 'Mapas de planetas y lunas',
    from: 'Derivados de imágenes de NASA/JPL-Caltech/USGS (conjuntos de mapas de los ejemplos de three.js y Planet Pixel Emporium).',
  },
  {
    what: 'Posiciones y tiempo real',
    from: 'Elementos orbitales de JPL (J2000) y modelos de rotación de la IAU; órbita de la ISS con datos de CelesTrak.',
  },
  { what: 'Sonido', from: 'Sintetizado en tiempo real con Web Audio (sin archivos de audio). La voz del tutorial es la del dispositivo.' },
  {
    what: 'Código abierto',
    from: 'React, three.js, Vite, Tailwind CSS y vite-plugin-pwa (MIT), lucide-react (ISC), decodificador Draco de Google (Apache 2.0). Tipografías Outfit, Plus Jakarta Sans y JetBrains Mono (SIL OFL).',
  },
  {
    what: 'Uso de inteligencia artificial',
    from: 'Parte del código y de los textos se escribió con asistentes de IA (Claude) y fue revisada y dirigida por el equipo; los datos se verificaron con fuentes de la NASA.',
  },
];

function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return (parts[0][0] + (parts[parts.length > 2 ? 2 : 1]?.[0] ?? '')).toUpperCase();
}

interface WelcomeCreditsProps {
  onClose: () => void;
}

/**
 * Welcome screen with the Artemis Colombia team that created Travix 3D.
 * Two columns on wide screens so it fits without scrolling, over an animated starfield.
 */
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      onClick={close}
    >
      {/* Fondo animado: dos capas de estrellas que se desplazan y una nebulosa que respira */}
      <div aria-hidden="true" className="welcome-sky">
        <div className="welcome-nebula" />
        <div className="welcome-stars welcome-stars-far" />
        <div className="welcome-stars welcome-stars-near" />
      </div>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="welcome-card relative w-[min(880px,100%)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl travix-glass-panel px-5 pt-6 pb-5 sm:px-8 sm:py-7"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar bienvenida"
          className="absolute top-2.5 right-2.5 z-10 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-300 hover:text-white hover:bg-white/12 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid gap-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-8 md:items-center">
          {/* Columna 1: insignia, título y evento */}
          <div className="text-center">
            <img
              src="/team/artemis-colombia.jpg"
              alt={`Insignia del equipo ${TEAM_NAME}`}
              width={150}
              height={150}
              className="welcome-badge mx-auto w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full object-cover shadow-[0_0_40px_rgba(56,189,248,0.25)] ring-1 ring-white/15"
              draggable={false}
            />
            <p className="mt-3 md:mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
              Bienvenido a Travix 3D
            </p>
            <h2
              id="welcome-title"
              className="mt-1 font-display text-xl sm:text-2xl md:text-[1.7rem] font-semibold text-white tracking-tight leading-tight"
            >
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
          </div>

          {/* Columna 2: integrantes y botón para entrar */}
          <div>
            <h3 className="text-center md:text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Integrantes
            </h3>
            <ul className="mt-2 grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-1 gap-1.5 text-left">
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
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-sm font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Comenzar a explorar
            </button>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Vuelve a ver esta presentación tocando el logo de Travix.
            </p>
          </div>
        </div>

        {/* C2 / D08: aviso de no afiliación y créditos de todo lo que usa la app */}
        <p className="mt-4 text-center text-[10px] leading-snug text-slate-400">
          Proyecto educativo independiente. No está afiliado, respaldado ni patrocinado por la NASA.
        </p>
        <details className="mt-2 rounded-lg travix-glass-subcard px-3 py-2 text-[11px] leading-snug text-slate-200">
          <summary className="cursor-pointer select-none font-semibold text-slate-100 focus-visible:outline-2 focus-visible:outline-amber-400">
            Créditos y fuentes
          </summary>
          <ul className="mt-2 space-y-1.5 list-disc pl-4">
            {CREDITS.map((c) => (
              <li key={c.what}>
                <span className="font-semibold text-white">{c.what}:</span> {c.from}
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
};
