import React, { useMemo } from 'react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Globe,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  computeBodyTelemetry,
  daysSinceJ2000,
} from '../astronomy/ephemeris';
import { AbandonedMission } from '../data/abandonedMissionsData';
import {
  CelestialBodyData,
  CelestialBodyId,
  MoonData,
} from '../data/solarSystemData';
import type { SearchTab } from './MissionSearch';

interface ControlDockProps {
  selectedBody: CelestialBodyData | null;
  selectedMoon: MoonData | null;
  selectedMission: AbandonedMission | null;
  isPlanetInfoOpen?: boolean;
  searchContext?: { headline: string; answer: string } | null;
  cameraMode: 'overview' | 'tracking' | 'free';
  simEpochMs: number;
  isPaused: boolean;
  showOrbits: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTogglePlanetInfo: () => void;
  onHidePanel: () => void;
  onOpenSearch: (tab?: SearchTab) => void;
  onSelectBody: (id: CelestialBodyId) => void;
  onSelectMoon: (bodyId: CelestialBodyId, moonId: string) => void;
  onResetOverview: () => void;
  onReleaseCamera: () => void;
  onTogglePause: () => void;
  onToggleOrbits: () => void;
}

function formatUtcTimestamp(epochMs: number): string {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return '---- -- -- --:--:-- UTC';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} UTC`;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  selectedBody,
  selectedMoon,
  selectedMission,
  isPlanetInfoOpen = false,
  searchContext,
  cameraMode,
  simEpochMs,
  isPaused,
  showOrbits,
  isCollapsed,
  onToggleCollapse,
  onTogglePlanetInfo,
  onHidePanel,
  onOpenSearch,
  onSelectBody,
  onSelectMoon,
  onResetOverview,
  onReleaseCamera,
  onTogglePause,
  onToggleOrbits,
}) => {
  const orbitsDisabledInCloseUp = selectedBody !== null;

  const telemetry = useMemo(() => {
    if (!selectedBody) return null;
    return computeBodyTelemetry(selectedBody.id, daysSinceJ2000(simEpochMs));
  }, [selectedBody, simEpochMs]);

  return (
    <div
      className="fixed bottom-4 left-1/2 z-20 max-w-[94vw] -translate-x-1/2 pointer-events-none transition-transform duration-300 ease-out flex flex-col items-center"
      style={{
        transform: isCollapsed
          ? 'translate(-50%, calc(100% + 16px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Pure Planet / Moon Telemetry & Info Panel (toggled by the round Open Book button) */}
      {selectedBody && !selectedMission && isPlanetInfoOpen && !isCollapsed && (
        <div className="pointer-events-auto mb-2 w-[min(700px,92vw)] rounded-xl travix-glass-panel px-4 py-3">
          {searchContext && (
            <div className="mb-2.5 p-2 rounded-lg travix-glass-subcard border-amber-400/35">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                Respuesta · {searchContext.headline}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-100 leading-relaxed">
                {searchContext.answer}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedBody.accentColor }}
                  aria-hidden="true"
                />
                <h2 className="font-display text-sm sm:text-base font-semibold text-white tracking-tight">
                  {selectedMoon
                    ? `${selectedMoon.name} · Luna de ${selectedBody.name}`
                    : selectedBody.name}
                </h2>
                <span className="text-[11px] text-slate-300/85">
                  {selectedBody.classification}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-200/95 leading-relaxed">
                {selectedBody.description}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {selectedMoon && (
                <button
                  type="button"
                  onClick={() => onSelectBody(selectedBody.id)}
                  className="px-2.5 py-1 rounded-md travix-glass-control text-[11px] text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Volver a {selectedBody.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenSearch('planets')}
                aria-label="Buscar otro planeta o luna"
                title="Buscar otro planeta, luna o misión"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md travix-glass-control text-[11px] text-slate-100 hover:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Otro planeta</span>
              </button>
              <button
                type="button"
                onClick={onHidePanel}
                aria-label="Ocultar ficha y seguir viendo en 3D"
                title="Ocultar ficha (seguir viendo en 3D)"
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/12 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Core Physical NASA Parameters */}
          <div className="mt-2.5 pt-2 border-t border-white/12 grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1.5">
            <div>
              <div className="text-[10px] text-slate-300/80">Distancia media</div>
              <div className="text-xs font-mono-tabular text-white">
                {selectedBody.stats.distanceAu}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-300/80">Diámetro</div>
              <div className="text-xs font-mono-tabular text-white">
                {selectedBody.stats.diameterKm}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-300/80">Año orbital</div>
              <div className="text-xs font-mono-tabular text-white">
                {selectedBody.stats.orbitalPeriod}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-300/80">Rotación</div>
              <div className="text-xs font-mono-tabular text-white">
                {selectedBody.stats.dayLength}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-300/80">Temperatura</div>
              <div className="text-xs font-mono-tabular text-white">
                {selectedBody.stats.temperature}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-300/80">Gravedad</div>
              <div className="text-xs font-mono-tabular text-white">
                {selectedBody.stats.gravity}
              </div>
            </div>
          </div>

          {/* Real-Time J2000 Orbital Telemetry Strip */}
          {telemetry && (
            <div className="mt-2 pt-2 border-t border-white/12">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-cyan-300/95">
                  <Activity className="w-3 h-3" />
                  <span>Telemetría orbital J2000 en tiempo real</span>
                </span>
                <span className="text-[10px] text-slate-300/80 truncate max-w-[55%]">
                  Atmósfera: {selectedBody.stats.atmosphere}
                </span>
              </div>

              {selectedBody.id === 'sun' ? (
                <div className="grid grid-cols-3 gap-3 text-[11px] font-mono-tabular text-slate-100">
                  <div>
                    <span className="text-slate-300/80">Vel. galáctica: </span>
                    <span className="text-amber-200">
                      {telemetry.orbitalSpeedKmS.toFixed(1)} km/s
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-300/80">Vel. escape: </span>
                    <span>{selectedBody.stats.escapeVelocity}</span>
                  </div>
                  <div>
                    <span className="text-slate-300/80">Sistemas: </span>
                    <span>{selectedBody.stats.moonsCount}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono-tabular text-slate-100">
                  <div>
                    <span className="text-slate-300/80">Heliocéntrica: </span>
                    <span className="text-cyan-200">
                      {telemetry.distanceAu.toFixed(3)} UA
                    </span>
                    <span className="text-slate-400 ml-1">
                      ({Math.round(telemetry.distanceMillionKm).toLocaleString('es-ES')} M km)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-300/80">Vel. orbital: </span>
                    <span className="text-amber-200">
                      {telemetry.orbitalSpeedKmS.toFixed(2)} km/s
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-300/80">Luz solar: </span>
                    <span>
                      {telemetry.lightTimeMinutes < 1
                        ? `${Math.round(telemetry.lightTimeMinutes * 60)} s`
                        : `${telemetry.lightTimeMinutes.toFixed(1)} min`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-300/80">Escape · Lon.: </span>
                    <span>
                      {selectedBody.stats.escapeVelocity} · {telemetry.heliocentricLonDeg.toFixed(1)}°
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Natural Moons Selector */}
          {selectedBody.moons.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/12 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-300/85 mr-1">
                Lunas ({selectedBody.stats.moonsCount}):
              </span>
              {selectedBody.moons.map((moon) => {
                const active = selectedMoon?.id === moon.id;
                return (
                  <button
                    key={moon.id}
                    type="button"
                    onClick={() => onSelectMoon(selectedBody.id, moon.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'travix-glass-control border-amber-400/55 text-amber-200'
                        : 'travix-glass-control text-slate-200 hover:text-white'
                    }`}
                  >
                    {moon.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Minimalist Collapse / Expand Handle + Round Open Book Planet Info Button */}
      <div className="flex items-center justify-center gap-2 mb-1.5 pointer-events-auto">
        {selectedBody && !selectedMission && !isCollapsed && (
          <button
            type="button"
            onClick={onTogglePlanetInfo}
            aria-expanded={isPlanetInfoOpen}
            aria-label={`Información científica de ${selectedMoon ? selectedMoon.name : selectedBody.name}`}
            title={`Información de ${selectedMoon ? selectedMoon.name : selectedBody.name} (diámetro, órbita, rotación)`}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
              isPlanetInfoOpen
                ? 'travix-glass-bar border-amber-400/60 text-amber-300'
                : 'travix-glass-bar text-slate-100 hover:text-white hover:border-white/35'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Mostrar controles' : 'Ocultar controles'}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full travix-glass-bar text-[11px] text-slate-200 hover:text-white hover:border-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          style={{
            transform: isCollapsed ? 'translateY(-44px)' : 'translateY(0)',
            transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Minimalist 98% Glassmorphism Control Bar */}
      <div className="pointer-events-auto rounded-full travix-glass-bar px-3.5 py-1.5 flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular text-slate-100 whitespace-nowrap shrink-0 px-1">
          <Clock className="w-3.5 h-3.5 text-amber-400/95 shrink-0" />
          <span>{formatUtcTimestamp(simEpochMs)}</span>
        </div>

        <span className="h-3.5 w-px bg-white/18" aria-hidden="true" />

        <button
          type="button"
          onClick={onTogglePause}
          aria-label={isPaused ? 'Reanudar simulación' : 'Pausar simulación'}
          title={isPaused ? 'Reanudar (Espacio)' : 'Pausar (Espacio)'}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
            isPaused
              ? 'bg-amber-500/22 border border-amber-400/45 text-amber-100'
              : 'text-slate-100 hover:text-white hover:bg-white/12 border border-transparent'
          }`}
        >
          {isPaused ? (
            <>
              <Play className="w-3 h-3 fill-current text-amber-400" />
              <span>Reanudar</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 fill-current text-slate-200" />
              <span>Pausar</span>
            </>
          )}
        </button>

        {cameraMode === 'tracking' && (
          <button
            type="button"
            onClick={onReleaseCamera}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white/12 text-slate-100 hover:text-white text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
            title="Desacoplar seguimiento orbital (WASD / ratón)"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Libre</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleOrbits}
          aria-pressed={showOrbits && !orbitsDisabledInCloseUp}
          title={
            orbitsDisabledInCloseUp
              ? 'Órbitas ocultas al acercarse'
              : 'Alternar órbitas en vista general'
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
            showOrbits && !orbitsDisabledInCloseUp
              ? 'bg-white/18 text-white border border-white/25'
              : 'text-slate-200 hover:text-white hover:bg-white/12 border border-transparent'
          }`}
        >
          <Orbit className="w-3.5 h-3.5" />
          <span>Órbitas</span>
        </button>

        <button
          type="button"
          onClick={onResetOverview}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white/12 text-slate-100 hover:text-white text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          title="Volver a la vista general (Esc)"
        >
          {selectedBody ? (
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>Sistema</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenSearch(selectedBody ? 'planets' : 'surface')}
          aria-label="Abrir buscador espacial"
          title="Buscar planetas, lunas, misiones, satélites y Vía Láctea"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full travix-glass-control text-slate-100 hover:text-white text-[11px] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Buscar</span>
        </button>
      </div>
    </div>
  );
};

