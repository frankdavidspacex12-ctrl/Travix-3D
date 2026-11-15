// English for the "Why it was left there" notes (Spanish original in data/leftBehindNotes.ts).
import type { LeftBehindNote } from '../data/leftBehindNotes';

const LM =
  'The descent stage of the lunar module served as a launch pad: the ascent stage lifted off from it with the astronauts, and the base stayed on the Moon. Leaving it behind made the spacecraft much lighter for the trip back to orbit.';
const ALSEP_LEFT =
  'The astronauts also left science experiments running (ALSEP: seismometers, heat-flow probes and more) that sent data to Earth until NASA switched them off in 1977.';
const LRV_LEFT =
  'The electric Lunar Roving Vehicle (LRV) stayed parked near the lander: it weighed about 210 kg and there was no room or fuel to bring it back.';
const LRV =
  'The electric Lunar Roving Vehicle weighed about 210 kg and the ascent stage had no room or fuel to bring it back. Before liftoff, the astronauts parked it some distance away and aimed its camera to film the lunar module\'s liftoff; then it stayed in that spot forever.';
const ALSEP =
  'The station was left on purpose: its job was to keep measuring the Moon after the astronauts left. It ran on a nuclear generator (RTG) and sent data to Earth for years, until on September 30, 1977 NASA switched off the whole ALSEP network for lack of budget. Its equipment is still spread out on the lunar soil.';
const SURVEYOR =
  'The Surveyor probes were one-way trips: they had no way of returning to Earth. Their job was to prove a soft landing on the Moon was possible and to study the soil before sending astronauts. They ran on solar power, so the freezing lunar nights eventually shut them down, and they stayed at their landing sites.';

export const NOTES_EN: Record<string, Pick<LeftBehindNote, 'leftBehind'> & { farewellNote?: string }> = {
  apollo11: {
    leftBehind: `${LM} Armstrong and Aldrin also left a seismometer and a laser retroreflector; the retroreflector is still used to measure the distance between Earth and the Moon.`,
  },
  apollo12: { leftBehind: `${LM} ${ALSEP_LEFT}` },
  apollo14: { leftBehind: `${LM} ${ALSEP_LEFT}` },
  apollo15: { leftBehind: `${LM} ${LRV_LEFT} ${ALSEP_LEFT}` },
  apollo16: { leftBehind: `${LM} ${LRV_LEFT} ${ALSEP_LEFT}` },
  apollo17: { leftBehind: `${LM} ${LRV_LEFT} ${ALSEP_LEFT}` },
  surveyor3: {
    leftBehind:
      'It was a one-way probe: it was not built to lift off again. Its job was to prove a soft landing on the Moon was possible and to study the soil before sending astronauts. It stopped working when the lunar night came, and in 1969 the Apollo 12 astronauts visited it and took parts home to study.',
  },
  sojourner: {
    leftBehind:
      'The rover and its Pathfinder lander were a one-way trip: there was no way to bring them back. Sojourner talked to Earth through the lander; when Pathfinder stopped transmitting in September 1997, both fell silent in Ares Vallis.',
  },
  spirit: {
    leftBehind:
      'In 2009 it got stuck in soft sand. Unable to tilt its solar panels toward the Sun during the Martian winter, it ran out of power; its last contact was on March 22, 2010, and NASA ended the mission in 2011.',
  },
  opportunity: {
    leftBehind:
      'In June 2018 a dust storm covered all of Mars and blocked out the Sun: its solar panels stopped producing power and the rover fell silent. NASA sent it more than a thousand commands to wake it up and ended the mission in February 2019.',
    farewellNote:
      'This is not a message the rover sent: it is a poetic interpretation, made popular in 2019, of its last data (low battery and a sky darkened by dust).',
  },
  phoenix: {
    leftBehind:
      'It was designed to work about three months in the Martian Arctic; it worked almost five. When winter came, the low light and the ice on its solar panels left it without power, and it never woke up again.',
  },
  insight: {
    leftBehind:
      'Martian dust slowly piled up on its solar panels and they made less and less power. In December 2022 it ran out of power and NASA declared the mission over.',
    farewellNote:
      'A phrase posted by the mission team on InSight\'s official social media account; it was not transmitted by the robot.',
  },
  perseverance: {
    leftBehind:
      'Perseverance is still active. The Ingenuity helicopter that arrived with it made 72 flights (it was planned for up to 5). On its last flight, in January 2024, its rotor blades were damaged and it could no longer fly: it stayed as a motionless artifact in Jezero Crater.',
  },
  surveyor1: {
    leftBehind:
      'Like every Surveyor, it was a one-way probe: it had no way to lift off again. It was the first US spacecraft to soft-land on the Moon (June 2, 1966) and showed the lunar soil could hold up a spacecraft, which was key before sending astronauts. It kept sending photos for several lunar days, until January 1967.',
  },
  alsep_apollo12: {
    leftBehind:
      'The Apollo 12 astronauts set it up on purpose so it would keep measuring the Moon after they left: a seismometer, a magnetometer, solar wind and gas detectors, powered by a nuclear generator (RTG). It worked for years until, on September 30, 1977, NASA switched off all ALSEP stations for lack of budget. Its equipment is still spread out on the ground.',
  },
  viking1: {
    leftBehind:
      'It was a one-way lander, built to stay where it landed. It was meant to work 90 days, but its nuclear generators (RTG) kept it running for more than six years. The end was not wear and tear: in November 1982 a software update sent from Earth mistakenly pointed its antenna away from our planet, and contact was lost forever on November 13, 1982.',
  },
  viking2: {
    leftBehind:
      'Like Viking 1, it was a one-way lander and stayed exactly where it landed. It worked 1,281 Martian days until its batteries failed, and NASA shut it down on April 11, 1980.',
  },
  ingenuity: {
    leftBehind:
      'It was a technology test planned for up to 5 flights, and it ended up making 72 in almost three years. On its last flight, on January 18, 2024, its rotor blades were damaged while landing and it could no longer fly. There was no way to repair it, so it stayed still where it last landed, while Perseverance drives on.',
  },
  near_shoemaker: {
    leftBehind:
      'NEAR was designed to orbit asteroid Eros, not to land. At the end of its mission, with little fuel left, the team decided to try a slow descent on February 12, 2001. It survived touchdown and kept sending data from the surface for about two weeks, until its last signal on February 28, 2001. It is still there, on Eros.',
  },
  dawn: {
    leftBehind:
      'Dawn used a fuel (hydrazine) to point its antenna and solar panels; when it ran out in 2018, it could no longer talk to Earth or charge its batteries. NASA did not crash it into Ceres on purpose: it left it in a stable orbit that will keep it around Ceres for decades, so it will not contaminate a world that may have salty water under its surface.',
  },
  pioneer10: {
    leftBehind:
      'The Pioneers were not built to come back: after passing Jupiter (1973) it was moving so fast it escaped the Sun\'s gravity. Its power came from nuclear generators that weakened over the years; its last signal, too faint by then, arrived on January 23, 2003. It keeps traveling in silence and carries a plaque with a message for whoever finds it.',
  },
  pioneer11: {
    leftBehind:
      'After visiting Jupiter (1974) and becoming the first spacecraft to pass Saturn (1979), it was left on a path out of the Solar System, with no way back. Its nuclear generator lost power until it could no longer operate: NASA ended its mission on September 30, 1995, and all contact was lost soon after. It carries the same plaque as Pioneer 10.',
  },
  lrv1: { leftBehind: LRV },
  lrv2: { leftBehind: LRV },
  lrv3: { leftBehind: LRV },
  alsep_apollo14: { leftBehind: ALSEP },
  alsep_apollo15: { leftBehind: ALSEP },
  alsep_apollo16: { leftBehind: ALSEP },
  alsep_apollo17: { leftBehind: ALSEP },
  surveyor5: { leftBehind: SURVEYOR },
  surveyor6: {
    leftBehind: `Until Surveyor 6 no spacecraft had ever lifted off from the Moon, but its "hop" was only a 3-4 meter test: it had neither the fuel nor the design to return to Earth. ${SURVEYOR}`,
  },
  surveyor7: { leftBehind: SURVEYOR },
  pathfinder: {
    leftBehind:
      'It was a one-way lander: it had no way to lift off from Mars. It was designed to work for one month and lasted almost three, as the base station and antenna for the Sojourner rover. Contact was lost on September 27, 1997; according to NSSDCA the cause was never confirmed, although the most cited explanation is that its battery ran out and the night cold damaged its systems.',
  },
  kepler: {
    leftBehind:
      'Kepler did not orbit Earth but the Sun, trailing farther and farther behind our planet, so no one could go and refuel it. In October 2018 it ran out of the fuel it used to point its telescope and NASA retired it; on November 15, 2018 it received its last commands to switch off its transmitters. Today it drifts without power around the Sun.',
  },
};

/** Spanish source labels → English (the NASA/NSSDCA titles themselves are already in English). */
export function sourceLabelEn(label: string): string {
  return label
    .replace(' y Sojourner', ' and Sojourner')
    .replace('Spirit y Opportunity', 'Spirit and Opportunity')
    .replace('Helicóptero Ingenuity', 'Ingenuity Helicopter')
    .replace('(visitado por Apollo 12)', '(visited by Apollo 12)')
    .replace('(incluye el LRV)', '(includes the LRV)')
    .replace('(enlace del reto para Phoenix e InSight)', '(challenge link for Phoenix and InSight)')
    .replace('(Lunar Module, ALSEP y LRV)', '(Lunar Module, ALSEP and LRV)');
}

/** La nota en el idioma pedido (en inglés, con respaldo en español). */
export function noteText(id: string, note: LeftBehindNote | undefined, lang: 'en' | 'es'): LeftBehindNote | undefined {
  if (!note || lang === 'es') return note;
  const en = NOTES_EN[id];
  return {
    ...note,
    leftBehind: en?.leftBehind ?? note.leftBehind,
    farewellNote: note.farewellNote ? en?.farewellNote ?? note.farewellNote : undefined,
    sources: note.sources.map((s) => ({ ...s, label: sourceLabelEn(s.label) })),
  };
}
