// Notas del reto «Abandonados pero no olvidados» para las fichas que ya existen en la app.
// Cada nota explica, con palabras para estudiantes, POR QUÉ el equipo quedó donde está y
// enlaza la fuente oficial NASA/NSSDCA (las mismas que lista la pestaña Resources del reto).
// Los enlaces necesitan internet; el resto de la ficha sigue funcionando sin conexión.

export interface MissionSource {
  label: string;
  url: string;
}

export interface LeftBehindNote {
  /** Por qué el equipo se quedó allí (decisión de ingeniería o causa del final). */
  leftBehind: string;
  /** Aclaración sobre la frase de despedida cuando no es una transmisión literal. */
  farewellNote?: string;
  sources: MissionSource[];
}

const NSSDC = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=';
const SCI = 'https://science.nasa.gov/mission/';

const APOLLO_DESCENT =
  'La etapa de descenso del módulo lunar sirvió de plataforma de lanzamiento: la etapa de ascenso despegó desde ella con los astronautas y la base se quedó en la Luna. Dejarla atrás hacía la nave mucho más liviana para volver a la órbita.';
const ALSEP =
  'Los astronautas también dejaron instalados experimentos científicos (ALSEP: sismómetros, medidores de calor y otros) que enviaron datos a la Tierra hasta que la NASA los apagó en 1977.';
const LRV =
  'El rover lunar eléctrico (LRV) se quedó aparcado cerca del módulo: pesaba unos 210 kg y no había espacio ni combustible para traerlo de vuelta.';

export const LEFT_BEHIND_NOTES: Record<string, LeftBehindNote> = {
  apollo11: {
    leftBehind:
      APOLLO_DESCENT +
      ' Armstrong y Aldrin dejaron además un sismómetro y un retrorreflector láser; el retrorreflector todavía se usa para medir la distancia entre la Tierra y la Luna.',
    sources: [{ label: 'NSSDCA · Apollo 11 Lunar Module / EASEP', url: NSSDC + '1969-059C' }],
  },
  apollo12: {
    leftBehind: APOLLO_DESCENT + ' ' + ALSEP,
    sources: [
      { label: 'NSSDCA · Apollo 12 Lunar Module / ALSEP', url: NSSDC + '1969-099C' },
      { label: 'NASA · Surveyor 3 (visitado por Apollo 12)', url: SCI + 'surveyor-3/' },
    ],
  },
  apollo14: {
    leftBehind: APOLLO_DESCENT + ' ' + ALSEP,
    sources: [{ label: 'NSSDCA · Apollo 14 Lunar Module / ALSEP', url: NSSDC + '1971-008C' }],
  },
  apollo15: {
    leftBehind: APOLLO_DESCENT + ' ' + LRV + ' ' + ALSEP,
    sources: [{ label: 'NSSDCA · Apollo 15 Lunar Module / ALSEP (incluye el LRV)', url: NSSDC + '1971-063C' }],
  },
  apollo16: {
    leftBehind: APOLLO_DESCENT + ' ' + LRV + ' ' + ALSEP,
    sources: [{ label: 'NSSDCA · Apollo 16 Lunar Module / ALSEP', url: NSSDC + '1972-031C' }],
  },
  apollo17: {
    leftBehind: APOLLO_DESCENT + ' ' + LRV + ' ' + ALSEP,
    sources: [{ label: 'NSSDCA · Apollo 17 Lunar Module / ALSEP', url: NSSDC + '1972-096C' }],
  },
  surveyor3: {
    leftBehind:
      'Era una sonda de un solo viaje: no estaba hecha para despegar otra vez. Su trabajo era demostrar que se podía aterrizar suave en la Luna y estudiar el suelo antes de enviar astronautas. Dejó de funcionar al llegar la noche lunar, y en 1969 los astronautas del Apolo 12 la visitaron y se llevaron piezas para estudiarlas.',
    sources: [{ label: 'NASA · Surveyor 3', url: SCI + 'surveyor-3/' }],
  },
  sojourner: {
    leftBehind:
      'El rover y su módulo de aterrizaje Pathfinder eran de un solo viaje: no había forma de traerlos de vuelta. Sojourner hablaba con la Tierra a través del módulo; cuando Pathfinder dejó de transmitir en septiembre de 1997, los dos quedaron en silencio en Ares Vallis.',
    sources: [{ label: 'NASA · Mars Pathfinder y Sojourner', url: SCI + 'mars-pathfinder/' }],
  },
  spirit: {
    leftBehind:
      'En 2009 quedó atascado en arena blanda. Sin poder inclinar sus paneles solares hacia el Sol durante el invierno marciano, se quedó sin energía; su último contacto fue el 22 de marzo de 2010 y la NASA dio por terminada la misión en 2011.',
    sources: [{ label: 'NASA · Spirit y Opportunity', url: SCI + 'mars-exploration-rovers-spirit-and-opportunity/' }],
  },
  opportunity: {
    leftBehind:
      'En junio de 2018 una tormenta de polvo cubrió todo Marte y tapó el Sol: sus paneles solares dejaron de producir energía y el rover se quedó en silencio. La NASA le envió más de mil órdenes para despertarlo y en febrero de 2019 dio por terminada la misión.',
    farewellNote:
      'No es un mensaje que haya enviado el rover: es una interpretación poética, popularizada en 2019, de sus últimos datos (batería baja y cielo oscurecido por el polvo).',
    sources: [{ label: 'NASA · Spirit y Opportunity', url: SCI + 'mars-exploration-rovers-spirit-and-opportunity/' }],
  },
  phoenix: {
    leftBehind:
      'Estaba diseñado para trabajar unos tres meses en el Ártico marciano; trabajó cerca de cinco. Al llegar el invierno, la poca luz y el hielo sobre sus paneles solares lo dejaron sin energía y nunca volvió a despertar.',
    sources: [
      { label: 'NASA · Phoenix', url: SCI + 'phoenix/' },
      { label: 'NASA · InSight (enlace del reto para Phoenix e InSight)', url: SCI + 'insight/' },
    ],
  },
  insight: {
    leftBehind:
      'El polvo marciano se fue acumulando sobre sus paneles solares y cada vez producían menos energía. En diciembre de 2022 se quedó sin energía y la NASA declaró terminada la misión.',
    farewellNote:
      'Frase publicada por el equipo de la misión en la cuenta oficial de InSight en redes sociales; no fue transmitida por el robot.',
    sources: [{ label: 'NASA · InSight', url: SCI + 'insight/' }],
  },
  perseverance: {
    leftBehind:
      'Perseverance sigue activo. El helicóptero Ingenuity, que llegó con él, hizo 72 vuelos (estaba previsto que hiciera hasta 5). En su último vuelo, en enero de 2024, se dañaron las palas de su rotor y ya no pudo volar: quedó como un artefacto inmóvil en el cráter Jezero.',
    sources: [
      { label: 'NASA · Helicóptero Ingenuity', url: SCI + 'mars-2020-perseverance/ingenuity-mars-helicopter/' },
      { label: 'NASA · Perseverance', url: SCI + 'mars-2020-perseverance/' },
    ],
  },

  // ---------- Fichas agregadas en el commit 3fafe86 ----------
  surveyor1: {
    leftBehind:
      'Como todas las Surveyor, era una sonda de un solo viaje: no tenía cómo despegar de nuevo. Fue la primera nave de EE. UU. en aterrizar suave en la Luna (2 de junio de 1966) y demostró que el suelo lunar podía sostener una nave, algo clave antes de enviar astronautas. Siguió enviando fotos durante varios días lunares hasta enero de 1967.',
    sources: [
      { label: 'NSSDCA · Surveyor 1', url: NSSDC + '1966-045A' },
      { label: 'NASA · Surveyor 1', url: SCI + 'surveyor-1/' },
    ],
  },
  alsep_apollo12: {
    leftBehind:
      'Los astronautas del Apolo 12 la instalaron a propósito para que siguiera midiendo la Luna cuando ellos se fueran: sismómetro, magnetómetro, detectores de viento solar y de gases, alimentados por un generador nuclear (RTG). Funcionó durante años hasta que, el 30 de septiembre de 1977, la NASA apagó todas las estaciones ALSEP por falta de presupuesto. Sus equipos siguen extendidos sobre el suelo.',
    sources: [{ label: 'NSSDCA · Apollo 12 Lunar Module / ALSEP', url: NSSDC + '1969-099C' }],
  },
  viking1: {
    leftBehind:
      'Era un módulo de un solo viaje, hecho para quedarse donde aterrizó. Debía trabajar 90 días, pero sus generadores nucleares (RTG) lo mantuvieron activo más de seis años. El final no fue por desgaste: en noviembre de 1982 una actualización de software enviada desde la Tierra apuntó por error su antena fuera de nuestro planeta, y el contacto se perdió para siempre el 13 de noviembre de 1982.',
    sources: [
      { label: 'NSSDCA · Viking 1 Lander', url: NSSDC + '1975-075C' },
      { label: 'NASA · Viking 1', url: SCI + 'viking-1/' },
    ],
  },
  viking2: {
    leftBehind:
      'Como Viking 1, era de un solo viaje y quedó exactamente donde aterrizó. Trabajó 1.281 días marcianos hasta que sus baterías fallaron, y la NASA lo apagó el 11 de abril de 1980.',
    sources: [
      { label: 'NSSDCA · Viking 2 Lander', url: NSSDC + '1975-083C' },
      { label: 'NASA · Viking 2', url: SCI + 'viking-2/' },
    ],
  },
  ingenuity: {
    leftBehind:
      'Era una prueba de tecnología pensada para hasta 5 vuelos, y terminó haciendo 72 en casi tres años. En su último vuelo, el 18 de enero de 2024, se dañaron las palas de su rotor al aterrizar y ya no pudo volar. No había forma de repararlo, así que quedó inmóvil donde aterrizó por última vez, mientras Perseverance sigue su camino.',
    sources: [
      { label: 'NASA · Helicóptero Ingenuity', url: SCI + 'mars-2020-perseverance/ingenuity-mars-helicopter/' },
    ],
  },
  near_shoemaker: {
    leftBehind:
      'NEAR fue diseñada para orbitar el asteroide Eros, no para aterrizar. Al terminar su misión, con poco combustible, el equipo decidió intentar un descenso lento el 12 de febrero de 2001. Sobrevivió al contacto y siguió enviando datos desde la superficie unas dos semanas, hasta su última señal el 28 de febrero de 2001. Allí sigue, sobre Eros.',
    sources: [
      { label: 'NSSDCA · NEAR Shoemaker', url: NSSDC + '1996-008A' },
      { label: 'NASA · NEAR Shoemaker', url: SCI + 'near-shoemaker/' },
    ],
  },
  dawn: {
    leftBehind:
      'Dawn usaba un combustible (hidracina) para orientar su antena y sus paneles; cuando se le acabó, en 2018, ya no pudo comunicarse ni cargar energía. La NASA no la estrelló contra Ceres a propósito: la dejó en una órbita estable que la mantendrá alrededor de Ceres por décadas, para no contaminar un mundo que podría tener agua salada bajo su superficie.',
    sources: [
      { label: 'NSSDCA · Dawn', url: NSSDC + '2007-043A' },
      { label: 'NASA · Dawn', url: SCI + 'dawn/' },
    ],
  },
  pioneer10: {
    leftBehind:
      'Las Pioneer no estaban hechas para volver: tras pasar junto a Júpiter (1973) iban tan rápido que escaparon de la gravedad del Sol. Su energía venía de generadores nucleares que se fueron debilitando con los años; su última señal, ya demasiado débil, llegó el 23 de enero de 2003. Sigue viajando en silencio y lleva una placa con un mensaje para quien la encuentre.',
    sources: [
      { label: 'NSSDCA · Pioneer 10', url: NSSDC + '1972-012A' },
      { label: 'NASA · Pioneer 10', url: SCI + 'pioneer-10/' },
    ],
  },
  pioneer11: {
    leftBehind:
      'Después de visitar Júpiter (1974) y ser la primera nave en pasar junto a Saturno (1979), quedó en una trayectoria de salida del sistema solar, sin forma de volver. Su generador nuclear perdió potencia hasta que ya no alcanzaba para operar: la NASA terminó su misión el 30 de septiembre de 1995 y poco después se perdió todo contacto. Lleva la misma placa que Pioneer 10.',
    sources: [
      { label: 'NSSDCA · Pioneer 11', url: NSSDC + '1973-019A' },
      { label: 'NASA · Pioneer 11', url: SCI + 'pioneer-11/' },
    ],
  },
  kepler: {
    leftBehind:
      'Kepler no orbitaba la Tierra sino el Sol, siguiendo a nuestro planeta cada vez más lejos, así que nadie podía ir a cargarle combustible. En octubre de 2018 se le acabó el combustible que usaba para apuntar su telescopio y la NASA lo retiró; el 15 de noviembre de 2018 recibió sus últimas órdenes para apagar sus transmisores. Hoy deriva sin energía alrededor del Sol.',
    sources: [
      { label: 'NSSDCA · Kepler', url: NSSDC + '2009-011A' },
      { label: 'NASA · Kepler', url: SCI + 'kepler/' },
    ],
  },
};

export function getLeftBehindNote(missionId: string): LeftBehindNote | undefined {
  return LEFT_BEHIND_NOTES[missionId];
}
