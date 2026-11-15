// Cómo llegó a la superficie cada misión (para la animación de descenso).
// Se agrupa por tipo de nave: las del mismo tipo aterrizaron igual. Datos de las páginas de misión
// de la NASA (science.nasa.gov) y del NSSDCA; textos cortos para público escolar.
import type { AbandonedMission } from './abandonedMissionsData';

export type LandingMethod =
  | 'skycrane'
  | 'airbags'
  | 'retro_mars'
  | 'apollo'
  | 'retro_moon'
  | 'titan'
  | 'venus'
  | 'comet'
  | 'asteroid';

/** Mundo donde ocurre el descenso: decide el cielo, el suelo y si hay aire para frenar. */
export type LandingWorld = 'mars' | 'moon' | 'titan' | 'venus' | 'comet' | 'asteroid';

export interface LandingInfo {
  method: LandingMethod;
  world: LandingWorld;
  /** Nombre corto del método («Grúa espacial») */
  title: string;
  /** Una o dos frases para escolares */
  text: string;
}

const METHOD_BY_CRAFT: Record<string, { method: LandingMethod; title: string; text: string }> = {
  rover_msl: {
    method: 'skycrane',
    title: 'Grúa espacial',
    text: 'Escudo térmico al rojo vivo, un paracaídas enorme y, al final, una grúa con cohetes que bajó el rover colgado de cables y luego se alejó volando.',
  },
  heli_ingenuity: {
    method: 'skycrane',
    title: 'Grúa espacial',
    text: 'Viajó plegado bajo la panza de Perseverance, que bajó colgado de cables desde una grúa con cohetes.',
  },
  rover_mer: {
    method: 'airbags',
    title: 'Bolsas de aire',
    text: 'Escudo térmico, paracaídas y retrocohetes; después cayó envuelto en bolsas de aire que rebotaron por el suelo hasta detenerse.',
  },
  rover_sojourner: {
    method: 'airbags',
    title: 'Bolsas de aire',
    text: 'Viajó dentro de Mars Pathfinder, que cayó envuelto en bolsas de aire y rebotó por el suelo hasta detenerse.',
  },
  lander_pathfinder: {
    method: 'airbags',
    title: 'Bolsas de aire',
    text: 'Escudo térmico, paracaídas y retrocohetes; después cayó envuelto en bolsas de aire que rebotaron por el suelo hasta detenerse.',
  },
  lander_viking: {
    method: 'retro_mars',
    title: 'Paracaídas y retrocohetes',
    text: 'Escudo térmico, paracaídas y, al final, retrocohetes para posarse suavemente sobre sus tres patas.',
  },
  lander_phoenix: {
    method: 'retro_mars',
    title: 'Paracaídas y retrocohetes',
    text: 'Escudo térmico, paracaídas y, al final, retrocohetes para posarse suavemente sobre sus tres patas.',
  },
  lander_solar: {
    method: 'retro_mars',
    title: 'Paracaídas y retrocohetes',
    text: 'Escudo térmico, paracaídas y, al final, retrocohetes para posarse suavemente sobre sus tres patas.',
  },
  lander_apollo: {
    method: 'apollo',
    title: 'Motor de descenso pilotado',
    text: 'En la Luna no hay aire para frenar: los astronautas pilotaron el módulo lunar y su motor de descenso frenó la caída hasta posarse.',
  },
  lander_apollo_lrv: {
    method: 'apollo',
    title: 'Motor de descenso pilotado',
    text: 'En la Luna no hay aire para frenar: los astronautas pilotaron el módulo lunar y su motor de descenso frenó la caída hasta posarse.',
  },
  rover_lrv: {
    method: 'apollo',
    title: 'Plegado en el módulo lunar',
    text: 'Viajó plegado en un costado del módulo lunar, que bajó frenando con su motor; los astronautas lo desplegaron en el suelo.',
  },
  package_alsep: {
    method: 'apollo',
    title: 'A bordo del módulo lunar',
    text: 'Viajó guardado en el módulo lunar, que bajó frenando con su motor; los astronautas lo instalaron a mano en el suelo.',
  },
  lander_surveyor: {
    method: 'retro_moon',
    title: 'Retrocohete',
    text: 'En la Luna no hay aire para frenar: un retrocohete potente frenó casi toda la caída y pequeños motores lo posaron suavemente.',
  },
  rover_lunokhod: {
    method: 'retro_moon',
    title: 'Etapa con retrocohetes',
    text: 'Bajó sobre una plataforma soviética Luna que frenó con retrocohetes; después el rover rodó al suelo por unas rampas.',
  },
  lander_huygens: {
    method: 'titan',
    title: 'Paracaídas en la neblina',
    text: 'Atravesó la espesa neblina naranja de Titán colgado de paracaídas durante unas dos horas y media.',
  },
  lander_venera: {
    method: 'venus',
    title: 'Paracaídas y disco de frenado',
    text: 'Usó paracaídas en las nubes altas; después cayó frenado solo por un disco metálico alrededor de la nave, porque el aire de Venus es muy denso.',
  },
  lander_philae: {
    method: 'comet',
    title: 'Caída libre y rebotes',
    text: 'Rosetta lo soltó y cayó durante unas 7 horas; sus arpones no se dispararon y rebotó dos veces antes de quedar junto a un acantilado.',
  },
  probe_near: {
    method: 'asteroid',
    title: 'Descenso con propulsores',
    text: 'Era una nave orbital: con pequeños empujes de sus propulsores bajó despacio hasta posarse sobre el asteroide Eros.',
  },
};

function worldFor(m: AbandonedMission): LandingWorld | null {
  if (m.targetMoonId === 'luna') return 'moon';
  if (m.targetMoonId === 'titan') return 'titan';
  if (m.targetBodyId === 'mars') return 'mars';
  if (m.targetBodyId === 'venus') return 'venus';
  if (m.targetBodyId === 'comet67p') return 'comet';
  if (m.targetBodyId === 'eros') return 'asteroid';
  return null;
}

/** Cómo aterrizó la misión, o null si no es de superficie o no hay datos. */
export function getLandingInfo(m: AbandonedMission): LandingInfo | null {
  if (m.missionRole !== 'surface') return null;
  const base = METHOD_BY_CRAFT[m.craftType];
  const world = worldFor(m);
  if (!base || !world) return null;
  return { ...base, world };
}
