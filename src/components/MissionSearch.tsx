import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  Globe,
  MapPin,
  Orbit,
  Satellite,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ABANDONED_MISSIONS,
  AbandonedMission,
  MissionCategory,
  MissionDestinationGroup,
} from '../data/abandonedMissionsData';
import {
  CELESTIAL_BODIES,
  CelestialBodyId,
  DEEP_SPACE_TARGETS,
  DeepSpaceCategory,
  DeepSpaceTarget,
  DeepSpaceTargetId,
} from '../data/solarSystemData';
import {
  SpaceAnswerResult,
  normalizeSearchText,
  resolveSpaceQuery,
} from '../data/spaceKnowledgeSearch';

export type SearchTab = 'surface' | 'orbitals' | 'planets' | 'galaxy';

export interface ActiveSearchAnswer {
  targetKey: string;
  headline: string;
  answer: string;
}

interface MissionSearchProps {
  isOpen: boolean;
  activeTab: SearchTab;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: SearchTab) => void;
  activeMissionId: string | null;
  activeBodyId: CelestialBodyId | null;
  activeDeepSpaceId: DeepSpaceTargetId | null;
  onSelectMission: (mission: AbandonedMission, context?: ActiveSearchAnswer) => void;
  onSelectBody: (id: CelestialBodyId, context?: ActiveSearchAnswer) => void;
  onSelectMoon: (bodyId: CelestialBodyId, moonId: string, context?: ActiveSearchAnswer) => void;
  onSelectDeepSpace: (id: DeepSpaceTargetId, context?: ActiveSearchAnswer) => void;
}

const SURFACE_CATEGORIES: Array<{ id: 'all' | MissionCategory; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'rover', label: 'Rovers' },
  { id: 'lander', label: 'Apolo y Landers' },
];

const MILKYWAY_CATEGORIES: Array<{ id: 'all' | DeepSpaceCategory; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'black_hole', label: 'Agujeros Negros' },
  { id: 'pulsar', label: 'Púlsares' },
  { id: 'nebula', label: 'Nebulosas' },
];

const DESTINATIONS: Array<'Todos' | MissionDestinationGroup> = [
  'Todos',
  'Marte',
  'Luna',
  'Tierra / Órbita',
  'Júpiter',
  'Saturno',
  'Titán',
  'Venus',
  'Mercurio',
  'Plutón',
  'Cometa 67P',
  'Espacio Profundo',
];

export const MissionSearch: React.FC<MissionSearchProps> = ({
  isOpen,
  activeTab,
  onOpenChange,
  onTabChange,
  activeMissionId,
  activeBodyId,
  activeDeepSpaceId,
  onSelectMission,
  onSelectBody,
  onSelectMoon,
  onSelectDeepSpace,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | MissionCategory>('all');
  const [mwCategory, setMwCategory] = useState<'all' | DeepSpaceCategory>('all');
  const [destination, setDestination] = useState<
    'Todos' | MissionDestinationGroup
  >('Todos');

  const smartAnswer = useMemo(() => resolveSpaceQuery(query), [query]);

  const navigateToAnswer = (res: SpaceAnswerResult) => {
    const t = res.target;
    if (t.type === 'mission') {
      onSelectMission(t.mission, {
        targetKey: `mission:${t.mission.id}`,
        headline: res.headline,
        answer: res.answer,
      });
    } else if (t.type === 'moon') {
      onSelectMoon(t.bodyId, t.moonId, {
        targetKey: `moon:${t.bodyId}:${t.moonId}`,
        headline: res.headline,
        answer: res.answer,
      });
    } else if (t.type === 'body') {
      onSelectBody(t.bodyId, {
        targetKey: `body:${t.bodyId}`,
        headline: res.headline,
        answer: res.answer,
      });
    } else {
      onSelectDeepSpace(t.id, {
        targetKey: `deepspace:${t.id}`,
        headline: res.headline,
        answer: res.answer,
      });
    }
    onOpenChange(false);
  };

  const filteredMissions = useMemo(() => {
    const q = normalizeSearchText(query);
    return ABANDONED_MISSIONS.filter((m) => {
      if (activeTab === 'surface') {
        if (
          m.category === 'satellite' ||
          m.missionRole === 'orbital' ||
          m.missionRole === 'deepspace'
        ) {
          if (m.id !== 'rosetta_philae') return false;
        }
        if (category !== 'all' && m.category !== category) return false;
      } else if (activeTab === 'orbitals') {
        if (m.missionRole === 'surface') return false;
      }
      if (destination !== 'Todos' && m.destinationGroup !== destination) {
        return false;
      }
      if (!q) return true;
      const hay = normalizeSearchText(
        `${m.name} ${m.destinationLabel} ${m.region} ${m.agency} ${m.launchYear}`,
      );
      return hay.includes(q);
    });
  }, [activeTab, query, category, destination]);

  const filteredBodies = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return CELESTIAL_BODIES;
    return CELESTIAL_BODIES.filter((b) => {
      const hay = normalizeSearchText(
        `${b.name} ${b.classification} ${b.moons.map((m) => m.name).join(' ')}`,
      );
      return hay.includes(q);
    });
  }, [query]);

  const filteredDeepSpace = useMemo(() => {
    const q = normalizeSearchText(query);
    return DEEP_SPACE_TARGETS.filter((d) => {
      if (mwCategory !== 'all' && d.category !== mwCategory) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${d.name} ${d.classification} ${d.categoryLabel} ${d.nasaObservatories}`,
      ).includes(q);
    });
  }, [query, mwCategory]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
      return;
    }
    if (e.key !== 'Enter') return;
    if (smartAnswer) {
      e.preventDefault();
      navigateToAnswer(smartAnswer);
      return;
    }
    if (
      (activeTab === 'surface' || activeTab === 'orbitals') &&
      filteredMissions.length > 0
    ) {
      e.preventDefault();
      onSelectMission(filteredMissions[0]);
      onOpenChange(false);
    } else if (activeTab === 'planets' && filteredBodies.length > 0) {
      e.preventDefault();
      onSelectBody(filteredBodies[0].id);
      onOpenChange(false);
    } else if (activeTab === 'galaxy' && filteredDeepSpace.length > 0) {
      e.preventDefault();
      onSelectDeepSpace(filteredDeepSpace[0].id);
      onOpenChange(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-30 pointer-events-none flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]">
      {/* Top-Right Round Magnifying Glass Button */}
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Buscar misiones, satélites, planetas y preguntas del cosmos"
        title="Buscador espacial (misiones, preguntas, planetas, Vía Láctea)"
        className={`pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
          isOpen
            ? 'travix-glass-bar border-amber-400/55 bg-amber-500/20 text-amber-200'
            : 'travix-glass-bar text-slate-100 hover:text-white hover:border-white/30'
        }`}
      >
        {isOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="pointer-events-auto w-[min(420px,92vw)] rounded-xl travix-glass-panel overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
          {/* Search Input ("Google del Espacio" 100% local & offline) */}
          <div className="p-3 border-b border-white/15 flex items-center gap-2 travix-glass-subcard border-x-0 border-t-0">
            <Search className="w-4 h-4 text-amber-400/90 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Busca planeta, misión o pregunta (ej. primera misión a la Luna, Marte...)"
              autoFocus
              className="w-full bg-transparent text-xs text-white placeholder-slate-300/75 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4 Clean Navigation Tabs with Icons */}
          <div className="px-3 pt-2.5 pb-2 border-b border-white/12 flex flex-col gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  onTabChange('surface');
                  setDestination('Todos');
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'surface'
                    ? 'bg-amber-500/12 text-amber-200 border border-amber-400/45'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                <span>Superficie</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onTabChange('orbitals');
                  setDestination('Todos');
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'orbitals'
                    ? 'bg-amber-500/12 text-amber-200 border border-amber-400/45'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <Satellite className="w-3 h-3 shrink-0" />
                <span>Satélites</span>
              </button>
              <button
                type="button"
                onClick={() => onTabChange('planets')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'planets'
                    ? 'bg-amber-500/12 text-amber-200 border border-amber-400/45'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <Globe className="w-3 h-3 shrink-0" />
                <span>Planetas</span>
              </button>
              <button
                type="button"
                onClick={() => onTabChange('galaxy')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'galaxy'
                    ? 'bg-amber-500/12 text-amber-200 border border-amber-400/45'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Vía Láctea</span>
              </button>
            </div>

            {(activeTab === 'surface' || activeTab === 'orbitals') && (
              <>
                {activeTab === 'surface' && (
                  <div className="flex items-center gap-1">
                    {SURFACE_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          category === c.id
                            ? 'bg-white/10 text-white border border-white/25'
                            : 'text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {DESTINATIONS.map((dest) => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => setDestination(dest)}
                      className={`px-2 py-0.5 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        destination === dest
                          ? 'bg-white/10 text-amber-200 border border-white/25'
                          : 'text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      }`}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'galaxy' && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                {MILKYWAY_CATEGORIES.map((mc) => (
                  <button
                    key={mc.id}
                    type="button"
                    onClick={() => setMwCategory(mc.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      mwCategory === mc.id
                        ? 'bg-white/10 text-amber-200 border border-white/25'
                        : 'text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    {mc.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Direct Local Semantic Answer Card ("Google del Espacio") */}
          {smartAnswer && (
            <button
              type="button"
              onClick={() => navigateToAnswer(smartAnswer)}
              className="p-3 border-b border-amber-400/25 bg-amber-500/[0.05] hover:bg-amber-500/[0.1] text-left transition-colors cursor-pointer shrink-0"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-amber-300/95 uppercase tracking-wider">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Respuesta directa · {smartAnswer.destinationLabel}</span>
                </span>
                <span className="inline-flex items-center gap-0.5 text-amber-200 normal-case">
                  <span>Ver en 3D</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold text-white">
                {smartAnswer.headline}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-100 leading-relaxed line-clamp-3">
                {smartAnswer.answer}
              </p>
            </button>
          )}

          {/* Results List */}
          <div className="overflow-y-auto divide-y divide-white/10">
            {activeTab === 'surface' || activeTab === 'orbitals' ? (
              filteredMissions.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-300/85">
                  {smartAnswer
                    ? 'Haz clic en la respuesta directa de arriba o pulsa Enter para viajar en 3D.'
                    : 'No se encontraron misiones con esos filtros.'}
                </div>
              ) : (
                filteredMissions.map((mission) => {
                  const isSelected = activeMissionId === mission.id;
                  return (
                    <button
                      key={mission.id}
                      type="button"
                      onClick={() => {
                        onSelectMission(mission);
                        onOpenChange(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-500/16' : 'hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: mission.accentColor }}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-semibold text-white truncate">
                            {mission.name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-300/85 truncate">
                          <span>{mission.categoryLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-200">
                            {mission.destinationLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{mission.launchYear}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-300/70 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{mission.region}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300/75 shrink-0" />
                    </button>
                  );
                })
              )
            ) : activeTab === 'planets' ? (
              filteredBodies.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-300/85">
                  {smartAnswer
                    ? 'Haz clic en la respuesta directa de arriba o pulsa Enter para viajar en 3D.'
                    : 'No se encontraron cuerpos celestes.'}
                </div>
              ) : (
                filteredBodies.map((body) => {
                  const isSelected = activeBodyId === body.id;
                  return (
                    <button
                      key={body.id}
                      type="button"
                      onClick={() => {
                        onSelectBody(body.id);
                        onOpenChange(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-500/16' : 'hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: body.accentColor }}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-semibold text-white truncate">
                            {body.name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-300/85 truncate">
                          <Globe className="w-3 h-3 shrink-0" />
                          <span>{body.stats.distanceAu}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {body.moons.length > 0
                              ? `${body.moons.length} lunas principales`
                              : body.classification}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300/75 shrink-0" />
                    </button>
                  );
                })
              )
            ) : filteredDeepSpace.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-300/85">
                {smartAnswer
                  ? 'Haz clic en la respuesta directa de arriba o pulsa Enter para viajar en 3D.'
                  : 'No se encontraron objetos en la Vía Láctea.'}
              </div>
            ) : (
              filteredDeepSpace.map((target: DeepSpaceTarget) => {
                const isSelected = activeDeepSpaceId === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => {
                      onSelectDeepSpace(target.id);
                      onOpenChange(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-amber-500/16' : 'hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: target.accentColor }}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-semibold text-white truncate">
                          {target.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-300/85 truncate">
                        <Orbit className="w-3 h-3 shrink-0" />
                        <span className="text-slate-200 shrink-0">
                          {target.categoryLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{target.classification}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-300/70 truncate">
                        {target.distanceLabel} · {target.nasaObservatories}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300/75 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
