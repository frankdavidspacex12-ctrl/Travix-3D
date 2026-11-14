/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, FileText, Search, Sun } from 'lucide-react';
import { MemoNearbyObjects } from './components/NearbyObjects';
import {
  ABANDONED_MISSIONS,
  AbandonedMission,
} from './data/abandonedMissionsData';
import {
  CELESTIAL_BODIES,
  CelestialBodyId,
  DEEP_SPACE_TARGETS,
  DeepSpaceTargetId,
} from './data/solarSystemData';
import { GuidedTourStep } from './data/guidedToursData';
import { FocusSelection, SolarSystemEngine } from './three/SolarSystemEngine';
import type { SurfaceCameraMode } from './three/surfaceDiorama';
import { ControlDock } from './components/ControlDock';
import { GuidedTourBar } from './components/GuidedTourBar';
import { MissionDossier } from './components/MissionDossier';
import {
  ActiveSearchAnswer,
  MissionSearch,
  SearchTab,
} from './components/MissionSearch';
import { PWAControls } from './components/PWAControls';
import { shouldShowWelcome, TEAM_NAME, WelcomeCredits } from './components/WelcomeCredits';
import { subscribeViewInsets, useViewInset } from './ui/viewInsets';
import type { WarpRequest } from './components/WarpOverlay';
import { soundscape } from './audio/soundscape';
import type { WarpTarget } from './three/warpScene';
import type { LinkTarget } from './components/LinkedText';

// Hyperspace jump of "Modo nave": its own chunk, loaded only when ship mode is turned on
const WarpOverlay = lazy(() => import('./components/WarpOverlay'));
const SHIP_MODE_KEY = 'travix-ship-mode';

function readShipMode(): boolean {
  try {
    return window.localStorage.getItem(SHIP_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

function bodyName(id: CelestialBodyId): string {
  return CELESTIAL_BODIES.find((b) => b.id === id)?.name ?? id;
}

/** What the hyperspace jump shows ahead for a planet / moon destination. */
function warpTargetFor(bodyId: CelestialBodyId, moonId?: string): WarpTarget | undefined {
  const body = CELESTIAL_BODIES.find((b) => b.id === bodyId);
  if (!body) return undefined;
  if (moonId) {
    const moon = body.moons.find((m) => m.id === moonId);
    if (moon) return { texture: moon.textureUrl, color: '#cbd5e1' };
  }
  return { texture: body.textures.map, color: body.accentColor, glow: body.id === 'sun' };
}

// The engine pushes the simulation clock to React ~8×/s. Only ControlDock shows the clock, so
// everything else is memoized and skips those re-renders (props below are kept referentially stable).
const MemoGuidedTourBar = memo(GuidedTourBar);
const MemoMissionDossier = memo(MissionDossier);
const MemoMissionSearch = memo(MissionSearch);
const MemoPWAControls = memo(PWAControls);

interface PlanetLabelsProps {
  hoveredId: CelestialBodyId | null;
  onSelect: (id: CelestialBodyId) => void;
  registerLabel: (id: CelestialBodyId, el: HTMLElement | null) => void;
}

const PlanetLabels = memo(function PlanetLabels({
  hoveredId,
  onSelect,
  registerLabel,
}: PlanetLabelsProps) {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
      {CELESTIAL_BODIES.map((body) => {
        const isHovered = hoveredId === body.id;
        return (
          <button
            key={body.id}
            type="button"
            ref={(el) => registerLabel(body.id, el)}
            onClick={() => onSelect(body.id)}
            className={`fixed top-0 left-0 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
              isHovered
                ? 'travix-glass-bar border-white/35 text-white'
                : 'travix-glass-label text-slate-100/95 hover:text-white hover:border-white/30'
            }`}
          >
            {body.name}
          </button>
        );
      })}
    </div>
  );
});

interface SunMarkerProps {
  onGo: () => void;
  markerRef: (el: HTMLButtonElement | null) => void;
}

/**
 * Universal Sun reference: positioned every frame by the engine (registerSunMarker). It shows
 * where the Sun is (arrow toward it when off-screen) and how far, and flies there on click.
 */
const SunMarker = memo(function SunMarker({ onGo, markerRef }: SunMarkerProps) {
  return (
    <button
      ref={markerRef}
      type="button"
      onClick={onGo}
      aria-label="Ir al Sol, referencia del Sistema Solar"
      title="El Sol: referencia universal del Sistema Solar. Toca para ir."
      style={{ opacity: 0, pointerEvents: 'none' }}
      className="fixed top-0 left-0 z-[15] inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full travix-chip border-amber-300/30 text-[10px] font-medium text-slate-100 whitespace-nowrap cursor-pointer transition-opacity duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-400"
    >
      <span data-sun-arrow className="inline-flex shrink-0">
        <ArrowRight className="w-3 h-3 text-amber-300/90" />
      </span>
      <Sun className="w-3 h-3 text-amber-300 shrink-0" />
      <span data-sun-text className="font-mono-tabular">
        Sol
      </span>
    </button>
  );
});

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SolarSystemEngine | null>(null);
  const labelElementsRef = useRef(new Map<CelestialBodyId, HTMLElement>());
  const headerRef = useRef<HTMLElement | null>(null);
  const sunMarkerRef = useRef<HTMLButtonElement | null>(null);
  useViewInset('app-header', headerRef, 'top');

  const [selection, setSelection] = useState<FocusSelection | null>(null);
  const [activeDeepSpaceId, setActiveDeepSpaceId] =
    useState<DeepSpaceTargetId | null>(null);
  const [hoveredId, setHoveredId] = useState<CelestialBodyId | null>(null);
  const [cameraMode, setCameraMode] = useState<'overview' | 'tracking' | 'free'>(
    'overview',
  );
  const [isSurfaceActive, setIsSurfaceActive] = useState(false);
  const [surfaceViewMode, setSurfaceViewMode] =
    useState<SurfaceCameraMode>('rover');
  const [simEpochMs, setSimEpochMs] = useState(() => Date.now());
  const [isSiteSunlit, setIsSiteSunlit] = useState<boolean | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  // Orbits on in the system view; the engine fades them out on any planet / moon / mission
  const [showOrbits, setShowOrbits] = useState(true);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isInfoHidden, setIsInfoHidden] = useState(false);
  const [isPlanetInfoOpen, setIsPlanetInfoOpen] = useState(false);
  const [searchAnswer, setSearchAnswer] = useState<ActiveSearchAnswer | null>(
    null,
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>('surface');
  const [webglError, setWebglError] = useState(false);
  const [isTourCardOpen, setIsTourCardOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(
    () => window.matchMedia('(max-width: 639.98px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639.98px)');
    const onChange = () => setIsPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleOpenSearch = useCallback((tab?: SearchTab) => {
    if (tab) setSearchTab(tab);
    setIsSearchOpen(true);
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    let engine: SolarSystemEngine | null = null;
    let lastSurfaceActive = false;
    try {
      engine = new SolarSystemEngine(mount, {
        onSelectTarget: (sel) => {
          setSelection(sel);
          if (sel?.missionId) {
            setIsInfoHidden(false);
          } else {
            setIsPlanetInfoOpen(false);
          }
        },
        onHoverBody: (id) => setHoveredId(id),
        onClockUpdate: (epochMs, sunlit) => {
          setSimEpochMs(epochMs);
          setIsSiteSunlit(sunlit);
        },
        onCameraModeChange: (mode) => setCameraMode(mode),
        // Sonido de llegada cuando la cámara termina el viaje
        onArrive: () => soundscape.arrive(),
        onSurfaceModeChange: (active, viewMode) => {
          if (active && !lastSurfaceActive) soundscape.appear();
          lastSurfaceActive = active;
          setIsSurfaceActive(active);
          setSurfaceViewMode(viewMode);
        },
        onDeepSpaceChange: (id) => {
          if (id) soundscape.appear();
          setActiveDeepSpaceId(id);
          if (id) setIsInfoHidden(false);
        },
      });
      engineRef.current = engine;
      // Label refs mount before the engine exists (it is created in this effect), so hand
      // over every label already in the DOM now.
      labelElementsRef.current.forEach((el, id) =>
        engine?.registerLabelElement(id, el),
      );
      engine.registerSunMarker(sunMarkerRef.current);
      engine.setShipMode(shipModeRef.current);
    } catch {
      setWebglError(true);
    }

    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Phones only: tell the engine which screen bands the panels cover so the focused planet,
  // moon or spacecraft stays fully visible in the free area. From `sm` up panels sit at the sides
  // and the desktop framing stays exactly as before.
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 639.98px)');
    let latest = { top: 0, bottom: 0 };
    const push = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (phone.matches) engine.setViewInsets(latest.top, latest.bottom);
      else engine.setViewInsets(0, 0);
    };
    const unsubscribe = subscribeViewInsets((insets) => {
      latest = insets;
      // Lets the phone bottom sheet cap its height below whatever covers the top (CSS guard)
      document.documentElement.style.setProperty('--ui-top', `${insets.top}px`);
      push();
    });
    phone.addEventListener('change', push);
    return () => {
      unsubscribe();
      phone.removeEventListener('change', push);
    };
  }, []);

  const [isWelcomeOpen, setIsWelcomeOpen] = useState(shouldShowWelcome);
  const handleCloseWelcome = useCallback(() => setIsWelcomeOpen(false), []);

  // "Modo nave": every trip goes through a hyperspace jump (WarpOverlay)
  const [isShipMode, setIsShipMode] = useState(readShipMode);
  const [warpRequest, setWarpRequest] = useState<WarpRequest | null>(null);
  const shipModeRef = useRef(isShipMode);
  shipModeRef.current = isShipMode;
  const warpIdRef = useRef(0);

  const handleToggleShipMode = useCallback(() => {
    setIsShipMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SHIP_MODE_KEY, next ? '1' : '0');
      } catch {
        // storage unavailable: the choice just isn't remembered
      }
      return next;
    });
  }, []);

  /** Runs `go` directly, or wrapped in a hyperspace jump when ship mode is on. */
  const travel = useCallback((label: string, go: () => void, target?: WarpTarget) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    soundscape.select();
    if (!shipModeRef.current || reducedMotion) {
      soundscape.travel();
      go();
      return;
    }
    soundscape.warp();
    setWarpRequest({ id: ++warpIdRef.current, label, go, target });
  }, []);

  // Always-on starship in the 3D view while ship mode is on
  useEffect(() => {
    engineRef.current?.setShipMode(isShipMode);
  }, [isShipMode]);

  // Sonido sintetizado (música ambiental + efectos): apagado por defecto, se recuerda la elección
  const [isSoundOn, setIsSoundOn] = useState(() => soundscape.isEnabled());
  useEffect(() => {
    soundscape.resumeOnFirstGesture();
    return soundscape.subscribe(setIsSoundOn);
  }, []);
  const handleToggleSound = useCallback(() => {
    soundscape.setEnabled(!soundscape.isEnabled());
  }, []);

  const handleWarpDone = useCallback((id: number) => {
    setWarpRequest((cur) => (cur && cur.id === id ? null : cur));
  }, []);

  const handleSelectBody = useCallback(
    (id: CelestialBodyId, context?: ActiveSearchAnswer) => {
      setSearchAnswer(context ?? null);
      setIsPlanetInfoOpen(Boolean(context));
      travel(bodyName(id), () => engineRef.current?.flyToBody(id), warpTargetFor(id));
    },
    [travel],
  );

  const handleSelectMoon = useCallback(
    (bodyId: CelestialBodyId, moonId: string, context?: ActiveSearchAnswer) => {
      setSearchAnswer(context ?? null);
      setIsPlanetInfoOpen(Boolean(context));
      const moonName =
        CELESTIAL_BODIES.find((b) => b.id === bodyId)?.moons.find((m) => m.id === moonId)?.name ??
        moonId;
      travel(moonName, () => engineRef.current?.flyToMoon(bodyId, moonId), warpTargetFor(bodyId, moonId));
    },
    [travel],
  );

  const handleSelectMission = useCallback(
    (mission: AbandonedMission, context?: ActiveSearchAnswer) => {
      setSearchAnswer(context ?? null);
      setIsInfoHidden(false);
      travel(
        mission.name,
        () => engineRef.current?.flyToMission(mission),
        warpTargetFor(mission.targetBodyId, mission.targetMoonId),
      );
    },
    [travel],
  );

  const handleSelectDeepSpace = useCallback(
    (id: DeepSpaceTargetId, context?: ActiveSearchAnswer) => {
      setSearchAnswer(context ?? null);
      setIsInfoHidden(false);
      const target = DEEP_SPACE_TARGETS.find((d) => d.id === id);
      travel(target?.name ?? id, () => engineRef.current?.flyToDeepSpace(id), {
        color: target?.accentColor ?? '#c4b5fd',
        glow: true,
      });
    },
    [travel],
  );

  /** A linked name in a librito / ficha: travel to that planet, moon or spacecraft. */
  const handleNavigateLink = useCallback(
    (target: LinkTarget) => {
      if (target.kind === 'mission') handleSelectMission(target.mission);
      else if (target.kind === 'moon') handleSelectMoon(target.bodyId, target.moonId);
      else handleSelectBody(target.bodyId);
    },
    [handleSelectBody, handleSelectMoon, handleSelectMission],
  );

  const handleSelectTourStep = useCallback(
    (step: GuidedTourStep) => {
      const { target } = step;
      if (target.kind === 'body') {
        handleSelectBody(target.bodyId);
      } else if (target.kind === 'moon') {
        handleSelectMoon(target.bodyId, target.moonId);
      } else if (target.kind === 'mission') {
        const mission = ABANDONED_MISSIONS.find(
          (m) => m.id === target.missionId,
        );
        if (mission) handleSelectMission(mission);
      } else if (target.kind === 'deepspace') {
        handleSelectDeepSpace(target.id);
      }
    },
    [
      handleSelectBody,
      handleSelectMoon,
      handleSelectMission,
      handleSelectDeepSpace,
    ],
  );

  const registerLabel = useCallback(
    (id: CelestialBodyId, el: HTMLElement | null) => {
      if (el) labelElementsRef.current.set(id, el);
      else labelElementsRef.current.delete(id);
      engineRef.current?.registerLabelElement(id, el);
    },
    [],
  );

  const registerSunMarker = useCallback((el: HTMLButtonElement | null) => {
    sunMarkerRef.current = el;
    engineRef.current?.registerSunMarker(el);
  }, []);

  const handleGoToSun = useCallback(() => {
    setIsInfoHidden(false);
    handleSelectBody('sun');
  }, [handleSelectBody]);

  const handleViewMilkyWay = useCallback(() => {
    handleSelectDeepSpace('milkyway');
  }, [handleSelectDeepSpace]);

  const handleChangeSurfaceView = useCallback((mode: SurfaceCameraMode) => {
    engineRef.current?.setSurfaceCameraMode(mode);
  }, []);

  const handleExitToOrbit = useCallback(() => {
    setIsInfoHidden(false);
    setSearchAnswer(null);
    if (activeDeepSpaceId) {
      engineRef.current?.resetToOverview();
    } else {
      engineRef.current?.exitSurfaceToBody();
    }
  }, [activeDeepSpaceId]);

  // X closes ONLY the text card — keeps the 3D spacecraft, planet, moon, or galaxy visible!
  const handleHideInfoPanel = useCallback(() => {
    setIsInfoHidden(true);
    setIsPlanetInfoOpen(false);
  }, []);

  const handleResetOverview = useCallback(() => {
    setIsInfoHidden(false);
    setIsPlanetInfoOpen(false);
    setSearchAnswer(null);
    setShowOrbits(true);
    engineRef.current?.setShowOrbits(true);
    engineRef.current?.resetToOverview();
  }, []);

  const handleReleaseCamera = useCallback(() => {
    engineRef.current?.releaseTracking();
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      engineRef.current?.setPaused(next);
      return next;
    });
  }, []);

  const handleToggleOrbits = useCallback(() => {
    setShowOrbits((prev) => {
      const next = !prev;
      engineRef.current?.setShowOrbits(next);
      if (selection !== null && next) {
        engineRef.current?.resetToOverview();
      }
      return next;
    });
  }, [selection]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.code === 'KeyH') {
        setIsDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePause]);

  const selectedBody = useMemo(
    () =>
      selection
        ? CELESTIAL_BODIES.find((b) => b.id === selection.bodyId) ?? null
        : null,
    [selection],
  );

  const selectedMoon = useMemo(() => {
    if (!selectedBody || !selection?.moonId) return null;
    return selectedBody.moons.find((m) => m.id === selection.moonId) ?? null;
  }, [selectedBody, selection]);

  const selectedMission = useMemo(() => {
    if (!selection?.missionId) return null;
    return (
      ABANDONED_MISSIONS.find((m) => m.id === selection.missionId) ?? null
    );
  }, [selection]);

  const selectedDeepSpace = useMemo(() => {
    if (!activeDeepSpaceId) return null;
    return (
      DEEP_SPACE_TARGETS.find((d) => d.id === activeDeepSpaceId) ?? null
    );
  }, [activeDeepSpaceId]);

  const activeTargetKey = useMemo(() => {
    if (selectedMission) return `mission:${selectedMission.id}`;
    if (selectedDeepSpace) return `deepspace:${selectedDeepSpace.id}`;
    if (selectedBody && selectedMoon)
      return `moon:${selectedBody.id}:${selectedMoon.id}`;
    if (selectedBody) return `body:${selectedBody.id}`;
    return null;
  }, [selectedMission, selectedDeepSpace, selectedBody, selectedMoon]);

  const activeSearchContext = useMemo(() => {
    if (!searchAnswer || !activeTargetKey) return null;
    if (searchAnswer.targetKey !== activeTargetKey) return null;
    return { headline: searchAnswer.headline, answer: searchAnswer.answer };
  }, [searchAnswer, activeTargetKey]);

  const hasActiveDossier = Boolean(selectedMission || selectedDeepSpace);

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-[#010204]">
      {/* Dedicated isolated WebGL canvas mount */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full"
        aria-label="Simulador espacial 3D en tiempo real Travix 3D"
      />

      {webglError && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#04060D] p-6">
          <div className="max-w-md rounded-xl border border-white/12 bg-[#0B0E17] p-6 text-center">
            <h1 className="font-display text-xl font-semibold text-white">
              No se pudo inicializar WebGL
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Tu navegador no tiene habilitada la aceleración gráfica 3D para
              ejecutar el simulador espacial.
            </p>
          </div>
        </div>
      )}

      {/* Clean Travel: projected planet labels appear strictly in Overview mode */}
      <PlanetLabels
        hoveredId={hoveredId}
        onSelect={handleSelectBody}
        registerLabel={registerLabel}
      />

      {/* The Sun as universal reference, visible from every view */}
      <SunMarker onGo={handleGoToSun} markerRef={registerSunMarker} />
      <MemoNearbyObjects
        selection={activeDeepSpaceId ? null : selection}
        onGoBody={handleSelectBody}
        onGoMoon={handleSelectMoon}
        onGoMission={handleSelectMission}
      />

      {/* Minimalist Top-Left Brand Logo + Guided NASA Tours Trigger */}
      <header
        ref={headerRef}
        className="fixed top-2.5 left-2 sm:left-4 z-20 flex items-center gap-2 sm:gap-3 pointer-events-none"
      >
        <h1 className="m-0 flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsWelcomeOpen(true)}
            aria-label={`Travix 3D · Acerca del equipo ${TEAM_NAME}`}
            title={`Creado por el equipo ${TEAM_NAME}`}
            className="pointer-events-auto rounded-lg cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <img
              src="/travix-logo.png"
              alt="Travix 3D"
              className="h-9 sm:h-10 w-auto object-contain select-none drop-shadow-[0_2px_12px_rgba(255,255,255,0.22)]"
              draggable={false}
            />
          </button>
        </h1>
        <MemoGuidedTourBar
          onSelectStep={handleSelectTourStep}
          onOpenSearch={handleOpenSearch}
          onCardOpenChange={setIsTourCardOpen}
        />
      </header>

      {/* PWA Offline Status & Install Controls */}
      <MemoPWAControls />

      {/* Top-Right Round Search Trigger & Space Explorer */}
      <MemoMissionSearch
        isOpen={isSearchOpen}
        activeTab={searchTab}
        onOpenChange={setIsSearchOpen}
        onTabChange={setSearchTab}
        activeMissionId={selectedMission?.id ?? null}
        activeBodyId={selectedBody?.id ?? null}
        activeDeepSpaceId={activeDeepSpaceId}
        onSelectMission={handleSelectMission}
        onSelectBody={handleSelectBody}
        onSelectMoon={handleSelectMoon}
        onSelectDeepSpace={handleSelectDeepSpace}
      />

      {/* Restore Ficha / Search buttons when user closes X on Mission / Deep Space dossier */}
      {isInfoHidden && hasActiveDossier && (
        <div className="travix-mobile-sheet fixed top-14 left-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInfoHidden(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-full travix-glass-bar text-xs text-slate-100 hover:text-white transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Ver ficha</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleOpenSearch(
                selectedMission
                  ? 'surface'
                  : selectedDeepSpace
                    ? 'galaxy'
                    : 'planets',
              )
            }
            aria-label="Buscar otro destino"
            title="Buscar planetas, misiones o galaxia"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-full travix-glass-bar text-xs text-slate-100 hover:text-white transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Buscar</span>
          </button>
        </div>
      )}

      {/* Left-Side Compact Mission / Deep Space Dossier & 3D Rover/POV Switcher */}
      {(selectedMission || selectedDeepSpace) && !isInfoHidden && (
        <MemoMissionDossier
          mission={selectedMission}
          deepSpaceTarget={selectedDeepSpace}
          searchContext={activeSearchContext}
          isSunlit={isSiteSunlit}
          isSurfaceActive={isSurfaceActive}
          surfaceViewMode={surfaceViewMode}
          onChangeSurfaceView={handleChangeSurfaceView}
          onViewMilkyWay={handleViewMilkyWay}
          onExitToOrbit={handleExitToOrbit}
          onOpenSearch={handleOpenSearch}
          onClose={handleHideInfoPanel}
          startMinimized={isPhone && isTourCardOpen}
          onNavigateLink={handleNavigateLink}
        />
      )}

      {/* Minimalist 98% Glassmorphism Bottom Control Bar */}
      <ControlDock
        selectedBody={selectedBody}
        selectedMoon={selectedMoon}
        selectedMission={selectedMission}
        isPlanetInfoOpen={isPlanetInfoOpen}
        searchContext={activeSearchContext}
        cameraMode={cameraMode}
        simEpochMs={simEpochMs}
        isPaused={isPaused}
        showOrbits={showOrbits}
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
        onTogglePlanetInfo={() => setIsPlanetInfoOpen((prev) => !prev)}
        onHidePanel={() => setIsPlanetInfoOpen(false)}
        onOpenSearch={handleOpenSearch}
        onSelectBody={handleSelectBody}
        onSelectMoon={handleSelectMoon}
        onResetOverview={handleResetOverview}
        onReleaseCamera={handleReleaseCamera}
        onTogglePause={handleTogglePause}
        onToggleOrbits={handleToggleOrbits}
        isShipMode={isShipMode}
        onToggleShipMode={handleToggleShipMode}
        isSoundOn={isSoundOn}
        onToggleSound={handleToggleSound}
        onNavigateLink={handleNavigateLink}
      />

      {isWelcomeOpen && <WelcomeCredits onClose={handleCloseWelcome} />}

      {isShipMode && (
        <Suspense fallback={null}>
          <WarpOverlay request={warpRequest} onDone={handleWarpDone} />
        </Suspense>
      )}
    </main>
  );
}
