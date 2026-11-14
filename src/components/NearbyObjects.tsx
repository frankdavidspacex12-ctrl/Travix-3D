import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  CELESTIAL_BODIES,
  CelestialBodyData,
  CelestialBodyId,
} from '../data/solarSystemData';
import { ABANDONED_MISSIONS, AbandonedMission } from '../data/abandonedMissionsData';
import type { FocusSelection } from '../three/SolarSystemEngine';

/** A quick-travel shortcut to a gravitationally related object */
export interface NearbyTarget {
  key: string;
  name: string;
  /** Why it is listed (tooltip / accessible label) */
  relation: string;
  color: string;
  bodyId: CelestialBodyId;
  moonId?: string;
  missionId?: string;
}

const MAX_ITEMS = 5;
const MAJOR_PLANETS: CelestialBodyId[] = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
];

/**
 * Human-made landmarks shown as a reference around a planet and its moons
 * (e.g. the ISS when looking at the Earth or the Moon).
 */
const REFERENCE_MISSIONS: Partial<Record<CelestialBodyId, string[]>> = {
  earth: ['iss'],
};

function referenceMissionTargets(bodyId: CelestialBodyId, skipMissionId?: string): NearbyTarget[] {
  const ids = REFERENCE_MISSIONS[bodyId] ?? [];
  return ids
    .filter((id) => id !== skipMissionId)
    .map((id) => ABANDONED_MISSIONS.find((m) => m.id === id))
    .filter((m): m is AbandonedMission => Boolean(m))
    .map((m) => ({
      key: `mission:${m.id}`,
      name: m.id === 'iss' ? 'ISS' : m.name,
      relation: `${m.name} · ${m.destinationLabel}`,
      color: m.accentColor,
      bodyId: m.targetBodyId,
      missionId: m.id,
    }));
}

const bodiesById = new Map(CELESTIAL_BODIES.map((b) => [b.id, b]));
const orbitingBodies = CELESTIAL_BODIES.filter((b) => b.id !== 'sun').sort(
  (a, b) => a.semiMajorAxisAu - b.semiMajorAxisAu,
);

function bodyTarget(body: CelestialBodyData, relation: string): NearbyTarget {
  return {
    key: `body:${body.id}`,
    name: body.name,
    relation,
    color: body.accentColor,
    bodyId: body.id,
  };
}

/** Main moons first (largest radius), excluding the one the user is already on */
function moonTargets(body: CelestialBodyData, max: number, skipMoonId?: string): NearbyTarget[] {
  return [...body.moons]
    .filter((m) => m.id !== skipMoonId)
    .sort((a, b) => b.radius - a.radius)
    .slice(0, max)
    .map((m) => ({
      key: `moon:${m.id}`,
      name: m.name,
      relation: `Luna de ${body.name}`,
      color: body.accentColor,
      bodyId: body.id,
      moonId: m.id,
    }));
}

/**
 * Orbital neighbours around the Sun: the closest major planet inward and outward. Small bodies
 * (Eros, Ceres, comets, dwarf planets) get the major planets around them, or the nearest small
 * body where no major planet exists on that side (Pluto, Eris).
 */
function neighbourTargets(body: CelestialBodyData): NearbyTarget[] {
  const a = body.semiMajorAxisAu;
  const isMajor = MAJOR_PLANETS.includes(body.id);
  const pool = orbitingBodies.filter((b) => b.id !== body.id);
  const majors = pool.filter((b) => MAJOR_PLANETS.includes(b.id));

  const pick = (side: 'in' | 'out'): CelestialBodyData | undefined => {
    const onSide = (b: CelestialBodyData) =>
      side === 'in' ? b.semiMajorAxisAu < a : b.semiMajorAxisAu > a;
    const closest = (list: CelestialBodyData[]) =>
      list
        .filter(onSide)
        .sort((x, y) => Math.abs(x.semiMajorAxisAu - a) - Math.abs(y.semiMajorAxisAu - a))[0];
    return closest(majors) ?? (isMajor ? undefined : closest(pool));
  };

  const out: NearbyTarget[] = [];
  const inner = pick('in');
  const outer = pick('out');
  if (inner) out.push(bodyTarget(inner, `Vecino orbital hacia el Sol (${inner.stats.distanceAu})`));
  if (outer) out.push(bodyTarget(outer, `Vecino orbital hacia afuera (${outer.stats.distanceAu})`));
  return out;
}

/**
 * Objects gravitationally related to the current focus, nearest in the hierarchy first:
 * the body it orbits, its sibling moons, then the neighbouring planets around the Sun.
 * (The Sun itself has its own always-on marker.)
 */
export function getNearbyTargets(selection: FocusSelection | null): NearbyTarget[] {
  if (!selection) return [];
  const body = bodiesById.get(selection.bodyId);
  if (!body) return [];

  const items: NearbyTarget[] = [];
  const mission = selection.missionId
    ? ABANDONED_MISSIONS.find((m) => m.id === selection.missionId)
    : undefined;

  if (body.id === 'sun') {
    items.push(
      ...orbitingBodies
        .filter((b) => MAJOR_PLANETS.includes(b.id))
        .slice(0, 3)
        .map((b) => bodyTarget(b, `Planeta en órbita del Sol (${b.stats.distanceAu})`)),
    );
  } else if (mission?.sunDistanceAu) {
    // Probes leaving the Solar System: only the Sun still holds them (its marker covers that);
    // offer the last planet they flew by.
    items.push(bodyTarget(body, 'Último planeta que visitó'));
  } else if (mission) {
    const moon = mission.targetMoonId
      ? body.moons.find((m) => m.id === mission.targetMoonId)
      : undefined;
    if (moon) {
      items.push({
        key: `moon:${moon.id}`,
        name: moon.name,
        relation: mission.missionRole === 'surface' ? 'Luna donde se encuentra' : 'Luna que orbita',
        color: body.accentColor,
        bodyId: body.id,
        moonId: moon.id,
      });
      items.push(bodyTarget(body, `Planeta de ${moon.name}`));
      items.push(...referenceMissionTargets(body.id, mission.id));
    } else {
      items.push(
        bodyTarget(
          body,
          mission.missionRole === 'surface' ? 'Planeta donde se encuentra' : 'Planeta que orbita',
        ),
      );
    }
    items.push(...moonTargets(body, 2, moon?.id));
    items.push(...referenceMissionTargets(body.id, mission.id));
    items.push(...neighbourTargets(body));
  } else if (selection.moonId) {
    items.push(bodyTarget(body, 'Planeta que orbita esta luna'));
    items.push(...referenceMissionTargets(body.id));
    items.push(...moonTargets(body, 2, selection.moonId));
    items.push(...neighbourTargets(body));
  } else {
    items.push(...moonTargets(body, 3));
    items.push(...referenceMissionTargets(body.id));
    items.push(...neighbourTargets(body));
  }

  const seen = new Set<string>();
  return items
    .filter((it) => {
      if (seen.has(it.key)) return false;
      seen.add(it.key);
      return true;
    })
    .slice(0, MAX_ITEMS);
}

interface NearbyObjectsProps {
  selection: FocusSelection | null;
  onGoBody: (id: CelestialBodyId) => void;
  onGoMoon: (bodyId: CelestialBodyId, moonId: string) => void;
  onGoMission: (mission: AbandonedMission) => void;
}

/**
 * Small, unobtrusive "Cerca" list of quick-travel shortcuts (top-right, under the round buttons).
 * Collapsible to its header like every other small menu.
 */
export const NearbyObjects: React.FC<NearbyObjectsProps> = ({ selection, onGoBody, onGoMoon, onGoMission }) => {
  const [collapsed, setCollapsed] = useState(false);
  const items = useMemo(() => getNearbyTargets(selection), [selection]);
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Objetos cercanos"
      className="fixed top-16 right-2 sm:right-4 z-[14] flex flex-col items-end gap-1 pointer-events-none"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        title={collapsed ? 'Mostrar objetos cercanos' : 'Ocultar objetos cercanos'}
        className="pointer-events-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full travix-chip text-[9px] font-semibold uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        <span>Cerca</span>
        {collapsed ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
      </button>
      {!collapsed &&
        items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => {
              const mission = it.missionId
                ? ABANDONED_MISSIONS.find((m) => m.id === it.missionId)
                : undefined;
              if (mission) onGoMission(mission);
              else if (it.moonId) onGoMoon(it.bodyId, it.moonId);
              else onGoBody(it.bodyId);
            }}
            title={`${it.name} · ${it.relation}. Toca para ir.`}
            aria-label={`Ir a ${it.name} (${it.relation})`}
            className="pointer-events-auto inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full travix-chip text-[10px] font-medium text-slate-100 whitespace-nowrap hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <span
              className={`shrink-0 ${it.missionId ? 'w-1.5 h-1.5 rotate-45' : it.moonId ? 'w-1 h-1 rounded-full' : 'w-1.5 h-1.5 rounded-full'}`}
              style={{ backgroundColor: it.moonId ? '#cbd5e1' : it.color }}
              aria-hidden="true"
            />
            <span>{it.name}</span>
          </button>
        ))}
    </nav>
  );
};

export const MemoNearbyObjects = React.memo(NearbyObjects);
