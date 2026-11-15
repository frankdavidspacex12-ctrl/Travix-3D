// A1 / D03: separar el equipo «dejado atrás» de las misiones que siguen activas, para no presentar
// una misión activa como abandonada. Se deriva del campo «status» del catálogo (verificado con NSSDCA).
import type { AbandonedMission } from './abandonedMissionsData';
import { tr } from '../i18n';

export type MissionState = 'leftBehind' | 'active' | 'destroyed';

export function getMissionState(m: AbandonedMission): MissionState {
  const s = m.status.trim();
  // Perseverance sigue activo (Ingenuity, que tiene su propia ficha, quedó atrás)
  if (/^activ/i.test(s) || /^perseverance: activ/i.test(s)) return 'active';
  // Cassini y Galileo se destruyeron a propósito en la atmósfera de su planeta: no quedó equipo
  if (/desintegrad|destroyed/i.test(s)) return 'destroyed';
  return 'leftBehind';
}

/** Texto de la insignia en el idioma actual. */
export function missionStateLabel(st: MissionState): string {
  if (st === 'active') return tr('Activo', 'Active');
  if (st === 'destroyed') return tr('Desintegrado a propósito', 'Intentionally destroyed');
  return tr('Dejado atrás', 'Left behind');
}

/** Clases de color para la insignia de cada estado. */
export const MISSION_STATE_STYLE: Record<MissionState, string> = {
  leftBehind: 'bg-amber-500/15 border-amber-400/40 text-amber-200',
  active: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200',
  destroyed: 'bg-slate-500/20 border-slate-400/40 text-slate-200',
};
