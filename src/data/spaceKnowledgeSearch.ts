import {
  ABANDONED_MISSIONS,
  AbandonedMission,
} from './abandonedMissionsData';
import {
  CELESTIAL_BODIES,
  CelestialBodyData,
  CelestialBodyId,
  DEEP_SPACE_TARGETS,
  DeepSpaceTarget,
  DeepSpaceTargetId,
  MoonData,
} from './solarSystemData';

export type SpaceTargetRef =
  | { type: 'mission'; mission: AbandonedMission }
  | { type: 'body'; bodyId: CelestialBodyId; body: CelestialBodyData }
  | {
      type: 'moon';
      bodyId: CelestialBodyId;
      moonId: string;
      body: CelestialBodyData;
      moon: MoonData;
    }
  | { type: 'deepspace'; id: DeepSpaceTargetId; target: DeepSpaceTarget };

export interface SpaceAnswerResult {
  target: SpaceTargetRef;
  headline: string;
  answer: string;
  destinationLabel: string;
  accentColor: string;
}

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9*\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SPANISH_STOPWORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'al',
  'a',
  'en',
  'y',
  'o',
  'que',
  'cual',
  'cuales',
  'quien',
  'quienes',
  'como',
  'donde',
  'cuando',
  'por',
  'para',
  'con',
  'sin',
  'sobre',
  'fue',
  'es',
  'son',
  'era',
  'esta',
  'estan',
  'hay',
  'tiene',
  'tienen',
  'mas',
  'muy',
  'me',
  'mi',
  'se',
  'su',
  'sus',
  'lo',
]);

interface SemanticKnowledgeRule {
  keywords: string[];
  targetId:
    | { kind: 'mission'; id: string }
    | { kind: 'body'; id: CelestialBodyId }
    | { kind: 'moon'; bodyId: CelestialBodyId; moonId: string }
    | { kind: 'deepspace'; id: DeepSpaceTargetId };
  headline: string;
  answer: string;
}

const KNOWLEDGE_RULES: SemanticKnowledgeRule[] = [
  {
    keywords: [
      'primera mision luna',
      'primer alunizaje',
      'primer hombre luna',
      'primero en la luna',
      'llegaron a la luna',
      'llego a la luna',
      'primeros humanos luna',
      'armstrong',
      'aldrin',
      'mar de la tranquilidad',
      'small step',
    ],
    targetId: { kind: 'mission', id: 'apollo11' },
    headline: 'Apolo 11 (Eagle) · 20 de julio de 1969',
    answer:
      'El Apolo 11 fue la primera misión tripulada en alunizar con éxito (Neil Armstrong y Buzz Aldrin) en el Mare Tranquillitatis. (El primer impacto robótico previo fue Luna 2 en 1959).',
  },
  {
    keywords: [
      'primer rover luna',
      'primer robot luna',
      'primer vehiculo luna',
      'rover sovietico',
      'primer vehiculo teledirigido',
    ],
    targetId: { kind: 'mission', id: 'lunokhod1' },
    headline: 'Lunokhod 1 · Primer rover planetario (1970)',
    answer:
      'Lunokhod 1 (URSS, noviembre de 1970) fue el primer rover robótico operado a distancia sobre la superficie de otro mundo, recorriendo 10,54 km en el Mare Imbrium lunar.',
  },
  {
    keywords: [
      'primer rover marte',
      'primer robot marte',
      'pathfinder',
      'primer vehiculo en marte',
    ],
    targetId: { kind: 'mission', id: 'sojourner' },
    headline: 'Sojourner · Primer rover en Marte (1997)',
    answer:
      'Sojourner aterrizó con Mars Pathfinder el 4 de julio de 1997 y se convirtió en el primer vehículo con ruedas en recorrer la superficie marciana.',
  },
  {
    keywords: [
      'helicoptero',
      'vuelo en marte',
      'primer vuelo otro planeta',
      'dron marte',
      'ingenuity',
      'jezero',
      'perseverance',
    ],
    targetId: { kind: 'mission', id: 'perseverance' },
    headline: 'Perseverance e Ingenuity · Cráter Jezero (2020)',
    answer:
      'El rover Perseverance y el helicóptero Ingenuity lograron el primer vuelo aerodinámico controlado en otro planeta (72 vuelos) y recolectan muestras de biofirmas en Marte.',
  },
  {
    keywords: [
      'terremotos marte',
      'marsquakes',
      'sismografo',
      'interior de marte',
      'nucleo marte',
      'mi bateria',
      'my battery is low',
    ],
    targetId: { kind: 'mission', id: 'insight' },
    headline: 'InSight · Sismología e interior marciano',
    answer:
      'Nota: aunque la famosa frase "My battery is low and it’s getting dark" se asocia a Opportunity, InSight detectó más de 1.300 sismos marcianos y midió el núcleo líquido de Marte.',
  },
  {
    keywords: [
      'opportunity',
      'agua marte',
      'hematites',
      'record distancia',
      '45 km',
      '55 veces',
    ],
    targetId: { kind: 'mission', id: 'opportunity' },
    headline: 'Opportunity (MER-B) · Evidencia mineral de agua',
    answer:
      'Opportunity recorrió 45,16 km entre los cráteres Eagle, Victoria y Endeavour durante 15 años, aportando la primera prueba mineralógica directa de agua líquida superficial en Marte.',
  },
  {
    keywords: [
      'hielo marte',
      'polo norte marte',
      'excavo hielo',
      'agua congelada marte',
      'phoenix',
    ],
    targetId: { kind: 'mission', id: 'phoenix' },
    headline: 'Phoenix Mars Lander · Hielo subsuperficial (2008)',
    answer:
      'El aterrizador Phoenix excavó el regolito ártico de Marte y confirmó físicamente la presencia de hielo de agua justo debajo de la superficie.',
  },
  {
    keywords: [
      'astronautas',
      'estacion espacial',
      'donde viven astronautas',
      'orbita baja',
      'iss',
      'eei',
      '408 km',
    ],
    targetId: { kind: 'mission', id: 'iss' },
    headline: 'Estación Espacial Internacional (ISS)',
    answer:
      'El mayor laboratorio orbital de la humanidad, en órbita terrestre baja a ~408 km de altura, habitado de forma ininterrumpida desde noviembre del año 2000.',
  },
  {
    keywords: [
      'telescopio mas potente',
      'infrarrojo',
      'primeras galaxias',
      'big bang',
      'lagrange l2',
      'james webb',
      'jwst',
      'espejo dorado',
    ],
    targetId: { kind: 'mission', id: 'jwst' },
    headline: 'Telescopio Espacial James Webb (JWST)',
    answer:
      'El telescopio espacial infrarrojo más potente jamás lanzado, situado a 1,5 millones de km (L2) para observar las primeras galaxias tras el Big Bang y atmósferas de exoplanetas.',
  },
  {
    keywords: [
      'campo profundo',
      'hubble',
      'expansion del universo',
      'pilares de la creacion',
    ],
    targetId: { kind: 'mission', id: 'hubble' },
    headline: 'Telescopio Espacial Hubble (HST)',
    answer:
      'Desde 1990 ha realizado más de 1,5 millones de observaciones, midiendo la edad y aceleración del universo con imágenes icónicas como los Pilares de la Creación.',
  },
  {
    keywords: [
      'disco de oro',
      'golden record',
      'mas lejana',
      'espacio interestelar',
      'sonda mas lejos',
      'fuera del sistema solar',
      'voyager',
      'pale blue dot',
    ],
    targetId: { kind: 'mission', id: 'voyager1' },
    headline: 'Voyager 1 · Objeto humano más lejano',
    answer:
      'Lanzada en 1977, Voyager 1 lleva el Disco de Oro interestelar y es la sonda más distante de la Tierra (a más de 24.000 millones de km), ya en el espacio interestelar.',
  },
  {
    keywords: [
      'urano y neptuno',
      'grand tour',
      'cuatro gigantes',
      'voyager 2',
    ],
    targetId: { kind: 'mission', id: 'voyager2' },
    headline: 'Voyager 2 · Única sonda en Urano y Neptuno',
    answer:
      'Única nave de la historia que visitó los cuatro planetas gigantes gaseosos y helados (Júpiter, Saturno, Urano y Neptuno) antes de cruzar la heliopausa.',
  },
  {
    keywords: [
      'aterrizo en cometa',
      'cometa',
      'rosetta',
      'philae',
      '67p',
      'churyumov',
    ],
    targetId: { kind: 'mission', id: 'rosetta_philae' },
    headline: 'Rosetta y Philae · Primer aterrizaje en un cometa',
    answer:
      'En 2014 la sonda europea Rosetta orbitó el cometa 67P/Churyumov-Gerasimenko y desplegó el módulo Philae en el primer descenso suave sobre un cometa.',
  },
  {
    keywords: [
      'titan aterrizaje',
      'huygens',
      'aterrizaje mas lejano',
      'lagos de metano',
    ],
    targetId: { kind: 'mission', id: 'huygens' },
    headline: 'Módulo Huygens · Aterrizaje en Titán (2005)',
    answer:
      'La sonda Huygens logró el aterrizaje más lejano jamás realizado en el Sistema Solar exterior, descendiendo en paracaídas sobre la superficie de Titán, luna de Saturno.',
  },
  {
    keywords: [
      'agujero negro via lactea',
      'centro galaxia',
      'centro de nuestra galaxia',
      'sagitario a',
      'sgr a',
      'agujero negro supermasivo',
      'primer agujero negro foto',
      'event horizon',
    ],
    targetId: { kind: 'deepspace', id: 'sagittarius_a' },
    headline: 'Sagitario A* · Corazón de la Vía Láctea',
    answer:
      'Sagitario A* es el agujero negro supermasivo de 4,3 millones de masas solares situado en el centro de nuestra galaxia (a 26.670 años luz), fotografiado directamente por el EHT en 2022.',
  },
  {
    keywords: [
      'cygnus x1',
      'primer agujero negro confirmado',
      'agujero negro estelar',
      'supergigante azul',
      'hawking thorne',
    ],
    targetId: { kind: 'deepspace', id: 'cygnus_x1' },
    headline: 'Cygnus X-1 · Primer agujero negro estelar (21,2 M☉)',
    answer:
      'A 7.200 años luz en la Vía Láctea, Cygnus X-1 arranca plasma de su estrella compañera supergigante azul HDE 226868, emitiendo potentes rayos X observados por Chandra.',
  },
  {
    keywords: [
      'agujero negro mas cercano',
      'gaia bh1',
      'ofiuco',
      'agujero negro cerca de la tierra',
    ],
    targetId: { kind: 'deepspace', id: 'gaia_bh1' },
    headline: 'Gaia BH1 · Agujero negro más cercano (1.560 al)',
    answer:
      'Descubierto con datos de Gaia, Gaia BH1 tiene 9,62 masas solares y orbita a una estrella similar al Sol a solo 1.560 años luz en nuestra Vía Láctea.',
  },
  {
    keywords: [
      'microcuasar',
      'grs 1915',
      'chorro relativista',
      'superluminico',
    ],
    targetId: { kind: 'deepspace', id: 'grs_1915' },
    headline: 'GRS 1915+105 · Microcuásar galáctico',
    answer:
      'Agujero negro estelar de 12,4 masas solares en la Vía Láctea que dispara chorros bipolares de plasma a más del 92 % de la velocidad de la luz.',
  },
  {
    keywords: [
      'pulsar del cangrejo',
      'estrella de neutrones',
      '30 veces por segundo',
      'toro de rayos x',
      'b0531',
    ],
    targetId: { kind: 'deepspace', id: 'crab_pulsar' },
    headline: 'Púlsar del Cangrejo · Estrella de neutrones (30,2 Hz)',
    answer:
      'Nacido de la supernova del año 1054, este púlsar de 20 km gira 30,2 veces por segundo rodeado de un toro sincrotrón en rayos X fotografiado por NASA Chandra.',
  },
  {
    keywords: [
      'pulsar de vela',
      'pulsar',
      'b0833',
      'chandra pulsar',
    ],
    targetId: { kind: 'deepspace', id: 'vela_pulsar' },
    headline: 'Púlsar de Vela · Viento relativista (959 al)',
    answer:
      'Estrella de neutrones a solo 959 años luz que gira 11,2 veces por segundo lanzando un chorro curvo de rayos X y arcos de choque captados por Chandra e IXPE.',
  },
  {
    keywords: [
      'nebulosa de orion',
      'orion',
      'm42',
      'trapecio',
      'nacen estrellas cerca',
    ],
    targetId: { kind: 'deepspace', id: 'nebula_orion' },
    headline: 'Nebulosa de Orión (M42) · Guardería estelar',
    answer:
      'A 1.344 años luz, es la región más cercana donde nacen estrellas masivas y discos protoplanetarios alrededor del cúmulo del Trapecio.',
  },
  {
    keywords: [
      'pilares de la creacion',
      'nebulosa del aguila',
      'm16',
      'pilares',
    ],
    targetId: { kind: 'deepspace', id: 'nebula_eagle' },
    headline: 'Pilares de la Creación (M16 · Águila)',
    answer:
      'Columnas de gas molecular y polvo de 5 años luz en el brazo de Sagitario de la Vía Láctea, esculpidas por estrellas jóvenes en imágenes icónicas de Hubble y JWST.',
  },
  {
    keywords: [
      'carina',
      'eta carinae',
      'acantilados cosmicos',
      'homunculo',
      'ngc 3372',
    ],
    targetId: { kind: 'deepspace', id: 'nebula_carina' },
    headline: 'Nebulosa de Carina y Eta Carinae (NGC 3372)',
    answer:
      'Complejo estelar de 300 años luz a 8.500 años luz de distancia que alberga los Acantilados Cósmicos del JWST y a la colosal hipergigante bipolar Eta Carinae.',
  },
  {
    keywords: [
      'nebulosa del cangrejo',
      'supernova 1054',
      'remanente de supernova',
      'm1',
    ],
    targetId: { kind: 'deepspace', id: 'nebula_crab' },
    headline: 'Nebulosa del Cangrejo (M1) · Supernova 1054',
    answer:
      'Remanente filamentoso en expansión a 1.500 km/s tras la explosión estelar registrada en 1054 d. C., iluminado desde su núcleo por el Púlsar del Cangrejo.',
  },
  {
    keywords: [
      'nebulosa de la helice',
      'helix',
      'nebulosa planetaria',
      'ngc 7293',
      'ojo de dios',
    ],
    targetId: { kind: 'deepspace', id: 'nebula_helix' },
    headline: 'Nebulosa de la Hélice (NGC 7293)',
    answer:
      'Nebulosa planetaria a 655 años luz formada por las capas expulsadas por una estrella moribunda similar al Sol alrededor de una caliente enana blanca central.',
  },
  {
    keywords: [
      'nuestra galaxia',
      'via lactea',
      'espolon de orion',
      'brazos espirales',
      'donde esta el sistema solar',
    ],
    targetId: { kind: 'deepspace', id: 'milkyway' },
    headline: 'Vía Láctea · Nuestra galaxia espiral barrada',
    answer:
      'El Sistema Solar orbita en el brazo menor de Orión a ~26.670 años luz del centro galáctico, completando una vuelta cada ~230 millones de años.',
  },
  {
    keywords: [
      'sol',
      'temperatura del sol',
      'estrella',
      'brillo del sol',
      'fotosfera',
    ],
    targetId: { kind: 'body', id: 'sun' },
    headline: 'El Sol · Estrella enana amarilla G2V',
    answer:
      'Concentra el 99,86 % de toda la masa del Sistema Solar con una fotosfera a 5.505 °C y gravedad superficial de 274 m/s².',
  },
  {
    keywords: [
      'primer foto en venus',
      'sonda en venus',
      'presion de venus',
      'venera',
      'planeta mas caliente',
    ],
    targetId: { kind: 'mission', id: 'venera13' },
    headline: 'Venera 13 · Superficie infernal de Venus (1982)',
    answer:
      'Venera 13 transmitió las primeras fotografías panorámicas en color desde Venus, sobreviviendo 127 minutos a 457 °C y 89 atmósferas de presión.',
  },
  {
    keywords: [
      'planeta mas grande',
      'gigante gaseoso',
      'gran mancha roja',
      'jupiter',
      'gravedad mas fuerte planeta',
    ],
    targetId: { kind: 'body', id: 'jupiter' },
    headline: 'Júpiter · El planeta más grande del Sistema Solar',
    answer:
      'Con 139.820 km de diámetro y gravedad superficial de 24,79 m/s², alberga la tormenta anticiclónica de la Gran Mancha Roja y 95 lunas.',
  },
  {
    keywords: [
      'anillos',
      'cassini',
      'planeta anillado',
      'saturno',
    ],
    targetId: { kind: 'body', id: 'saturn' },
    headline: 'Saturno · El sistema de anillos más extenso',
    answer:
      'Los anillos de Saturno se extienden a lo largo de cientos de miles de kilómetros con millones de fragmentos de hielo de agua y roca divididos por la brecha de Cassini.',
  },
  {
    keywords: [
      'oceano subterraneo',
      'vida en luna',
      'europa',
      'hielo jupiter',
    ],
    targetId: { kind: 'moon', bodyId: 'jupiter', moonId: 'europa' },
    headline: 'Europa (luna de Júpiter) · Océano global bajo hielo',
    answer:
      'Bajo su corteza fracturada de hielo esconde un océano líquido salado con más del doble de agua que todos los océanos de la Tierra, objetivo de Europa Clipper.',
  },
  {
    keywords: [
      'geiseres saturno',
      'encelado',
      'oceanos encelado',
    ],
    targetId: { kind: 'moon', bodyId: 'saturn', moonId: 'enceladus' },
    headline: 'Encélado · Géiseres oceánicos en Saturno',
    answer:
      'Sus grietas polares expulsan penachos de vapor de agua e hidrógeno molecular directamente al anillo E desde un océano subterráneo salado.',
  },
  {
    keywords: [
      'volcanes',
      'luna mas volcanica',
      'io',
    ],
    targetId: { kind: 'moon', bodyId: 'jupiter', moonId: 'io' },
    headline: 'Ío · El mundo más volcánicamente activo',
    answer:
      'El tirón gravitacional de Júpiter y Europa calienta su interior por mareas, alimentando más de 400 volcanes activos de azufre y silicatos.',
  },
  {
    keywords: [
      'planeta enano',
      'corazon de hielo',
      'pluton',
      'new horizons',
      'cinturon de kuiper',
    ],
    targetId: { kind: 'body', id: 'pluto' },
    headline: 'Plutón · Planeta enano del cinturón de Kuiper',
    answer:
      'Explorado por New Horizons en 2015, reveló la vasta planicie glaciar de nitrógeno Sputnik Planitia (su famoso "corazón") y montañas de hielo de agua.',
  },
  {
    keywords: [
      'planeta mas cercano al sol',
      'mas cerca del sol',
      'mercurio',
      'messenger',
      'planeta mas rapido',
    ],
    targetId: { kind: 'body', id: 'mercury' },
    headline: 'Mercurio · El planeta más rápido y cercano (0,39 UA)',
    answer:
      'Orbita el Sol a ~47,4 km/s completando un año cada 88 días terrestres y sufrió extremos térmicos de −180 °C a +430 °C.',
  },
];

function resolveRuleTarget(rule: SemanticKnowledgeRule): SpaceTargetRef | null {
  const ref = rule.targetId;
  if (ref.kind === 'mission') {
    const mission = ABANDONED_MISSIONS.find((m) => m.id === ref.id);
    return mission ? { type: 'mission', mission } : null;
  }
  if (ref.kind === 'deepspace') {
    const target = DEEP_SPACE_TARGETS.find((d) => d.id === ref.id);
    return target ? { type: 'deepspace', id: target.id, target } : null;
  }
  if (ref.kind === 'body') {
    const body = CELESTIAL_BODIES.find((b) => b.id === ref.id);
    return body ? { type: 'body', bodyId: body.id, body } : null;
  }
  const body = CELESTIAL_BODIES.find((b) => b.id === ref.bodyId);
  const moon = body?.moons.find((m) => m.id === ref.moonId);
  if (body && moon) {
    return { type: 'moon', bodyId: body.id, moonId: moon.id, body, moon };
  }
  return null;
}

export function resolveSpaceQuery(rawQuery: string): SpaceAnswerResult | null {
  const qNorm = normalizeSearchText(rawQuery);
  if (qNorm.length < 2) return null;

  const qTokens = qNorm
    .split(' ')
    .filter((t) => t.length >= 2 && !SPANISH_STOPWORDS.has(t));

  // 1. Check natural-language curated knowledge rules (e.g. "cual fue la primera mision que llego a la luna")
  let bestRule: { rule: SemanticKnowledgeRule; score: number } | null = null;
  for (const rule of KNOWLEDGE_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const kwNorm = normalizeSearchText(kw);
      if (qNorm.includes(kwNorm)) {
        score += 20 + kwNorm.length;
      } else {
        const kwWords = kwNorm
          .split(' ')
          .filter((w) => w.length >= 3 && !SPANISH_STOPWORDS.has(w));
        if (kwWords.length > 0) {
          let hits = 0;
          for (const w of kwWords) {
            if (qNorm.includes(w)) hits++;
          }
          if (hits === kwWords.length) {
            score += 14 + hits * 3;
          } else if (hits >= 2 && hits >= Math.ceil(kwWords.length * 0.65)) {
            score += hits * 4;
          }
        }
      }
    }
    if (score >= 12 && (!bestRule || score > bestRule.score)) {
      bestRule = { rule, score };
    }
  }

  if (bestRule) {
    const target = resolveRuleTarget(bestRule.rule);
    if (target) {
      const destinationLabel =
        target.type === 'mission'
          ? `${target.mission.categoryLabel} · ${target.mission.destinationLabel}`
          : target.type === 'moon'
            ? `Luna de ${target.body.name}`
            : target.type === 'body'
              ? target.body.classification
              : target.target.classification;
      const accentColor =
        target.type === 'mission'
          ? target.mission.accentColor
          : target.type === 'body' || target.type === 'moon'
            ? target.body.accentColor
            : target.target.accentColor;
      return {
        target,
        headline: bestRule.rule.headline,
        answer: bestRule.rule.answer,
        destinationLabel,
        accentColor,
      };
    }
  }

  // 2. Fallback: weighted search across all Missions, Deep Space Targets, Planets & Moons
  let bestMatch: { result: SpaceAnswerResult; score: number } | null = null;

  for (const m of ABANDONED_MISSIONS) {
    const nameNorm = normalizeSearchText(m.name);
    const hay = normalizeSearchText(
      `${m.name} ${m.agency} ${m.destinationLabel} ${m.region} ${m.launchYear} ${m.whatItDid} ${m.whyImportant}`,
    );
    let score = 0;
    if (nameNorm.includes(qNorm) || qNorm.includes(nameNorm)) score += 35;
    for (const tok of qTokens) {
      if (nameNorm.includes(tok)) score += 12;
      else if (hay.includes(tok)) score += 4;
    }
    if (score >= 8 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        score,
        result: {
          target: { type: 'mission', mission: m },
          headline: `${m.name} (${m.launchYear})`,
          answer: m.whatItDid,
          destinationLabel: `${m.categoryLabel} · ${m.destinationLabel}`,
          accentColor: m.accentColor,
        },
      };
    }
  }

  for (const ds of DEEP_SPACE_TARGETS) {
    const nameNorm = normalizeSearchText(ds.name);
    const hay = normalizeSearchText(`${ds.name} ${ds.classification} ${ds.whatItIs} ${ds.whyImportant}`);
    let score = 0;
    if (nameNorm.includes(qNorm) || qNorm.includes(nameNorm)) score += 35;
    for (const tok of qTokens) {
      if (nameNorm.includes(tok)) score += 12;
      else if (hay.includes(tok)) score += 4;
    }
    if (score >= 8 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        score,
        result: {
          target: { type: 'deepspace', id: ds.id, target: ds },
          headline: ds.name,
          answer: ds.whatItIs,
          destinationLabel: ds.classification,
          accentColor: ds.accentColor,
        },
      };
    }
  }

  for (const body of CELESTIAL_BODIES) {
    const nameNorm = normalizeSearchText(body.name);
    const hay = normalizeSearchText(`${body.name} ${body.classification} ${body.description}`);
    let score = 0;
    if (nameNorm === qNorm || qNorm.includes(nameNorm)) score += 32;
    for (const tok of qTokens) {
      if (nameNorm.includes(tok)) score += 11;
      else if (hay.includes(tok)) score += 3;
    }
    if (score >= 8 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        score,
        result: {
          target: { type: 'body', bodyId: body.id, body },
          headline: `${body.name} · ${body.classification}`,
          answer: body.description,
          destinationLabel: body.stats.distanceAu,
          accentColor: body.accentColor,
        },
      };
    }

    for (const moon of body.moons) {
      const mNorm = normalizeSearchText(moon.name);
      let mScore = 0;
      if (mNorm === qNorm || qNorm.includes(mNorm)) mScore += 30;
      for (const tok of qTokens) {
        if (mNorm.includes(tok)) mScore += 10;
      }
      if (mScore >= 10 && (!bestMatch || mScore > bestMatch.score)) {
        bestMatch = {
          score: mScore,
          result: {
            target: { type: 'moon', bodyId: body.id, moonId: moon.id, body, moon },
            headline: `${moon.name} · Luna de ${body.name}`,
            answer: `${moon.name} orbita ${body.name} con un periodo de ${Math.abs(moon.orbitalPeriodDays).toFixed(1)} días.`,
            destinationLabel: `Satélite natural de ${body.name}`,
            accentColor: body.accentColor,
          },
        };
      }
    }
  }

  return bestMatch?.result ?? null;
}
