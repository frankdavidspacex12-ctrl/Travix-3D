import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Pause,
  Play,
  Search,
} from 'lucide-react';
import {
  GuidedTour,
  GuidedTourStep,
  NASA_GUIDED_TOURS,
} from '../data/guidedToursData';
import type { SearchTab } from './MissionSearch';
import { PANEL_ICON_BUTTON, PanelControls } from './PanelControls';
import { useViewInset } from '../ui/viewInsets';

interface GuidedTourBarProps {
  onSelectStep: (step: GuidedTourStep) => void;
  onOpenSearch?: (tab?: SearchTab) => void;
  /** True while a guide's narration card is open and expanded */
  onCardOpenChange?: (open: boolean) => void;
}

export const GuidedTourBar: React.FC<GuidedTourBarProps> = ({
  onSelectStep,
  onOpenSearch,
  onCardOpenChange,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMinimized, setMenuMinimized] = useState(false);
  const [activeTour, setActiveTour] = useState<GuidedTour | null>(null);
  const [cardMinimized, setCardMinimized] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const currentStep = activeTour ? activeTour.steps[stepIdx] ?? null : null;

  // Phones: the narration card sits under the header, so the 3D view keeps the target below it.
  useViewInset('guided-tour-card', cardRef, 'top', Boolean(activeTour && currentStep));

  const cardOpen = Boolean(activeTour && currentStep) && !cardMinimized;
  useEffect(() => {
    onCardOpenChange?.(cardOpen);
  }, [cardOpen, onCardOpenChange]);

  const startTour = (tour: GuidedTour) => {
    setActiveTour(tour);
    setStepIdx(0);
    setAutoPlay(false);
    setCardMinimized(false);
    setMenuOpen(false);
    if (tour.steps[0]) {
      onSelectStep(tour.steps[0]);
    }
  };

  const endTour = () => {
    setAutoPlay(false);
    setActiveTour(null);
    setCardMinimized(false);
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
        onClick={() => {
          setMenuMinimized(false);
          setMenuOpen((prev) => !prev);
        }}
        aria-expanded={menuOpen}
        aria-label="Guías interactivas NASA"
        data-tour="tours"
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
        <div className="fixed top-14 left-2 sm:left-4 z-30 w-[min(340px,calc(100vw-1rem))] max-h-[calc(100dvh-5rem)] rounded-xl travix-glass-panel overflow-hidden pointer-events-auto flex flex-col">
          <div
            className={`px-3.5 py-2 flex items-center justify-between gap-2 ${
              menuMinimized ? '' : 'border-b border-white/12'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white break-words">
                Guías Interactivas NASA
              </div>
              {!menuMinimized && (
                <div className="text-[11px] text-slate-200 break-words">
                  Recorridos científicos guiados 100% offline
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onOpenSearch && !menuMinimized && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSearch('planets');
                  }}
                  aria-label="Buscar planetas y misiones"
                  title="Buscar planetas, misiones o galaxia"
                  className={`${PANEL_ICON_BUTTON} travix-glass-control text-amber-300 hover:text-amber-200`}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
              <PanelControls
                label="selector de guías"
                minimized={menuMinimized}
                onToggleMinimize={() => setMenuMinimized((prev) => !prev)}
                onClose={() => setMenuOpen(false)}
              />
            </div>
          </div>
          {!menuMinimized && (
            <div className="divide-y divide-white/10 overflow-y-auto min-h-0">
              {NASA_GUIDED_TOURS.map((tour) => {
                const isSelected = activeTour?.id === tour.id;
                return (
                  <button
                    key={tour.id}
                    type="button"
                    onClick={() => startTour(tour)}
                    className={`w-full px-3.5 py-3 sm:py-2.5 text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
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
                        <span className="text-xs font-semibold text-white break-words min-w-0">
                          {tour.name}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-200 break-words">
                        {tour.subtitle}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-slate-200 shrink-0">
                      {tour.steps.length} paradas
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Active Guided Tour Narration Card (right side on desktop, under the header on phones) */}
      {activeTour && currentStep && (
        <aside
          ref={cardRef}
          aria-label={`Guía NASA: ${activeTour.name}`}
          className="travix-mobile-top-sheet fixed top-16 right-4 z-20 w-[min(340px,88vw)] max-h-[calc(100dvh-9rem)] rounded-xl travix-glass-panel overflow-hidden pointer-events-auto flex flex-col"
        >
          <div
            className={`px-3.5 py-2 flex items-center justify-between gap-2 ${
              cardMinimized ? '' : 'border-b border-white/12'
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-mono-tabular text-amber-300">
                <span className="shrink-0">
                  Parada {stepIdx + 1}/{activeTour.steps.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="break-words min-w-0 text-slate-200">
                  {activeTour.name}
                </span>
                {autoPlay && (
                  <Play
                    className="w-2.5 h-2.5 shrink-0 fill-current text-amber-300"
                    aria-label="Reproducción automática activa"
                  />
                )}
              </div>
              <h3 className="mt-0.5 font-display text-xs sm:text-sm font-semibold text-white break-words">
                {currentStep.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {cardMinimized ? (
                <>
                  {/* Keep navigating the tour while it stays out of the way */}
                  <button
                    type="button"
                    onClick={() => {
                      setAutoPlay(false);
                      goToStep(stepIdx - 1);
                    }}
                    aria-label="Parada anterior"
                    title="Anterior"
                    className={PANEL_ICON_BUTTON}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoPlay(false);
                      goToStep(stepIdx + 1);
                    }}
                    aria-label="Parada siguiente"
                    title="Siguiente"
                    className={`${PANEL_ICON_BUTTON} text-amber-200`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                onOpenSearch && (
                  <button
                    type="button"
                    onClick={() => onOpenSearch('planets')}
                    aria-label="Buscar planetas o misiones"
                    title="Buscar otro planeta, satélite o misión"
                    className={`${PANEL_ICON_BUTTON} travix-glass-control text-amber-300 hover:text-amber-200`}
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                )
              )}
              <PanelControls
                label="guía NASA"
                minimized={cardMinimized}
                onToggleMinimize={() => setCardMinimized((prev) => !prev)}
                onClose={endTour}
                closeTitle="Terminar guía NASA"
              />
            </div>
          </div>

          {!cardMinimized && (
            <div className="p-3.5 space-y-2 text-xs overflow-y-auto min-h-0">
              <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-cyan-300/95">
                {currentStep.nasaBadge}
              </div>
              <p className="text-slate-100 leading-relaxed">
                {currentStep.narration}
              </p>
              <div className="p-2 rounded-lg travix-glass-subcard text-xs text-slate-200">
                {currentStep.scienceFact}
              </div>

              <div className="pt-1 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAutoPlay(false);
                    goToStep(stepIdx - 1);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 rounded-md travix-glass-control text-xs text-slate-100 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAutoPlay((p) => !p)}
                  className={`inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 rounded-md border text-xs cursor-pointer ${
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
                  className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 rounded-md travix-glass-control border-amber-400/45 text-xs text-amber-100 cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
};
