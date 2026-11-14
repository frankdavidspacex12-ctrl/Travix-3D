import { CelestialBodyId } from './solarSystemData';

export type MissionCategory = 'rover' | 'lander' | 'satellite' | 'probe';

export type MissionRole = 'surface' | 'orbital' | 'deepspace';

export type MissionDestinationGroup =
  | 'Marte'
  | 'Luna'
  | 'Tierra / Órbita'
  | 'Júpiter'
  | 'Saturno'
  | 'Titán'
  | 'Venus'
  | 'Mercurio'
  | 'Plutón'
  | 'Cometa 67P'
  | 'Espacio Profundo';

export type CraftModelType =
  | 'rover_mer'
  | 'rover_msl'
  | 'rover_sojourner'
  | 'rover_lunokhod'
  | 'lander_apollo'
  | 'lander_apollo_lrv'
  | 'lander_solar'
  | 'lander_phoenix'
  | 'lander_surveyor'
  | 'lander_venera'
  | 'lander_huygens'
  | 'lander_philae'
  | 'sat_lro'
  | 'sat_hubble'
  | 'sat_iss'
  | 'sat_jwst'
  | 'sat_mro'
  | 'probe_juno'
  | 'probe_cassini'
  | 'probe_messenger'
  | 'probe_newhorizons'
  | 'probe_voyager';

export interface AbandonedMission {
  id: string;
  name: string;
  agency: string;
  category: MissionCategory;
  categoryLabel: 'Rover' | 'Lander' | 'Satélite' | 'Sonda';
  missionRole: MissionRole;
  craftType: CraftModelType;
  /** Target body id in the 3D Solar System engine */
  targetBodyId: CelestialBodyId;
  /** Optional moon id if the mission rests on or orbits a moon */
  targetMoonId?: string;
  destinationGroup: MissionDestinationGroup;
  destinationLabel: string;
  region: string;
  latDeg: number;
  lonDeg: number;
  launchYear: string;
  launchDate: string;
  lastContactDate: string;
  operationalDuration: string;
  status: string;
  whatItDid: string;
  whyImportant: string;
  farewellMessage: string;
  legacySummary: string;
  nasaQuery: string;
  accentColor: string;
  hasIngenuity?: boolean;
}

export const ABANDONED_MISSIONS: AbandonedMission[] = [
  // ================= MARTE (ROVERS, LANDERS Y SATÉLITES) =================
  {
    id: 'perseverance',
    name: 'Perseverance e Ingenuity',
    agency: 'NASA / JPL',
    category: 'rover',
    categoryLabel: 'Rover',
    missionRole: 'surface',
    craftType: 'rover_msl',
    targetBodyId: 'mars',
    destinationGroup: 'Marte',
    destinationLabel: 'Marte',
    region: 'Cráter Jezero · Antiguo delta fluvial',
    latDeg: 18.38,
    lonDeg: 77.58,
    launchYear: '2020',
    launchDate: '30 jul 2020',
    lastContactDate: 'Activo · Operación continua',
    operationalDuration: 'Más de 1.400 soles activos',
    status: 'Activo · Búsqueda de biofirmas',
    whatItDid:
      'Explora el antiguo delta del lago Jezero, perfora y sella tubos de muestras para futuro retorno a la Tierra, produce oxígeno con MOXIE y voló 72 veces junto al helicóptero Ingenuity.',
    whyImportant:
      'Llevó el primer vuelo aerodinámico controlado en otro planeta (Ingenuity) y recogió testigos sedimentarios clave para determinar si existió vida microbiana antigua en Marte.',
    farewellMessage:
      '"It has been an honor to explore the Red Planet alongside Perseverance." — Ingenuity (72 vuelos)',
    legacySummary:
      'Laboratorio astrobiológico de última generación acompañado por el primer helicóptero extraterrestre de la historia.',
    nasaQuery: 'Perseverance rover Ingenuity Jezero Crater Mars',
    accentColor: '#F59E0B',
    hasIngenuity: true,
  },
  {
    id: 'curiosity',
    name: 'Curiosity (MSL)',
    agency: 'NASA / JPL',
    category: 'rover',
    categoryLabel: 'Rover',
    missionRole: 'surface',
    craftType: 'rover_msl',
    targetBodyId: 'mars',
    destinationGroup: 'Marte',
    destinationLabel: 'Marte',
    region: 'Cráter Gale · Monte Sharp (Aeolis Mons)',
    latDeg: -4.5895,
    lonDeg: 137.4417,
    launchYear: '2011',
    launchDate: '26 nov 2011',
    lastContactDate: 'Activo · Operación continua',
    operationalDuration: 'Más de 4.400 soles activos',
    status: 'Activo · Ascenso al Monte Sharp',
    whatItDid:
      'Ha recorrido más de 33 km ascendiendo por los estratos geológicos del Monte Sharp en el cráter Gale, vaporizando rocas con láser ChemCam y analizando compuestos orgánicos.',
    whyImportant:
      'Confirmó que el cráter Gale albergó durante millones de años un lago de agua dulce con condiciones químicas aptas para sustentar vida microbiana.',
    farewellMessage:
      'Impulsado por un generador nuclear RTG de plutonio-238, continúa escalando el Monte Sharp.',
    legacySummary:
      'Demostró la habitabilidad pasada de Marte analizando moléculas orgánicas preservadas en lutitas antiguas.',
    nasaQuery: 'Curiosity rover Gale Crater Mount Sharp Mars',
    accentColor: '#FB923C',
  },
  {
    id: 'opportunity',
    name: 'Opportunity (MER-B)',
    agency: 'NASA / JPL',
    category: 'rover',
    categoryLabel: 'Rover',
    missionRole: 'surface',
    craftType: 'rover_mer',
    targetBodyId: 'mars',
    destinationGroup: 'Marte',
    destinationLabel: 'Marte',
    region: 'Meridiani Planum · Valle de la Perseverancia',
    latDeg: -1.9462,
    lonDeg: 354.4734,
    launchYear: '2003',
    launchDate: '7 jul 2003',
    lastContactDate: '10 jun 2018',
    operationalDuration: '5.352 días terrestres (5.111 soles)',
    status: 'Inactivo · Legado histórico',
    whatItDid:
      'Recorrió 45,16 km explorando los cráteres Eagle, Endurance, Victoria y Endeavour, analizando rocas sedimentarias y hematites con su brazo robótico.',
    whyImportant:
      'Demostró por primera vez con evidencia mineralógica directa que Marte tuvo agua líquida superficial en el pasado y superó en 55 veces su vida útil prevista.',
    farewellMessage: '"My battery is low and it\'s getting dark."',
    legacySummary:
      'Diseñado originalmente para 90 soles, recorrió 45,16 km durante casi 15 años y descubrió evidencia mineralógica concluyente de agua líquida antigua en Marte.',
    nasaQuery: 'Opportunity rover Meridiani Planum Mars',
    accentColor: '#EF4444',
  },
  {
    id: 'spirit',
    name: 'Spirit (MER-A)',
    agency: 'NASA / JPL',
    category: 'rover',
    categoryLabel: 'Rover',
    missionRole: 'surface',
    craftType: 'rover_mer',
    targetBodyId: 'mars',
    destinationGroup: 'Marte',
    destinationLabel: 'Marte',
    region: 'Cráter Gusev · Colinas Columbia',
    latDeg: -14.5684,
    lonDeg: 175.4726,
    launchYear: '2003',
    launchDate: '10 jun 2003',
    lastContactDate: '22 mar 2010',
    operationalDuration: '2.269 días terrestres (2.210 soles)',
    status: 'Inactivo · Legado histórico',
    whatItDid:
      'Atravesó 7,73 km en el cráter Gusev, escaló la colina Husband y estudió remolinos de polvo, rocas volcánicas y depósitos hidrotermales.',
    whyImportant:
      'Descubrió sílice casi pura y carbonatos formados en antiguos manantiales calientes, revelando entornos habitables en el Marte primitivo.',
    farewellMessage:
      'Atrapado en arena blanda cerca de Home Plate, no pudo inclinar sus paneles hacia el sol invernal y entró en hibernación permanente.',
    legacySummary:
      'Recorrió 7,73 km en el cráter Gusev, escaló la colina Husband y halló depósitos de sílice hidrotermal formados en antiguos manantiales calientes.',
    nasaQuery: 'Spirit rover Gusev Crater Mars',
    accentColor: '#F97316',
  },
  {
    id: 'insight',
    name: 'InSight',
    agency: 'NASA / JPL / CNES / DLR',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_solar',
    targetBodyId: 'mars',
    destinationGroup: 'Marte',
    destinationLabel: 'Marte',
    region: 'Elysium Planitia',
    latDeg: 4.5024,
    lonDeg: 135.6234,
    launchYear: '2018',
    launchDate: '5 may 2018',
    lastContactDate: '15 dic 2022',
    operationalDuration: '1.480 días terrestres (1.440 soles)',
    status: 'Inactivo · Legado histórico',
    whatItDid:
      'Desplegó un sismómetro ultrasensible y una sonda térmica en Elysium Planitia para escuchar el pulso sísmico y los impactos meteoríticos de Marte.',
    whyImportant:
      'Registró más de 1.300 martemotos y permitió medir por primera vez el grosor de la corteza y el tamaño del núcleo líquido marciano.',
    farewellMessage:
      '"My power\'s really low, so this may be the last image I can send."',
    legacySummary:
      'Primer observatorio geofísico dedicado al interior marciano. Detectó más de 1.300 martemotos y midió por primera vez el tamaño del núcleo líquido de Marte.',
    nasaQuery: 'InSight lander Elysium Planitia Mars',
    accentColor: '#F59E0B',
  },
  {
    id: 'sojourner',
    name: 'Sojourner (Pathfinder)',
    agency: 'NASA / JPL',
    category: 'rover',
    categoryLabel: 'Rover',
    missionRole: 'surface',
    craftType: 'rover_sojourner',
    targetBodyId: 'mars',
    destinationGroup: 'Marte',
    destinationLabel: 'Marte',
    region: 'Ares Vallis',
    latDeg: 19.13,
    lonDeg: 326.78,
    launchYear: '1996',
    launchDate: '4 dic 1996',
    lastContactDate: '27 sep 1997',
    operationalDuration: '83 soles',
    status: 'Inactivo · Legado histórico',
    whatItDid:
      'Exploró los alrededores de la estación Pathfinder en Ares Vallis analizando cantos rodados arrastrados por antiguas inundaciones catastróficas.',
    whyImportant:
      'Fue el primer vehículo robótico de la historia en rodar sobre Marte, validando la suspensión rocker-bogie usada hasta hoy por Perseverance.',
    farewellMessage:
      'La última transmisión del módulo base Pathfinder cesó tras agotarse su batería térmica durante la fría noche marciana.',
    legacySummary:
      'Primer rover móvil de la historia en operar sobre otro planeta, demostrando la arquitectura de suspensión rocker-bogie heredada por todos los rovers posteriores.',
    nasaQuery: 'Sojourner rover Mars Pathfinder Ares Vallis',
    accentColor: '#FB923C',
  },
  {
    id: 'phoenix',
    name: 'Phoenix Mars Lander',
    agency: 'NASA / U. Arizona / CSA',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_phoenix',
    targetBodyId: 'mars',
    destinationGroup: 'Marte',
    destinationLabel: 'Marte',
    region: 'Vastitas Borealis · Ártico marciano',
    latDeg: 68.2188,
    lonDeg: 234.2508,
    launchYear: '2007',
    launchDate: '4 ago 2007',
    lastContactDate: '2 nov 2008',
    operationalDuration: '157 soles',
    status: 'Inactivo · Legado histórico',
    whatItDid:
      'Excavó zanjas en el suelo ártico marciano, analizó muestras en su laboratorio térmico y observó precipitación de nieve en la alta atmósfera.',
    whyImportant:
      'Confirmó físicamente al tacto la existencia de hielo de agua subterráneo a pocos centímetros bajo la superficie polar norte de Marte.',
    farewellMessage:
      'Silenciado por la llegada de la noche polar ártica y la acumulación de hielo de CO₂ sobre sus paneles solares.',
    legacySummary:
      'Excavó directamente en el permafrost polar norte marciano y confirmó físicamente la presencia de hielo de agua superficial y percloratos en el suelo.',
    nasaQuery: 'Phoenix Mars Lander polar ice',
    accentColor: '#38BDF8',
  },
  {
    id: 'mro',
    name: 'Mars Reconnaissance Orbiter (MRO)',
    agency: 'NASA / JPL',
    category: 'satellite',
    categoryLabel: 'Satélite',
    missionRole: 'orbital',
    craftType: 'sat_mro',
    targetBodyId: 'mars',
    destinationGroup: 'Marte',
    destinationLabel: 'Órbita de Marte',
    region: 'Órbita polar baja · 255 × 320 km',
    latDeg: 12.0,
    lonDeg: 78.0,
    launchYear: '2005',
    launchDate: '12 ago 2005',
    lastContactDate: 'Activo · Retransmisión diaria',
    operationalDuration: 'Más de 18 años en órbita marciana',
    status: 'Activo · Satélite cartográfico y enlace',
    whatItDid:
      'Fotografía Marte con la cámara telescópica HiRISE a 30 cm/píxel, detecta minerales hidratados con CRISM y sirve como antena de enlace para Curiosity y Perseverance.',
    whyImportant:
      'Ha enviado más datos científicos que todas las demás misiones planetarias interplanetarias combinadas y ha fotografiado desde órbita a cada rover en superficie.',
    farewellMessage:
      'Sus ojos orbitales continúan vigilando remolinos de polvo, avalanchas polares y futuras zonas de aterrizaje.',
    legacySummary:
      'El satélite de alta resolución que cartografió cada lugar de aterrizaje de la NASA en Marte y actúa como puente de comunicaciones.',
    nasaQuery: 'Mars Reconnaissance Orbiter HiRISE spacecraft',
    accentColor: '#F87171',
  },

  // ================= LA LUNA (TODOS LOS APOLO, ROVERS Y SATÉLITES) =================
  {
    id: 'apollo11',
    name: 'Apollo 11 · Eagle',
    agency: 'NASA',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_apollo',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Mare Tranquillitatis · Base Tranquilidad',
    latDeg: 0.67408,
    lonDeg: 23.47297,
    launchYear: '1969',
    launchDate: '16 jul 1969',
    lastContactDate: '21 jul 1969',
    operationalDuration: '21 h 36 min en superficie',
    status: 'Inactivo · Monumento histórico',
    whatItDid:
      'Descendió a Neil Armstrong y Buzz Aldrin en el Mar de la Tranquilidad, desplegó sismómetros, reflectores láser y recolectó 21,5 kg de rocas lunares.',
    whyImportant:
      'Marcó el primer alunizaje tripulado de la historia humana; su etapa de descenso permanece intacta en la Luna como patrimonio científico.',
    farewellMessage:
      '"Houston, Tranquility Base here. The Eagle has landed."',
    legacySummary:
      'La etapa de descenso del módulo lunar Eagle permanece intacta en el Mar de la Tranquilidad como testigo del primer alunizaje tripulado de la humanidad.',
    nasaQuery: 'Apollo 11 Eagle lunar module Tranquility Base',
    accentColor: '#E2E8F0',
  },
  {
    id: 'apollo12',
    name: 'Apollo 12 · Intrepid',
    agency: 'NASA',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_apollo',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Oceanus Procellarum · Junto a Surveyor 3',
    latDeg: -3.0124,
    lonDeg: 336.5784,
    launchYear: '1969',
    launchDate: '14 nov 1969',
    lastContactDate: '20 nov 1969',
    operationalDuration: '31 h 31 min en superficie',
    status: 'Inactivo · Patrimonio lunar',
    whatItDid:
      'Pete Conrad y Alan Bean ejecutaron un alunizaje de precisión a apenas 163 metros del Surveyor 3, caminaron hasta la sonda y trajeron su cámara a la Tierra.',
    whyImportant:
      'Demostró que la NASA podía aterrizar con precisión puntual junto a objetivos preexistentes y reveló cómo resiste el hardware humano tras 2,5 años en el vacío lunar.',
    farewellMessage:
      '"Whoopee! Man, that may have been a small one for Neil, but that\'s a long one for me."',
    legacySummary:
      'Segundo alunizaje tripulado; primer encuentro en la superficie de otro mundo entre astronautas y una sonda robótica previa.',
    nasaQuery: 'Apollo 12 Intrepid Surveyor 3 Moon',
    accentColor: '#CBD5E1',
  },
  {
    id: 'apollo14',
    name: 'Apollo 14 · Antares',
    agency: 'NASA',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_apollo',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Tierras altas de Fra Mauro',
    latDeg: -3.6453,
    lonDeg: 342.5286,
    launchYear: '1971',
    launchDate: '31 ene 1971',
    lastContactDate: '6 feb 1971',
    operationalDuration: '33 h 30 min en superficie',
    status: 'Inactivo · Patrimonio lunar',
    whatItDid:
      'Alan Shepard y Edgar Mitchell exploraron a pie las tierras altas de Fra Mauro arrastrando un carro metálico MET hasta casi alcanzar el borde del cráter Cone.',
    whyImportant:
      'Recolectó 42,3 kg de brechas antiguas eyectadas desde las profundidades del manto lunar durante la formación de la cuenca Imbrium.',
    farewellMessage:
      '"Miles and miles and miles!" — Alan Shepard tras golpear dos pelotas de golf en baja gravedad.',
    legacySummary:
      'Devolvió la confianza al programa Apollo tras el Apollo 13 y trajo muestras geológicas profundas de la corteza lunar primitiva.',
    nasaQuery: 'Apollo 14 Antares Fra Mauro Moon',
    accentColor: '#94A3B8',
  },
  {
    id: 'apollo15',
    name: 'Apollo 15 · Falcon y Rover LRV-1',
    agency: 'NASA',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_apollo_lrv',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Hadley Rille · Montes Apeninos',
    latDeg: 26.1322,
    lonDeg: 3.6339,
    launchYear: '1971',
    launchDate: '26 jul 1971',
    lastContactDate: '2 ago 1971',
    operationalDuration: '66 h 54 min en superficie',
    status: 'Inactivo · Módulo y LRV en superficie',
    whatItDid:
      'David Scott y James Irwin condujeron el primer Vehículo Explorador Lunar (LRV) a lo largo de 27,9 km bordeando el cañón Hadley Rille y los Montes Apeninos.',
    whyImportant:
      'Halló la famosa "Roca del Génesis" de anortosita de 4.100 millones de años, confirmando el origen del océano de magma que formó la Luna.',
    farewellMessage:
      'A los pies del módulo Falcon yace la placa "Fallen Astronaut" junto al primer automóvil eléctrico conducido en la Luna.',
    legacySummary:
      'Inauguró las misiones científicas J de larga duración y el uso del Lunar Roving Vehicle eléctrico.',
    nasaQuery: 'Apollo 15 Hadley Rille Lunar Rover Moon',
    accentColor: '#BAE6FD',
  },
  {
    id: 'apollo16',
    name: 'Apollo 16 · Orion y Rover LRV-2',
    agency: 'NASA',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_apollo_lrv',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Meseta de Descartes',
    latDeg: -8.973,
    lonDeg: 15.5002,
    launchYear: '1972',
    launchDate: '16 abr 1972',
    lastContactDate: '24 abr 1972',
    operationalDuration: '71 h 02 min en superficie',
    status: 'Inactivo · Módulo y LRV en superficie',
    whatItDid:
      'John Young y Charles Duke exploraron las tierras altas centrales en el rover LRV-2 durante 26,7 km, desplegaron el primer observatorio astronómico ultravioleta lunar y recogieron 95,7 kg de rocas.',
    whyImportant:
      'Refutó las teorías volcánicas sobre la región de Descartes, probando que las tierras altas están dominadas por brechas de grandes impactos.',
    farewellMessage:
      'La etapa de descenso Orion y el telescopio ultravioleta dorado de John Young siguen frente a las colinas Stone Mountain.',
    legacySummary:
      'Única misión Apollo que descendió en las elevadas tierras altas centrales de la Luna y operó un telescopio astronómico desde su superficie.',
    nasaQuery: 'Apollo 16 Descartes Highlands Lunar Rover Moon',
    accentColor: '#E0F2FE',
  },
  {
    id: 'apollo17',
    name: 'Apollo 17 · Challenger y Rover LRV-3',
    agency: 'NASA',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_apollo_lrv',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Valle Taurus-Littrow',
    latDeg: 20.1908,
    lonDeg: 30.7717,
    launchYear: '1972',
    launchDate: '7 dic 1972',
    lastContactDate: '14 dic 1972',
    operationalDuration: '74 h 59 min en superficie',
    status: 'Inactivo · Últimas huellas humanas',
    whatItDid:
      'Eugene Cernan y el geólogo Harrison Schmitt recorrieron 35,9 km en el rover LRV-3, descubrieron suelo volcánico naranja y recolectaron un récord de 110,5 kg de muestras lunares.',
    whyImportant:
      'Llevó al primer geólogo profesional a otro mundo y marcó la última vez que seres humanos caminaron sobre la Luna en el siglo XX.',
    farewellMessage:
      '"As I take man\'s last step from the surface, back home for some time to come..." — Eugene Cernan.',
    legacySummary:
      'Misión récord de estancia lunar, distancia en rover y masa de rocas recolectadas en el espectacular valle Taurus-Littrow.',
    nasaQuery: 'Apollo 17 Taurus Littrow Challenger Lunar Rover',
    accentColor: '#FDE68A',
  },
  {
    id: 'lro',
    name: 'Lunar Reconnaissance Orbiter (LRO)',
    agency: 'NASA / GSFC',
    category: 'satellite',
    categoryLabel: 'Satélite',
    missionRole: 'orbital',
    craftType: 'sat_lro',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'Órbita de la Luna',
    region: 'Órbita polar lunar · 50 km de altitud',
    latDeg: 0.67,
    lonDeg: 23.47,
    launchYear: '2009',
    launchDate: '18 jun 2009',
    lastContactDate: 'Activo · Vigilancia lunar continua',
    operationalDuration: 'Más de 15 años orbitando la Luna',
    status: 'Activo · Satélite cartográfico lunar',
    whatItDid:
      'Cartografía toda la Luna en 3D con altímetro láser LOLA, mide la temperatura de cráteres polares en sombra perpetua y fotografía desde órbita todos los módulos Apollo, Lunokhod y Surveyor.',
    whyImportant:
      'Generó el mapa topográfico más preciso jamás hecho de la Luna y verificó visualmente desde órbita las huellas y módulos de todas las misiones Apollo.',
    farewellMessage:
      'Sus cámaras LROC siguen tomando imágenes diarias para preparar los alunizajes del programa Artemis.',
    legacySummary:
      'El satélite de la NASA que fotografía desde órbita lunar las huellas intactas de Apollo 11 al 17 y busca hielo de agua para futuras bases.',
    nasaQuery: 'Lunar Reconnaissance Orbiter LRO Moon Apollo site',
    accentColor: '#60A5FA',
  },
  {
    id: 'lunokhod1',
    name: 'Lunokhod 1',
    agency: 'Programa Espacial Soviético',
    category: 'rover',
    categoryLabel: 'Rover',
    missionRole: 'surface',
    craftType: 'rover_lunokhod',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Mare Imbrium',
    latDeg: 38.325,
    lonDeg: 324.992,
    launchYear: '1970',
    launchDate: '10 nov 1970',
    lastContactDate: '14 sep 1971',
    operationalDuration: '322 días terrestres',
    status: 'Inactivo · Reflector láser activo',
    whatItDid:
      'Recorrió 10,54 km en el Mare Imbrium, realizó 500 pruebas mecánicas del suelo y transmitió más de 20.000 imágenes y panorámicas.',
    whyImportant:
      'Fue el primer rover teleoperado en otro mundo; su retrorreflector láser aún sirve para medir la distancia Tierra-Luna con precisión milimétrica.',
    farewellMessage:
      'Finalizó su telemetría tras diez meses y medio de travesía; su retrorreflector francés sigue devolviendo pulsos láser desde la Tierra.',
    legacySummary:
      'Primer rover robótico teleoperado en un cuerpo celeste distinto de la Tierra. Recorrió 10,54 km y transmitió más de 20.000 imágenes.',
    nasaQuery: 'Lunokhod 1 Mare Imbrium LRO Moon',
    accentColor: '#CBD5E1',
  },
  {
    id: 'lunokhod2',
    name: 'Lunokhod 2',
    agency: 'Programa Espacial Soviético',
    category: 'rover',
    categoryLabel: 'Rover',
    missionRole: 'surface',
    craftType: 'rover_lunokhod',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Cráter Le Monnier · Mare Serenitatis',
    latDeg: 25.832,
    lonDeg: 30.908,
    launchYear: '1973',
    launchDate: '8 ene 1973',
    lastContactDate: '11 may 1973',
    operationalDuration: '115 días terrestres',
    status: 'Inactivo · Legado histórico',
    whatItDid:
      'Atravesó 39 km por el borde del cráter Le Monnier midiendo campos magnéticos, composición química del regolito y brillo del cielo lunar.',
    whyImportant:
      'Mantuvo durante 41 años el récord mundial de mayor distancia recorrida por un vehículo sobre la superficie de otro cuerpo celeste.',
    farewellMessage:
      'Su tapa solar recogió regolito lunar al rozar la pared de un cráter, cubriendo el radiador térmico y provocando el apagado definitivo.',
    legacySummary:
      'Estableció un récord de distancia fuera de la Tierra que perduró 41 años (39 km recorridos en tan solo cuatro meses lunares).',
    nasaQuery: 'Lunokhod 2 LRO Moon Le Monnier',
    accentColor: '#94A3B8',
  },
  {
    id: 'surveyor3',
    name: 'Surveyor 3',
    agency: 'NASA / JPL / Hughes',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_surveyor',
    targetBodyId: 'earth',
    targetMoonId: 'luna',
    destinationGroup: 'Luna',
    destinationLabel: 'La Luna (Tierra)',
    region: 'Oceanus Procellarum · Cráter Surveyor',
    latDeg: -3.015,
    lonDeg: 336.582,
    launchYear: '1967',
    launchDate: '17 abr 1967',
    lastContactDate: '4 may 1967',
    operationalDuration: '14 días terrestres',
    status: 'Inactivo · Visitado por Apollo 12',
    whatItDid:
      'Aterrizó en la pendiente de un cráter en Oceanus Procellarum, excavó cuatro zanjas con su pala y transmitió 6.315 fotografías.',
    whyImportant:
      'Confirmó la firmeza del suelo lunar para las misiones Apollo y en 1969 fue visitado a pie por la tripulación del Apollo 12 para traer su cámara.',
    farewellMessage:
      'Tras sobrevivir su primer día lunar, sucumbió a la gélida noche lunar; en 1969 fue inspeccionado físicamente por Pete Conrad y Alan Bean.',
    legacySummary:
      'Primer módulo estadounidense en excavar zanjas en suelo lunar. Apollo 12 aterrizó a 163 metros de distancia para recuperar su cámara de televisión.',
    nasaQuery: 'Surveyor 3 Apollo 12 Moon',
    accentColor: '#BAE6FD',
  },

  // ================= TIERRA / ÓRBITA Y TELESCOPIOS ESPACIALES =================
  {
    id: 'iss',
    name: 'Estación Espacial Internacional (ISS)',
    agency: 'NASA / ESA / JAXA / CSA / Roscosmos',
    category: 'satellite',
    categoryLabel: 'Satélite',
    missionRole: 'orbital',
    craftType: 'sat_iss',
    targetBodyId: 'earth',
    destinationGroup: 'Tierra / Órbita',
    destinationLabel: 'Órbita baja terrestre (408 km)',
    region: 'Órbita inclinada 51,6° · 27.600 km/h',
    latDeg: 28.5,
    lonDeg: -80.6,
    launchYear: '1998',
    launchDate: '20 nov 1998',
    lastContactDate: 'Activo · Presencia humana continua',
    operationalDuration: 'Más de 24 años habitada ininterrumpidamente',
    status: 'Activo · Laboratorio orbital tripulado',
    whatItDid:
      'Completa 16 amaneceres cada día a 408 km sobre la Tierra mientras sus tripulaciones realizan miles de experimentos de biomedicina, física de fluidos, astronomía y observación terrestre.',
    whyImportant:
      'Es la mayor estructura construida jamás por el ser humano en el espacio y ha mantenido presencia humana ininterrumpida fuera de la Tierra desde noviembre del año 2000.',
    farewellMessage:
      'Su cúpula de siete ventanas ofrece a los astronautas una vista ininterrumpida de la delgada atmósfera azul de la Tierra.',
    legacySummary:
      'Laboratorio orbital multinacional de 109 metros de envergadura que orbita nuestro planeta a 7,66 km/s.',
    nasaQuery: 'International Space Station ISS Earth orbit',
    accentColor: '#38BDF8',
  },
  {
    id: 'hubble',
    name: 'Telescopio Espacial Hubble',
    agency: 'NASA / ESA / STScI',
    category: 'satellite',
    categoryLabel: 'Satélite',
    missionRole: 'orbital',
    craftType: 'sat_hubble',
    targetBodyId: 'earth',
    destinationGroup: 'Tierra / Órbita',
    destinationLabel: 'Órbita terrestre (540 km)',
    region: 'Órbita baja terrestre · 540 km',
    latDeg: 28.5,
    lonDeg: -45.0,
    launchYear: '1990',
    launchDate: '24 abr 1990',
    lastContactDate: 'Activo · Más de 1,6 M observaciones',
    operationalDuration: 'Más de 34 años en servicio',
    status: 'Activo · Observatorio espacial',
    whatItDid:
      'Observa el cosmos en ultravioleta, luz visible e infrarrojo cercano libre de la turbulencia atmosférica, capturando campos profundos de galaxias y atmósferas de exoplanetas.',
    whyImportant:
      'Permitió medir con precisión la edad del universo (13.800 millones de años), descubrió la expansión acelerada por energía oscura y revolucionó nuestra visión del cosmos.',
    farewellMessage:
      'Reparado en cinco históricas caminatas espaciales del Transbordador Espacial, continúa revelando los secretos del universo.',
    legacySummary:
      'Observatorio óptico orbital de 2,4 metros que ha transformado toda la astrofísica moderna.',
    nasaQuery: 'Hubble Space Telescope orbit Earth Deep Field',
    accentColor: '#60A5FA',
  },
  {
    id: 'jwst',
    name: 'Telescopio Espacial James Webb (JWST)',
    agency: 'NASA / ESA / CSA',
    category: 'satellite',
    categoryLabel: 'Satélite',
    missionRole: 'deepspace',
    craftType: 'sat_jwst',
    targetBodyId: 'earth',
    destinationGroup: 'Espacio Profundo',
    destinationLabel: 'Punto de Lagrange Sol-Tierra L2 (1,5 M km)',
    region: 'Órbita de halo alrededor de L2',
    latDeg: 0.0,
    lonDeg: 180.0,
    launchYear: '2021',
    launchDate: '25 dic 2021',
    lastContactDate: 'Activo · Infrarrojo profundo',
    operationalDuration: 'Operativo en L2 desde 2022',
    status: 'Activo · Observatorio infrarrojo',
    whatItDid:
      'Desplegó un espejo dorado segmentado de 6,5 metros y un escudo térmico de 5 capas tamaño cancha de tenis para observar las primeras galaxias nacidas tras el Big Bang.',
    whyImportant:
      'Detecta espectros químicos de agua, metano y CO₂ en exoplanetas y penetra las nubes de polvo estelar donde nacen nuevos sistemas planetarios.',
    farewellMessage:
      'A 1,5 millones de kilómetros de la Tierra, protege sus instrumentos criogénicos a −233 °C mirando hacia el alba cósmica.',
    legacySummary:
      'El telescopio espacial más potente jamás lanzado, con 18 segmentos hexagonales de berilio recubiertos de oro.',
    nasaQuery: 'James Webb Space Telescope JWST mirrors deep field',
    accentColor: '#FACC15',
  },

  // ================= JÚPITER, SATURNO, TITÁN, VENUS, MERCURIO, PLUTÓN, COMETA Y ESPACIO PROFUNDO =================
  {
    id: 'juno',
    name: 'Sonda Juno',
    agency: 'NASA / JPL',
    category: 'satellite',
    categoryLabel: 'Satélite',
    missionRole: 'orbital',
    craftType: 'probe_juno',
    targetBodyId: 'jupiter',
    destinationGroup: 'Júpiter',
    destinationLabel: 'Órbita polar de Júpiter',
    region: 'Perijovio rasante sobre los polos de Júpiter',
    latDeg: 42.0,
    lonDeg: 120.0,
    launchYear: '2011',
    launchDate: '5 ago 2011',
    lastContactDate: 'Activo · Misión extendida a lunas',
    operationalDuration: 'En órbita joviana desde julio 2016',
    status: 'Activo · Órbita polar extrema',
    whatItDid:
      'Vuela a solo unos pocos miles de kilómetros sobre las cimas nubosas de Júpiter con tres enormes alas solares de 9 metros para sondear su gravedad, magnetosfera y ciclones polares.',
    whyImportant:
      'Primera nave impulsada por energía solar a 5,2 UA; descubrió que el núcleo de Júpiter es difuso y captó sobrevuelos cercanos de Europa, Ío y Ganimedes.',
    farewellMessage:
      'Portando tres figuras de aluminio de Galileo, Juno y Júpiter mientras desvela las profundidades del gigante rey.',
    legacySummary:
      'Reveló las geometrías hexagonales y octagonales de ciclones polares jovianos y midió el agua profunda de su atmósfera.',
    nasaQuery: 'Juno spacecraft Jupiter polar cyclones JunoCam',
    accentColor: '#FB923C',
  },
  {
    id: 'cassini',
    name: 'Cassini (Grand Finale)',
    agency: 'NASA / ESA / ASI',
    category: 'probe',
    categoryLabel: 'Sonda',
    missionRole: 'orbital',
    craftType: 'probe_cassini',
    targetBodyId: 'saturn',
    destinationGroup: 'Saturno',
    destinationLabel: 'Saturno',
    region: 'Alta atmósfera ecuatorial · Anillos de Saturno',
    latDeg: 9.4,
    lonDeg: 306.8,
    launchYear: '1997',
    launchDate: '15 oct 1997',
    lastContactDate: '15 sep 2017',
    operationalDuration: '13 años en órbita de Saturno (293 órbitas)',
    status: 'Desintegrado intencionadamente',
    whatItDid:
      'Ejecutó 293 órbitas alrededor de Saturno, liberó a Huygens sobre Titán y buceó 22 veces entre el planeta y sus anillos en el Grand Finale.',
    whyImportant:
      'Descubrió géiseres de un océano subterráneo en Encélado y mares líquidos de hidrocarburos en Titán; se sumergió en Saturno para proteger sus lunas.',
    farewellMessage:
      'Último pulso recibido en la Tierra 83 minutos después de que la nave se sumergiera como un meteoro en las nubes de Saturno.',
    legacySummary:
      'Descubrió los géiseres oceánicos de Encélado, los lagos de metano de Titán y cartografió la dinámica de los anillos con una precisión sin precedentes.',
    nasaQuery: 'Cassini Saturn Grand Finale spacecraft',
    accentColor: '#FACC15',
  },
  {
    id: 'huygens',
    name: 'Sonda Huygens',
    agency: 'ESA / NASA / ASI',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_huygens',
    targetBodyId: 'saturn',
    targetMoonId: 'titan',
    destinationGroup: 'Titán',
    destinationLabel: 'Titán (Saturno)',
    region: 'Región Adiri · Planicie de hidrocarburos',
    latDeg: -10.2,
    lonDeg: 167.6,
    launchYear: '1997',
    launchDate: '15 oct 1997',
    lastContactDate: '14 ene 2005',
    operationalDuration: '72 minutos en superficie (2 h 27 min descenso)',
    status: 'Inactivo · Legado histórico',
    whatItDid:
      'Descendió en paracaídas durante 2,5 horas atravesando la bruma naranja de Titán y transmitió imágenes y espectros desde su superficie helada.',
    whyImportant:
      'Logró el aterrizaje más lejano jamás realizado por la humanidad, revelando ríos de metano líquido y rocas de hielo de agua.',
    farewellMessage:
      'Transmitió desde el lecho helado de Titán hasta que el orbitador Cassini se ocultó bajo el horizonte de la luna.',
    legacySummary:
      'Aterrizaje más lejano jamás realizado por la humanidad (1.200 millones de km). Reveló canales fluviales de metano líquido y cantos rodados de hielo de agua.',
    nasaQuery: 'Huygens Titan surface lander',
    accentColor: '#F59E0B',
  },
  {
    id: 'venera13',
    name: 'Venera 13',
    agency: 'Programa Espacial Soviético',
    category: 'lander',
    categoryLabel: 'Lander',
    missionRole: 'surface',
    craftType: 'lander_venera',
    targetBodyId: 'venus',
    destinationGroup: 'Venus',
    destinationLabel: 'Venus',
    region: 'Phoebe Regio',
    latDeg: -7.5,
    lonDeg: 303.0,
    launchYear: '1981',
    launchDate: '30 oct 1981',
    lastContactDate: '1 mar 1982',
    operationalDuration: '127 minutos en superficie',
    status: 'Inactivo · Legado histórico',
    whatItDid:
      'Sobrevivió 127 minutos a 457 °C y 89 atmósferas en Phoebe Regio, perforó la roca basáltica venusiana y transmitió panorámicas del suelo.',
    whyImportant:
      'Obtuvo las primeras fotografías en color y el primer registro acústico de la superficie de Venus antes de fundirse bajo su presión infernal.',
    farewellMessage:
      'Aplastada y fundida gradualmente bajo 89 atmósferas y 457 °C tras cuadruplicar su esperanza de vida térmica de 32 minutos.',
    legacySummary:
      'Capturó las primeras fotografías panorámicas en color y grabó por primera vez el sonido del viento y los impactos en la superficie de Venus.',
    nasaQuery: 'Venus surface Venera Magellan radar',
    accentColor: '#EAB308',
  },
  {
    id: 'messenger',
    name: 'MESSENGER',
    agency: 'NASA / APL',
    category: 'probe',
    categoryLabel: 'Sonda',
    missionRole: 'orbital',
    craftType: 'probe_messenger',
    targetBodyId: 'mercury',
    destinationGroup: 'Mercurio',
    destinationLabel: 'Mercurio',
    region: 'Planicie Shakespeare · Cuenca de impacto',
    latDeg: 54.4,
    lonDeg: 210.1,
    launchYear: '2004',
    launchDate: '3 ago 2004',
    lastContactDate: '30 abr 2015',
    operationalDuration: '4 años y 1 mes en órbita',
    status: 'Inactivo · Cráter de impacto',
    whatItDid:
      'Completó 4.104 órbitas alrededor de Mercurio midiendo su campo magnético asimétrico, composición superficial y topografía global completa.',
    whyImportant:
      'Fue la primera nave en orbitar Mercurio y descubrió hielo de agua en los cráteres polares permanentemente en sombra pese a su cercanía al Sol.',
    farewellMessage:
      'Impactó contra el hemisferio oculto de Mercurio a 14.080 km/h al consumir las últimas reservas de helio de sus propulsores.',
    legacySummary:
      'Primera nave en orbitar Mercurio. Cartografió el 100 % del planeta y descubrió hielo de agua en los cráteres polares permanentemente en sombra.',
    nasaQuery: 'MESSENGER Mercury spacecraft',
    accentColor: '#94A3B8',
  },
  {
    id: 'rosetta_philae',
    name: 'Rosetta y Philae',
    agency: 'ESA',
    category: 'probe',
    categoryLabel: 'Sonda',
    missionRole: 'surface',
    craftType: 'lander_philae',
    targetBodyId: 'comet67p',
    destinationGroup: 'Cometa 67P',
    destinationLabel: 'Cometa 67P/C-G',
    region: 'Región Abydos / Ma\'at · Lóbulo menor',
    latDeg: -8.0,
    lonDeg: 330.0,
    launchYear: '2004',
    launchDate: '2 mar 2004',
    lastContactDate: '30 sep 2016',
    operationalDuration: '12 años y 6 meses de misión',
    status: 'Inactivos sobre el cometa 67P',
    whatItDid:
      'Acompañó al cometa 67P en su paso alrededor del Sol durante más de dos años y desplegó al módulo Philae sobre su núcleo bilobulado.',
    whyImportant:
      'Logró el primer aterrizaje controlado sobre un cometa y halló aminoácidos y moléculas orgánicas previas al origen de los planetas.',
    farewellMessage:
      'Rosetta tocó suavemente la superficie del cometa 67P a 3,2 km/h y apagó su transmisor para descansar junto al módulo Philae.',
    legacySummary:
      'Primera misión en orbitar un cometa y posar un módulo sobre su núcleo, analizando compuestos orgánicos primigenios del nacimiento del Sistema Solar.',
    nasaQuery: 'Rosetta Philae comet 67P ESA',
    accentColor: '#67E8F9',
  },
  {
    id: 'newhorizons',
    name: 'New Horizons',
    agency: 'NASA / APL / SwRI',
    category: 'probe',
    categoryLabel: 'Sonda',
    missionRole: 'orbital',
    craftType: 'probe_newhorizons',
    targetBodyId: 'pluto',
    destinationGroup: 'Plutón',
    destinationLabel: 'Plutón y Cinturón de Kuiper',
    region: 'Sobrevuelo de Sputnik Planitia · 58+ UA',
    latDeg: 14.0,
    lonDeg: 175.0,
    launchYear: '2006',
    launchDate: '19 ene 2006',
    lastContactDate: 'Activo · Cinturón de Kuiper',
    operationalDuration: 'Más de 19 años hacia el borde exterior',
    status: 'Activo · Exploración del Cinturón de Kuiper',
    whatItDid:
      'Realizó el histórico primer sobrevuelo de Plutón y Caronte en 2015 a 58.000 km/h y después visitó el objeto primordial Arrokoth en pleno Cinturón de Kuiper.',
    whyImportant:
      'Reveló que Plutón es un mundo geológicamente vivo con montañas de hielo de agua y glaciares activos de nitrógeno formando un inmenso corazón blanco.',
    farewellMessage:
      'Continúa midiendo el polvo y viento solar en las profundidades heladas más allá de Neptuno y Plutón.',
    legacySummary:
      'Completó la primera exploración inicial de los mundos clásicos del Sistema Solar y envió las primeras fotografías nítidas de Plutón.',
    nasaQuery: 'New Horizons Pluto Sputnik Planitia spacecraft',
    accentColor: '#E2B48D',
  },
  {
    id: 'voyager1',
    name: 'Voyager 1',
    agency: 'NASA / JPL',
    category: 'probe',
    categoryLabel: 'Sonda',
    missionRole: 'deepspace',
    craftType: 'probe_voyager',
    targetBodyId: 'neptune',
    destinationGroup: 'Espacio Profundo',
    destinationLabel: 'Espacio Interestelar · 166 UA',
    region: 'Más allá de la heliopausa · 24.800 M km',
    latDeg: 35.0,
    lonDeg: 255.0,
    launchYear: '1977',
    launchDate: '5 sep 1977',
    lastContactDate: 'Activo · Más de 47 años volando',
    operationalDuration: 'Objeto humano más lejano de la historia',
    status: 'Activo · Espacio interestelar',
    whatItDid:
      'Descubrió los volcanes activos de Ío en Júpiter, estudió los anillos de Saturno, tomó el icónico retrato "Un Punto Azul Pálido" y cruzó la heliopausa en 2012.',
    whyImportant:
      'Es la primera nave humana en entrar al espacio interestelar, portando el Disco de Oro con sonidos y música de la Tierra para cualquier civilización futura.',
    farewellMessage:
      '"Look again at that dot. That\'s here. That\'s home. That\'s us." — Carl Sagan (Voyager 1, 1990)',
    legacySummary:
      'Emisario interestelar a casi 23 horas-luz de distancia que sigue enviando datos de rayos cósmicos desde fuera de la burbuja solar.',
    nasaQuery: 'Voyager 1 Pale Blue Dot interstellar Golden Record',
    accentColor: '#93C5FD',
  },
  {
    id: 'voyager2',
    name: 'Voyager 2',
    agency: 'NASA / JPL',
    category: 'probe',
    categoryLabel: 'Sonda',
    missionRole: 'deepspace',
    craftType: 'probe_voyager',
    targetBodyId: 'neptune',
    destinationGroup: 'Espacio Profundo',
    destinationLabel: 'Espacio Interestelar · 139 UA',
    region: 'Espacio interestelar · 20.800 M km',
    latDeg: -55.0,
    lonDeg: 300.0,
    launchYear: '1977',
    launchDate: '20 ago 1977',
    lastContactDate: 'Activo · Grand Tour completado',
    operationalDuration: 'Más de 47 años de exploración continua',
    status: 'Activo · Espacio interestelar',
    whatItDid:
      'Ejecutó el irrepetible "Grand Tour" visitando Júpiter, Saturno, Urano (1986) y Neptuno (1989), descubriendo géiseres en Tritón y decenas de nuevas lunas.',
    whyImportant:
      'Sigue siendo la única nave en la historia que ha visitado Urano y Neptuno; desde 2018 mide el plasma interestelar desde fuera de la heliosfera.',
    farewellMessage:
      'Portando su propio Disco de Oro hacia las estrellas del hemisferio sur tras completar el Grand Tour planetario.',
    legacySummary:
      'Única exploradora de los cuatro gigantes gaseosos y helados del Sistema Solar exterior.',
    nasaQuery: 'Voyager 2 Neptune Uranus Grand Tour spacecraft',
    accentColor: '#60A5FA',
  },
];
