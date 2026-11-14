import React, { useMemo } from 'react';
import { ABANDONED_MISSIONS, AbandonedMission } from '../data/abandonedMissionsData';
import { CELESTIAL_BODIES, CelestialBodyId } from '../data/solarSystemData';

/** Where a linked word takes the user. */
export type LinkTarget =
  | { kind: 'body'; bodyId: CelestialBodyId; name: string }
  | { kind: 'moon'; bodyId: CelestialBodyId; moonId: string; name: string }
  | { kind: 'mission'; mission: AbandonedMission; name: string };

/**
 * Extra names a mission is called by in the texts (the card name is often longer, e.g.
 * "Phoenix Mars Lander" is written just "Phoenix").
 */
const MISSION_ALIASES: Record<string, string[]> = {
  perseverance: ['Perseverance'],
  curiosity: ['Curiosity'],
  opportunity: ['Opportunity'],
  spirit: ['Spirit'],
  insight: ['InSight'],
  sojourner: ['Sojourner'],
  pathfinder: ['Mars Pathfinder', 'Pathfinder'],
  phoenix: ['Phoenix'],
  viking1: ['Viking 1'],
  viking2: ['Viking 2'],
  ingenuity: ['Ingenuity'],
  mro: ['Mars Reconnaissance Orbiter', 'MRO'],
  // Not "Eagle" / "Intrepid": the texts also use them for Martian craters (Opportunity)
  apollo11: ['Apollo 11'],
  apollo12: ['Apollo 12'],
  apollo14: ['Apollo 14'],
  apollo15: ['Apollo 15'],
  apollo16: ['Apollo 16'],
  apollo17: ['Apollo 17'],
  lro: ['Lunar Reconnaissance Orbiter', 'LRO'],
  lunokhod1: ['Lunokhod 1', 'Lunokhod'],
  lunokhod2: ['Lunokhod 2'],
  surveyor1: ['Surveyor 1'],
  surveyor3: ['Surveyor 3'],
  surveyor5: ['Surveyor 5'],
  surveyor6: ['Surveyor 6'],
  surveyor7: ['Surveyor 7'],
  lrv1: ['LRV-1'],
  lrv2: ['LRV-2'],
  lrv3: ['LRV-3'],
  iss: ['Estación Espacial Internacional', 'ISS'],
  hubble: ['Hubble'],
  jwst: ['James Webb', 'JWST'],
  juno: ['Juno'],
  cassini: ['Cassini'],
  huygens: ['Huygens'],
  galileo: ['Galileo'],
  venera13: ['Venera 13'],
  messenger: ['MESSENGER'],
  rosetta_philae: ['Rosetta', 'Philae'],
  newhorizons: ['New Horizons'],
  pioneer10: ['Pioneer 10'],
  pioneer11: ['Pioneer 11'],
  kepler: ['Kepler'],
  spitzer: ['Spitzer'],
  osiris_rex: ['OSIRIS-REx', 'OSIRIS-APEX'],
  voyager1: ['Voyager 1'],
  voyager2: ['Voyager 2'],
  near_shoemaker: ['NEAR Shoemaker'],
  dawn: ['Dawn'],
};

/** Mentions that share a name with a craft but mean something else (text right before them). */
const IGNORE_BEFORE: Record<string, RegExp> = {
  // Juno carries aluminium figures of Galileo Galilei, Juno and Jupiter
  Galileo: /figuras de aluminio de\s*$/,
};

interface Entry {
  alias: string;
  target: LinkTarget;
}

function buildEntries(): Entry[] {
  const entries: Entry[] = [];
  for (const body of CELESTIAL_BODIES) {
    entries.push({ alias: body.name, target: { kind: 'body', bodyId: body.id, name: body.name } });
    for (const moon of body.moons) {
      entries.push({
        alias: moon.name,
        target: { kind: 'moon', bodyId: body.id, moonId: moon.id, name: moon.name },
      });
    }
  }
  for (const mission of ABANDONED_MISSIONS) {
    for (const alias of MISSION_ALIASES[mission.id] ?? []) {
      entries.push({ alias, target: { kind: 'mission', mission, name: mission.name } });
    }
  }
  return entries;
}

let cache: { regex: RegExp; byAlias: Map<string, LinkTarget> } | null = null;

function getIndex() {
  if (!cache) {
    const entries = buildEntries();
    const byAlias = new Map<string, LinkTarget>();
    for (const e of entries) if (!byAlias.has(e.alias)) byAlias.set(e.alias, e.target);
    const escaped = [...byAlias.keys()]
      .sort((a, b) => b.length - a.length)
      .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Whole words only (accents count as letters), case-sensitive: "Luna" but not "lunas"
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'gu');
    cache = { regex, byAlias };
  }
  return cache;
}

function sameTarget(a: LinkTarget, key: string | null): boolean {
  if (!key) return false;
  if (a.kind === 'mission') return key === `mission:${a.mission.id}`;
  if (a.kind === 'moon') return key === `moon:${a.bodyId}:${a.moonId}`;
  return key === `body:${a.bodyId}`;
}

interface LinkedTextProps {
  text: string;
  onNavigate: (target: LinkTarget) => void;
  /** Key of what is already on screen (`body:mars`, `moon:earth:moon`, `mission:iss`): not linked */
  currentKey?: string | null;
}

/**
 * Plain text where every planet, moon or spacecraft that exists in Travix becomes a link:
 * hover shows where it goes, click / tap travels there.
 */
export const LinkedText: React.FC<LinkedTextProps> = ({ text, onNavigate, currentKey = null }) => {
  const parts = useMemo(() => {
    const { regex, byAlias } = getIndex();
    const out: Array<string | { alias: string; target: LinkTarget }> = [];
    let last = 0;
    regex.lastIndex = 0;
    for (const m of text.matchAll(regex)) {
      const alias = m[1];
      const target = byAlias.get(alias);
      const start = m.index ?? 0;
      if (!target || sameTarget(target, currentKey)) continue;
      const ignore = IGNORE_BEFORE[alias];
      if (ignore && ignore.test(text.slice(Math.max(0, start - 40), start))) continue;
      if (start > last) out.push(text.slice(last, start));
      out.push({ alias, target });
      last = start + alias.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }, [text, currentKey]);

  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <React.Fragment key={i}>{part}</React.Fragment>
        ) : (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(part.target);
            }}
            title={`Ir a ${part.target.name}`}
            aria-label={`${part.alias}: ir a ${part.target.name}`}
            className="inline p-0 m-0 bg-transparent border-0 font-[inherit] text-[inherit] leading-[inherit] text-cyan-200 underline decoration-cyan-300/50 decoration-dotted underline-offset-2 hover:text-white hover:decoration-solid hover:decoration-cyan-200 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {part.alias}
          </button>
        ),
      )}
    </>
  );
};
