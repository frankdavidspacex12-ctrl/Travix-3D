import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Pause,
  Play,
  Search,
  X,
} from 'lucide-react';
import {
  GuidedTour,
  GuidedTourStep,
  NASA_GUIDED_TOURS,
} from '../data/guidedToursData';
import type { SearchTab } from './MissionSearch';

interface GuidedTourBarProps {
  onSelectStep: (step: GuidedTourStep) => void;
  onOpenSearch?: (tab?: SearchTab) => void;
}

export const GuidedTourBar: React.FC<GuidedTourBarProps> = ({
  onSelectStep,
  onOpenSearch,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<GuidedTour | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const currentStep = activeTour ? activeTour.steps[stepIdx] ?? null : null;

  const startTour = (tour: GuidedTour) => {
    setActiveTour(tour);
    setStepIdx(0);
    setAutoPlay(false);
    setMenuOpen(false);
    if (tour.steps[0]) {
      onSelectStep(tour.steps[0]);
    }
  };

  const goToStep = (nextIdx: number) => {
    if (!activeTour) return;
    const bounded =
      (nextIdx + activeTour.steps.length) % activeTour.steps.length;
    setStepIdx(bounded);
    const step = activeTour.steps[bounded];
    if (step) {
      onSelectStep(step);
    }
  };

  useEffect(() => {
    if (!autoPlay || !activeTour) return;
    const id = window.setInterval(() => {
      setStepIdx((prev) => {
        const next = (prev + 1) % activeTour.steps.length;
        const step = activeTour.steps[next];
        if (step) onSelectStep(step);
        return next;
      });
    }, 11000);
    return () => window.clearInterval(id);
  }, [autoPlay, activeTour, onSelectStep]);

  return (
    <>
      {/* Round Compass Trigger Button positioned cleanly next to header logo */}
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-label="Guías interactivas NASA"
        className={`pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
          activeTour || menuOpen
            ? 'travix-glass-bar border-amber-400/60 text-amber-300'
            : 'travix-glass-bar text-slate-100 hover:text-white hover:border-white/35'
        }`}
        title="Guías interactivas científicas basadas en datos abiertos de la NASA"
      >
        <Compass className="w-4 h-4 text-amber-400 shrink-0" />
      </button>

      {/* Tour Catalog Selector Popover */}
      {menuOpen && (
        <div className="fixed top-14 left-4 z-30 w-[min(340px,90vw)] rounded-xl travix-glass-panel overflow-hidden pointer-events-auto">
          <div className="px-3.5 py-2.5 border-b border-white/12 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-white">
                Guías Interactivas NASA
              </div>
              <div className="text-[10px] text-slate-300/80">
                Recorridos científicos guiados 100% offline
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSearch('planets');
                  }}
                  aria-label="Buscar planetas y misiones"
                  title="Buscar planetas, misiones o galaxia"
                  className="p-1.5 rounded-md travix-glass-control text-amber-300 hover:text-amber-200 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar selector de guías"
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/12 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {NASA_GUIDED_TOURS.map((tour) => {
              const isSelected = activeTour?.id === tour.id;
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => startTour(tour)}
                  className={`w-full px-3.5 py-2.5 text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected ? 'bg-amber-500/16' : 'hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tour.accentColor }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-white truncate">
                        {tour.name}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-300/80 truncate">
                      {tour.subtitle}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-tabular text-slate-300/85 shrink-0">
                    {tour.steps.length} paradas
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Guided Tour Narration Card (Right-side, opposite left dossier) */}
      {activeTour && currentStep && (
        <aside
          aria-label={`Guía NASA: ${activeTour.name}`}
          className="fixed top-16 right-4 z-20 w-[min(340px,88vw)] rounded-xl travix-glass-panel overflow-hidden pointer-events-auto"
        >
          <div className="px-3.5 py-2 border-b border-white/12 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular text-amber-300">
                <span>
                  Parada {stepIdx + 1}/{activeTour.steps.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate text-slate-200">
                  {activeTour.name}
                </span>
              </div>
              <h3 className="mt-0.5 font-display text-xs sm:text-sm font-semibold text-white truncate">
                {currentStep.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={() => onOpenSearch('planets')}
                  aria-label="Buscar planetas o misiones"
                  title="Buscar otro planeta, satélite o misión"
                  className="p-1.5 rounded-md travix-glass-control text-amber-300 hover:text-amber-200 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAutoPlay(false);
                  setActiveTour(null);
                }}
                aria-label="Finalizar guía NASA"
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/12 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3.5 space-y-2 text-xs">
            <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-cyan-300/95">
              {currentStep.nasaBadge}
            </div>
            <p className="text-slate-100 leading-relaxed">
              {currentStep.narration}
            </p>
            <div className="p-2 rounded-lg travix-glass-subcard text-[11px] text-slate-200">
              {currentStep.scienceFact}
            </div>

            <div className="pt-1 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAutoPlay(false);
                  goToStep(stepIdx - 1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md travix-glass-control text-[11px] text-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoPlay((p) => !p)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] cursor-pointer ${
                  autoPlay
                    ? 'travix-glass-control border-amber-400/55 text-amber-200'
                    : 'travix-glass-control text-slate-100'
                }`}
              >
                {autoPlay ? (
                  <>
                    <Pause className="w-3 h-3" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Auto</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAutoPlay(false);
                  goToStep(stepIdx + 1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md travix-glass-control border-amber-400/45 text-[11px] text-amber-100 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};

