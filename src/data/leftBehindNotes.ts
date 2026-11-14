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
};

export function getLeftBehindNote(missionId: string): LeftBehindNote | undefined {
  return LEFT_BEHIND_NOTES[missionId];
}
