import React, { useEffect, useRef } from 'react';
import { MapPin, Rocket, X } from 'lucide-react';
import { tr } from '../i18n';

export const TEAM_NAME = 'Steps Ahead';
const EVENT_NAME = 'NASA Space Apps Challenge 2026';
const VENUE_ES = 'Sede presencial San Vicente';
const TEAM_MEMBERS = [
  'Juan José Quintero Giraldo',
  'Luis Fernando Alzate',
  'Frank David Sierra Guerra',
  'Luz Angela Parra',
  'Ivan Molina',
];

/** Créditos de datos, modelos, imágenes, sonido, código y uso de IA (ver también README.md). */
const CREDITS: Array<{ what: string; from: string }> = [
  {
    get what() { return tr('Datos de las misiones', 'Mission data'); },
    get from() { return tr('NASA Space Science Data Coordinated Archive (NSSDCA) y páginas de misión de NASA Science (science.nasa.gov). Cada ficha enlaza su fuente.', 'NASA Space Science Data Coordinated Archive (NSSDCA) and NASA Science mission pages (science.nasa.gov). Every card links its source.'); },
  },
  {
    get what() { return tr('Modelos 3D de las naves', 'Spacecraft 3D models'); },
    get from() { return tr('NASA 3D Resources (github.com/nasa/NASA-3D-Resources), según las pautas de uso de medios de la NASA.', 'NASA 3D Resources (github.com/nasa/NASA-3D-Resources), under NASA media usage guidelines.'); },
  },
  { get what() { return tr('Fotos', 'Photos'); }, get from() { return tr('NASA Image and Video Library (images.nasa.gov), con su identificador NASA en cada foto.', 'NASA Image and Video Library (images.nasa.gov), with its NASA ID on every photo.'); } },
  {
    get what() { return tr('Mapas de planetas y lunas', 'Planet and moon maps'); },
    get from() { return tr('Reunidos en la construcción inicial con Google AI Studio; derivados de imágenes de NASA/JPL-Caltech/USGS (conjuntos de mapas de los ejemplos de three.js y Planet Pixel Emporium).', 'Gathered during the initial build with Google AI Studio; derived from NASA/JPL-Caltech/USGS imagery (map sets from the three.js examples and Planet Pixel Emporium).'); },
  },
  {
    get what() { return tr('Posiciones y tiempo real', 'Positions and real time'); },
    get from() { return tr('Elementos orbitales de JPL (J2000) y modelos de rotación de la IAU; órbita de la ISS con datos de CelesTrak.', 'JPL orbital elements (J2000) and IAU rotation models; ISS orbit from CelesTrak data.'); },
  },
  { get what() { return tr('Sonido', 'Sound'); }, get from() { return tr('Sintetizado en tiempo real con Web Audio (sin archivos de audio). La voz del tutorial es la del dispositivo.', 'Synthesized in real time with Web Audio (no audio files). The narration uses the device\'s own voice.'); } },
  {
    get what() { return tr('Código abierto', 'Open source'); },
    get from() { return tr('React, three.js, Vite, Tailwind CSS y vite-plugin-pwa (MIT), lucide-react (ISC), decodificador Draco de Google (Apache 2.0). Tipografías Outfit, Plus Jakarta Sans y JetBrains Mono (SIL OFL).', 'React, three.js, Vite, Tailwind CSS and vite-plugin-pwa (MIT), lucide-react (ISC), Google Draco decoder (Apache 2.0). Fonts Outfit, Plus Jakarta Sans and JetBrains Mono (SIL OFL).'); },
  },
  {
    get what() { return tr('Uso de inteligencia artificial', 'Use of artificial intelligence'); },
    get from() { return tr('La primera versión se generó con Google AI Studio (Gemini) y el resto del código con Claude Code (Claude), dirigido y revisado por el equipo; los datos se verificaron con fuentes de la NASA. La nave del equipo se generó con IA: imagen con Google Gemini y modelo 3D con MakerWorld MakerLab «Image to 3D».', 'The first version was generated with Google AI Studio (Gemini) and the rest of the code with Claude Code (Claude), directed and reviewed by the team; the data was checked against NASA sources. The team starship is AI-generated: image with Google Gemini and 3D model with MakerWorld MakerLab "Image to 3D".'); },
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
 * Welcome screen with the Steps Ahead team that created Travix 3D. Shown every time the app starts;
 * it can also be reopened from the Travix logo.
 * Two columns on wide screens so it fits without scrolling, over an animated starfield.
 */
export const WelcomeCredits: React.FC<WelcomeCreditsProps> = ({ onClose }) => {
  const startRef = useRef<HTMLButtonElement | null>(null);

  const close = onClose;

  useEffect(() => {
    startRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
          aria-label={tr('Cerrar bienvenida', 'Close welcome')}
          className="absolute top-2.5 right-2.5 z-10 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-300 hover:text-white hover:bg-white/12 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid gap-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-8 md:items-center">
          {/* Columna 1: insignia, título y evento */}
          <div className="text-center">
            <img
              src="/team/steps-ahead.jpg"
              alt={`${tr('Insignia del equipo', 'Team badge')} ${TEAM_NAME}`}
              width={150}
              height={150}
              className="welcome-badge mx-auto w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full object-cover shadow-[0_0_40px_rgba(56,189,248,0.25)] ring-1 ring-white/15"
              draggable={false}
            />
            <p className="mt-3 md:mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
              {tr('Bienvenido a Travix 3D', 'Welcome to Travix 3D')}
            </p>
            <h2
              id="welcome-title"
              className="mt-1 font-display text-xl sm:text-2xl md:text-[1.7rem] font-semibold text-white tracking-tight leading-tight"
            >
              {tr('Creado por el equipo', 'Created by team')} {TEAM_NAME}
            </h2>
            <div className="mt-3 flex flex-col items-center gap-1 text-xs text-slate-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-100 font-medium">
                <Rocket className="w-3.5 h-3.5 text-amber-300" />
                {EVENT_NAME}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {tr(VENUE_ES, 'San Vicente in-person venue')}
              </span>
            </div>
          </div>

          {/* Columna 2: integrantes y botón para entrar */}
          <div>
            <h3 className="text-center md:text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {tr('Integrantes', 'Team members')}
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
              {tr('Comenzar a explorar', 'Start exploring')}
            </button>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              {tr('Vuelve a ver esta presentación tocando el logo de Travix.', 'Open this screen again by tapping the Travix logo.')}
            </p>
          </div>
        </div>

        {/* C2 / D08: aviso de no afiliación y créditos de todo lo que usa la app */}
        <p className="mt-4 text-center text-[10px] leading-snug text-slate-400">
          {tr('Proyecto educativo independiente. No está afiliado, respaldado ni patrocinado por la NASA.', 'Independent educational project. Not affiliated with, endorsed or sponsored by NASA.')}
        </p>
        <details className="mt-2 rounded-lg travix-glass-subcard px-3 py-2 text-[11px] leading-snug text-slate-200">
          <summary className="cursor-pointer select-none font-semibold text-slate-100 focus-visible:outline-2 focus-visible:outline-amber-400">
            {tr('Créditos y fuentes', 'Credits and sources')}
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
