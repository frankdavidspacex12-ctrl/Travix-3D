/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fragment, lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, FileText, GraduationCap, HelpCircle, Search, Sun } from 'lucide-react';
import { MemoNearbyObjects } from './components/NearbyObjects';
import { DescentOverlay, type DescentRequest } from './components/DescentOverlay';
import { getLandingInfo } from './data/landingMethods';
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
import { FocusSelection, MAX_COMPANION_LABELS, MAX_SURFACE_LABELS, SolarSystemEngine } from './three/SolarSystemEngine';
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
import {
  markWelcomeShownThisSession,
  shouldShowWelcomeThisSession,
  TEAM_NAME,
  WelcomeCredits,
} from './components/WelcomeCredits';
import { shouldShowTutorial, WelcomeTutorial } from './components/WelcomeTutorial';
import { subscribeViewInsets, useViewInset } from './ui/viewInsets';
import type { WarpRequest } from './components/WarpOverlay';
import { soundscape } from './audio/soundscape';
import type { WarpTarget } from './three/warpScene';
import type { LinkTarget } from './components/LinkedText';
import { getLang, setLang, tr, useLang } from './i18n';
import { localizeAnswer } from './i18n/data';
import type { SpaceAnswerResult } from './data/spaceKnowledgeSearch';

// Hyperspace jump of "Modo nave": its own chunk, loaded only when ship mode is turned on
const WarpOverlay = lazy(() => import('./components/WarpOverlay'));
const QuizPanel = lazy(() => import('./components/QuizPanel'));
const ColombiansPanel = lazy(() => import('./components/ColombiansPanel'));
const VoiceAssistant = lazy(() => import('./components/VoiceAssistant'));
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
  // Sus lunas principales viajan junto al destino (las más grandes primero, hasta 4)
  const companions = [...body.moons]
    .sort((a, b) => b.radius - a.radius)
    .slice(0, 4)
    .map((m) => ({ texture: m.textureUrl, color: '#cbd5e1', size: m.radius / body.visualRadius }));
  const rings = body.rings
    ? {
        inner: body.rings.innerMultiplier,
        outer: body.rings.outerMultiplier,
        opacity: body.rings.opacity,
        saturn: body.rings.hasCassiniDetail,
      }
    : undefined;
  return { texture: body.textures.map, color: body.accentColor, glow: body.id === 'sun', companions, rings };
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
      aria-label={tr('Ir al Sol, referencia del Sistema Solar', 'Go to the Sun, the Solar System reference')}
      title={tr('El Sol: referencia universal del Sistema Solar. Toca para ir.', 'The Sun: the universal reference of the Solar System. Tap to go.')}
      style={{ opacity: 0, pointerEvents: 'none' }}
      className="fixed top-0 left-0 z-[15] inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full travix-chip border-amber-300/30 text-[10px] font-medium text-slate-100 whitespace-nowrap cursor-pointer transition-opacity duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-400"
    >
      <span data-sun-arrow className="inline-flex shrink-0">
        <ArrowRight className="w-3 h-3 text-amber-300/90" />
      </span>
      <Sun className="w-3 h-3 text-amber-300 shrink-0" />
      <span data-sun-text className="font-mono-tabular">
        {tr('Sol', 'Sun')}
      </span>
    </button>
  );
});

interface CompanionLabelProps {
  index: number;
  onGo: (bodyId: CelestialBodyId, moonId: string) => void;
  labelRef: (index: number, el: HTMLButtonElement | null) => void;
}

/**
 * Etiqueta de una luna principal del planeta que se mira (la Luna, Fobos, Ío...). El motor la
 * coloca bajo la luna, o en el borde con una flecha si no está a la vista, y escribe en
 * data-body-id / data-moon-id a cuál apunta.
 */
const CompanionLabel = memo(function CompanionLabel({ index, onGo, labelRef }: CompanionLabelProps) {
  return (
    <button
      ref={(el) => labelRef(index, el)}
      type="button"
      onClick={(e) => {
        const { bodyId, moonId } = e.currentTarget.dataset;
        // Sin luna = la etiqueta señala al planeta (cuando se está parado en una de sus lunas)
        if (bodyId) onGo(bodyId as CelestialBodyId, moonId ?? '');
      }}
      aria-label={tr('Ir a la luna', 'Go to the moon')}
      title={tr('La luna en su posición real. Toca para ir.', 'The moon at its real position. Tap to go.')}
      style={{ opacity: 0, pointerEvents: 'none' }}
      className="fixed top-0 left-0 z-[15] inline-flex flex-col items-center gap-0 text-[10px] font-medium text-slate-100 whitespace-nowrap cursor-pointer transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-amber-400"
    >
      <span data-companion-tick aria-hidden="true" className="block w-px h-2.5 bg-slate-200/70" />
      <span className="travix-chip rounded-full px-2 py-0.5 hover:text-white inline-flex items-center gap-1">
        <span data-companion-arrow aria-hidden="true" className="inline-flex shrink-0" style={{ display: 'none' }}>
          <ArrowRight className="w-3 h-3 text-slate-200/90" />
        </span>
        <span>
          <span data-companion-text>☾</span>
        </span>
      </span>
    </button>
  );
});

interface SurfaceLabelProps {
  index: number;
  onGo: (missionId: string) => void;
  labelRef: (index: number, el: HTMLButtonElement | null) => void;
}

/**
 * Nombre de una misión sobre la superficie del planeta o la luna que se mira, justo debajo de su
 * punto; el motor la coloca y escribe en data-mission-id a cuál apunta. Tocarla lleva a la misión.
 */
const SurfaceLabel = memo(function SurfaceLabel({ index, onGo, labelRef }: SurfaceLabelProps) {
  return (
    <button
      ref={(el) => labelRef(index, el)}
      type="button"
      onClick={(e) => {
        const id = e.currentTarget.dataset.missionId;
        if (id) onGo(id);
      }}
      aria-label={tr('Ir a la misión', 'Go to the mission')}
      style={{ opacity: 0, pointerEvents: 'none' }}
      className="fixed top-0 left-0 z-[15] rounded-full travix-chip px-1.5 py-px text-[9px] font-medium text-amber-100 whitespace-nowrap max-w-[9.5rem] truncate cursor-pointer transition-opacity duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-400"
    >
      <span data-surface-text></span>
    </button>
  );
});

export default function App() {
  // Idioma (inglés por defecto): al cambiarlo se vuelve a montar la interfaz, no el lienzo 3D
  const lang = useLang();
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SolarSystemEngine | null>(null);
  const labelElementsRef = useRef(new Map<CelestialBodyId, HTMLElement>());
  const headerRef = useRef<HTMLElement | null>(null);
  const sunMarkerRef = useRef<HTMLButtonElement | null>(null);
  const companionLabelRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const surfaceLabelRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useViewInset('app-header', headerRef, 'top');

  const [selection, setSelection] = useState<FocusSelection | null>(null);
  // Animación «Así aterrizó» al entrar en una misión de superficie
  const [descent, setDescent] = useState<DescentRequest | null>(null);
  const descentIdRef = useRef(0);
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

  // The librito (planet / moon panel) opens by itself every time the camera arrives at a body.
  // Read from the engine's arrival callback, so the latest values live in refs.
  const [planetInfoRequest, setPlanetInfoRequest] = useState({ id: 0, minimized: false });
  const arrivalContextRef = useRef({ selection, activeDeepSpaceId, isPhone, isTourCardOpen });
  arrivalContextRef.current = { selection, activeDeepSpaceId, isPhone, isTourCardOpen };

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
        // Sonido de llegada cuando la cámara termina el viaje, y el librito se abre solo
        onArrive: () => {
          soundscape.arrive();
          const ctx = arrivalContextRef.current;
          // Missions have their own ficha; deep-space views have no librito
          if (!ctx.selection || ctx.selection.missionId || ctx.activeDeepSpaceId) return;
          setIsDockCollapsed(false);
          setIsPlanetInfoOpen(true);
          // Phones with the guide card open: slim bar, so the planet stays in view (one tap opens it)
          setPlanetInfoRequest((r) => ({
            id: r.id + 1,
            minimized: ctx.isPhone && ctx.isTourCardOpen,
          }));
        },
        onSurfaceModeChange: (active, viewMode) => {
          if (active && !lastSurfaceActive) {
            soundscape.appear();
            // «Así aterrizó»: cómo llegó de verdad esta misión (se omite con «reducir movimiento»)
            const missionId = arrivalContextRef.current.selection?.missionId;
            const mission = missionId ? ABANDONED_MISSIONS.find((m) => m.id === missionId) : undefined;
            const landing = mission ? getLandingInfo(mission) : null;
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (mission && landing && !reduced) {
              setDescent({ id: ++descentIdRef.current, mission, landing });
            }
          }
          if (!active) setDescent(null);
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
      companionLabelRefs.current.forEach((el, i) => engine?.registerCompanionLabel(i, el));
      surfaceLabelRefs.current.forEach((el, i) => engine?.registerSurfaceLabel(i, el));
      engine.setShipMode(shipModeRef.current);
    } catch {
      setWebglError(true);
    }

    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Tell the engine which screen bands the panels cover so the focused planet, moon or spacecraft
  // stays fully visible in the free area. Phones: always. Desktop: only the bottom band while the
  // librito is open (it opens by itself on arrival); otherwise the desktop framing is unchanged.
  const isLibritoShown = isPlanetInfoOpen && !isDockCollapsed && !selection?.missionId;
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 639.98px)');
    let latest = { top: 0, bottom: 0 };
    const push = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (phone.matches) engine.setViewInsets(latest.top, latest.bottom);
      else engine.setViewInsets(0, isLibritoShown ? latest.bottom : 0);
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
  }, [isLibritoShown]);

  // The team welcome opens every time the app is opened, but not again when the same tab
  // reloads (on phones the browser may reload a tab in the background)
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(shouldShowWelcomeThisSession);
  // Tutorial: first visit only, right after the welcome screen
  const [isTutorialOpen, setIsTutorialOpen] = useState(
    () => !shouldShowWelcomeThisSession() && shouldShowTutorial(),
  );
  const handleCloseWelcome = useCallback(() => {
    markWelcomeShownThisSession();
    setIsWelcomeOpen(false);
    if (shouldShowTutorial()) setIsTutorialOpen(true);
  }, []);
  const handleOpenTutorial = useCallback(() => setIsTutorialOpen(true), []);
  const handleCloseTutorial = useCallback(() => setIsTutorialOpen(false), []);
  // The tutorial points at the bottom controls: make sure they are showing
  useEffect(() => {
    if (isTutorialOpen) setIsDockCollapsed(false);
  }, [isTutorialOpen]);

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
  /**
   * `hostKey` = the body the destination is on / around ("earth:", "earth:luna"). When it is the
   * body the user is already at (Earth -> ISS, Mars -> a Martian rover), the ship flies there over
   * the planet in the 3D view itself: no hyperspace jump for a trip that never leaves the planet.
   */
  const travel = useCallback((label: string, go: () => void, target?: WarpTarget, hostKey?: string) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    soundscape.select();
    const here = arrivalContextRef.current;
    const currentHost =
      here.selection && !here.activeDeepSpaceId
        ? `${here.selection.bodyId}:${here.selection.moonId ?? ''}`
        : null;
    const sameBody = Boolean(hostKey && currentHost && hostKey === currentHost);
    if (!shipModeRef.current || reducedMotion || sameBody) {
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

  const handleDescentDone = useCallback((id: number) => {
    setDescent((cur) => (cur && cur.id === id ? null : cur));
  }, []);

  // While the jump covers the whole screen the 3D view skips drawing (it keeps simulating)
  const handleWarpCover = useCallback((covered: boolean) => {
    engineRef.current?.setRenderSuspended(covered);
  }, []);

  const handleWarpDone = useCallback((id: number) => {
    setWarpRequest((cur) => (cur && cur.id === id ? null : cur));
  }, []);

  const handleSelectBody = useCallback(
    (id: CelestialBodyId, context?: ActiveSearchAnswer) => {
      setSearchAnswer(context ?? null);
      setIsPlanetInfoOpen(Boolean(context));
      travel(bodyName(id), () => engineRef.current?.flyToBody(id), warpTargetFor(id), `${id}:`);
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
      travel(
        moonName,
        () => engineRef.current?.flyToMoon(bodyId, moonId),
        warpTargetFor(bodyId, moonId),
        `${bodyId}:${moonId}`,
      );
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
        // Probes in deep space are never "on" the planet they are listed under
        mission.missionRole === 'deepspace'
          ? undefined
          : `${mission.targetBodyId}:${mission.targetMoonId ?? ''}`,
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

  /** The voice assistant found a destination: same as choosing the search's direct answer. */
  const handleVoiceAnswer = useCallback(
    (res: SpaceAnswerResult) => {
      const t = res.target;
      const ctx = (key: string) => ({ targetKey: key, headline: res.headline, answer: res.answer });
      if (t.type === 'mission') handleSelectMission(t.mission, ctx(`mission:${t.mission.id}`));
      else if (t.type === 'moon') handleSelectMoon(t.bodyId, t.moonId, ctx(`moon:${t.bodyId}:${t.moonId}`));
      else if (t.type === 'body') handleSelectBody(t.bodyId, ctx(`body:${t.bodyId}`));
      else handleSelectDeepSpace(t.id, ctx(`deepspace:${t.id}`));
    },
    [handleSelectBody, handleSelectMoon, handleSelectMission, handleSelectDeepSpace],
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

  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isColombiansOpen, setIsColombiansOpen] = useState(false);
  const openColombians = useCallback(() => setIsColombiansOpen(true), []);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

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

  const registerSurfaceLabel = useCallback((index: number, el: HTMLButtonElement | null) => {
    surfaceLabelRefs.current[index] = el;
    engineRef.current?.registerSurfaceLabel(index, el);
  }, []);

  const handleGoToSurfaceMission = useCallback(
    (missionId: string) => {
      const mission = ABANDONED_MISSIONS.find((m) => m.id === missionId);
      if (mission) handleSelectMission(mission);
    },
    [handleSelectMission],
  );

  const registerCompanionLabel = useCallback((index: number, el: HTMLButtonElement | null) => {
    companionLabelRefs.current[index] = el;
    engineRef.current?.registerCompanionLabel(index, el);
  }, []);

  const handleGoToMoon = useCallback(
    (bodyId: CelestialBodyId, moonId: string) => {
      if (moonId) handleSelectMoon(bodyId, moonId);
      else handleSelectBody(bodyId);
    },
    [handleSelectMoon, handleSelectBody],
  );

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
    return localizeAnswer(searchAnswer.headline, searchAnswer.answer);
    // lang: the answer is shown again in the newly chosen language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchAnswer, activeTargetKey, lang]);

  const hasActiveDossier = Boolean(selectedMission || selectedDeepSpace);

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-[#010204]">
      {/* Dedicated isolated WebGL canvas mount */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full"
        aria-label={tr('Simulador espacial 3D en tiempo real Travix 3D', 'Travix 3D real-time 3D space simulator')}
      />

      <Fragment key={lang}>

      {webglError && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#04060D] p-6">
          <div className="max-w-md rounded-xl border border-white/12 bg-[#0B0E17] p-6 text-center">
            <h1 className="font-display text-xl font-semibold text-white">
              {tr('No se pudo inicializar WebGL', 'WebGL could not start')}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {tr('Tu navegador no tiene habilitada la aceleración gráfica 3D para ejecutar el simulador espacial.', 'Your browser does not have 3D graphics acceleration enabled to run the space simulator.')}
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
      {Array.from({ length: MAX_SURFACE_LABELS }, (_, i) => (
        <SurfaceLabel key={'s' + i} index={i} onGo={handleGoToSurfaceMission} labelRef={registerSurfaceLabel} />
      ))}
      {Array.from({ length: MAX_COMPANION_LABELS }, (_, i) => (
        <CompanionLabel key={i} index={i} onGo={handleGoToMoon} labelRef={registerCompanionLabel} />
      ))}
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
            aria-label={`Travix 3D · ${tr('Acerca del equipo', 'About team')} ${TEAM_NAME}`}
            title={`${tr('Creado por el equipo', 'Created by team')} ${TEAM_NAME}`}
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
          onOpenColombians={openColombians}
        />
        <button
          type="button"
          onClick={handleOpenTutorial}
          data-tour="tutorial"
          aria-label={tr('Ver el tutorial de Travix 3D', 'Show the Travix 3D tutorial')}
          title={tr('Tutorial: aprende a usar Travix 3D', 'Tutorial: learn how to use Travix 3D')}
          className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center travix-glass-bar text-slate-100 hover:text-white hover:border-white/35 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setIsQuizOpen(true)}
          data-tour="quiz"
          aria-label={tr('Pon a prueba tus conocimientos', 'Test your knowledge')}
          title={tr('Pon a prueba tus conocimientos: 100 preguntas', 'Test your knowledge: 100 questions')}
          className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center travix-glass-bar text-slate-100 hover:text-white hover:border-white/35 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setLang(getLang() === 'en' ? 'es' : 'en')}
          lang={lang === 'en' ? 'es' : 'en'}
          aria-label={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
          title={lang === 'en' ? 'Ver en español' : 'View in English'}
          className="pointer-events-auto h-10 min-w-10 px-2.5 rounded-full flex items-center justify-center travix-glass-bar text-xs font-bold tracking-wide text-amber-300 hover:text-white hover:border-white/35 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          {lang === 'en' ? 'ES' : 'EN'}
        </button>
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
            <span>{tr('Ver ficha', 'View card')}</span>
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
            aria-label={tr('Buscar otro destino', 'Search another destination')}
            title={tr('Buscar planetas, misiones o galaxia', 'Search planets, missions or the galaxy')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-full travix-glass-bar text-xs text-slate-100 hover:text-white transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>{tr('Buscar', 'Search')}</span>
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
        onOpenVoice={() => setIsVoiceOpen(true)}
        selectedBody={selectedBody}
        selectedMoon={selectedMoon}
        selectedMission={selectedMission}
        isPlanetInfoOpen={isPlanetInfoOpen}
        planetInfoRequest={planetInfoRequest}
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

      {isTutorialOpen && !isWelcomeOpen && <WelcomeTutorial onClose={handleCloseTutorial} />}

      {isVoiceOpen && (
        <Suspense fallback={null}>
          <VoiceAssistant onClose={() => setIsVoiceOpen(false)} onNavigate={handleVoiceAnswer} />
        </Suspense>
      )}

      {isColombiansOpen && (
        <Suspense fallback={null}>
          <ColombiansPanel
            onClose={() => setIsColombiansOpen(false)}
            onGo={(target) =>
              handleSelectTourStep({ id: 'colombians', title: '', nasaBadge: '', narration: '', scienceFact: '', target })
            }
          />
        </Suspense>
      )}

      {isQuizOpen && (
        <Suspense fallback={null}>
          <QuizPanel
            onClose={() => setIsQuizOpen(false)}
            onGo={(target) =>
              handleSelectTourStep({ id: 'quiz', title: '', nasaBadge: '', narration: '', scienceFact: '', target })
            }
          />
        </Suspense>
      )}

      {isShipMode && (
        <Suspense fallback={null}>
          <WarpOverlay
            request={warpRequest}
            onDone={handleWarpDone}
            onCoverChange={handleWarpCover}
          />
        </Suspense>
      )}

      {/* Space Apps rule: AI-generated images must carry a visible watermark. The team starship
          (shown while ship mode is on, also over the hyperspace jump) was generated with AI. */}
      {isShipMode && (
        <div
          className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-[61] pointer-events-none select-none rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/40"
          role="note"
        >
          {tr('Nave generada con IA', 'AI-generated ship')}
        </div>
      )}

      {descent && (
        <DescentOverlay
          key={descent.id}
          request={descent}
          onDone={handleDescentDone}
          onCoverChange={handleWarpCover}
        />
      )}
      </Fragment>
    </main>
  );
}
