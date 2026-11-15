// Space glossary for students, in English and Spanish. «basics» comes from the team's glossary;
// «hardware» are the words that explain the equipment left behind (the challenge). `go` opens the
// place in 3D where the word can be seen, like the guided tours.
import type { GuidedTourTarget } from './guidedToursData';

export type GlossaryCategory = 'basics' | 'hardware';

export interface GlossaryTerm {
  id: string;
  category: GlossaryCategory;
  es: { term: string; def: string };
  en: { term: string; def: string };
  go?: GuidedTourTarget;
  /** Name of the place `go` opens, per language */
  goLabel?: { es: string; en: string };
}

const m = (missionId: string): GuidedTourTarget => ({ kind: 'mission', missionId });
const b = (bodyId: Extract<GuidedTourTarget, { kind: 'body' }>['bodyId']): GuidedTourTarget => ({ kind: 'body', bodyId });
const d = (id: Extract<GuidedTourTarget, { kind: 'deepspace' }>['id']): GuidedTourTarget => ({ kind: 'deepspace', id });
const MOON: GuidedTourTarget = { kind: 'moon', bodyId: 'earth', moonId: 'luna' };

type Pair = [string, string];
const T = (
  id: string,
  category: GlossaryCategory,
  es: Pair,
  en: Pair,
  go?: GuidedTourTarget,
  goLabel?: Pair,
): GlossaryTerm => ({
  id,
  category,
  es: { term: es[0], def: es[1] },
  en: { term: en[0], def: en[1] },
  go,
  goLabel: goLabel ? { es: goLabel[0], en: goLabel[1] } : undefined,
});

export const GLOSSARY: GlossaryTerm[] = [
  // ── Basics (team glossary) ──────────────────────────────────────────────
  T('astronaut', 'basics', ['Astronauta', 'Persona entrenada para viajar y trabajar en el espacio.'], ['Astronaut', 'A person trained to travel and work in space.'], m('iss'), ['Estación Espacial', 'Space Station']),
  T('planet', 'basics', ['Planeta', 'Cuerpo grande y redondo que gira alrededor de una estrella, como la Tierra alrededor del Sol.'], ['Planet', 'A large, round body that goes around a star, like Earth around the Sun.'], b('earth'), ['La Tierra', 'Earth']),
  T('dwarf_planet', 'basics', ['Planeta enano', 'Cuerpo redondo que gira alrededor del Sol pero no ha despejado su camino de otros objetos. Plutón y Ceres lo son.'], ['Dwarf planet', 'A round body that goes around the Sun but has not cleared its path of other objects. Pluto and Ceres are dwarf planets.'], b('pluto'), ['Plutón', 'Pluto']),
  T('star', 'basics', ['Estrella', 'Gran esfera de gas muy caliente que produce su propia luz y calor. El Sol es una estrella.'], ['Star', 'A huge ball of very hot gas that makes its own light and heat. The Sun is a star.'], b('sun'), ['El Sol', 'The Sun']),
  T('sun', 'basics', ['Sol', 'La estrella que ilumina y da energía a nuestro planeta. Tiene casi toda la masa del Sistema Solar.'], ['Sun', 'The star that lights and powers our planet. It holds almost all the mass of the Solar System.'], b('sun'), ['El Sol', 'The Sun']),
  T('moon', 'basics', ['Luna', 'Cuerpo natural que gira alrededor de un planeta. La Luna es el satélite natural de la Tierra.'], ['Moon', 'A natural body that goes around a planet. The Moon is Earth’s natural satellite.'], MOON, ['La Luna', 'The Moon']),
  T('satellite', 'basics', ['Satélite', 'Objeto que gira alrededor de un planeta. Puede ser natural, como la Luna, o artificial, como el telescopio Hubble.'], ['Satellite', 'An object that goes around a planet. It can be natural, like the Moon, or artificial, like the Hubble telescope.'], m('hubble'), ['Hubble', 'Hubble']),
  T('rocket', 'basics', ['Cohete', 'Vehículo que empuja gases muy rápido hacia atrás para subir y llevar personas o equipos al espacio.'], ['Rocket', 'A vehicle that pushes gases backward very fast to climb and carry people or equipment into space.']),
  T('spacecraft', 'basics', ['Nave espacial', 'Vehículo diseñado para viajar y trabajar en el espacio, con o sin personas a bordo.'], ['Spacecraft', 'A vehicle designed to travel and work in space, with or without people on board.'], m('voyager1'), ['Voyager 1', 'Voyager 1']),
  T('nasa', 'basics', ['NASA', 'Agencia espacial de Estados Unidos que explora el espacio e investiga la Tierra y el universo.'], ['NASA', 'The United States space agency, which explores space and studies Earth and the universe.']),
  T('galaxy', 'basics', ['Galaxia', 'Enorme conjunto de estrellas, planetas, gas y polvo unidos por la gravedad.'], ['Galaxy', 'A huge group of stars, planets, gas and dust held together by gravity.'], d('milkyway'), ['Vía Láctea', 'Milky Way']),
  T('milky_way', 'basics', ['Vía Láctea', 'La galaxia donde está nuestro Sistema Solar. Tiene miles de millones de estrellas, y una de ellas es el Sol.'], ['Milky Way', 'The galaxy where our Solar System is. It has billions of stars, and one of them is the Sun.'], d('milkyway'), ['Vía Láctea', 'Milky Way']),
  T('solar_system', 'basics', ['Sistema Solar', 'El Sol y todo lo que gira a su alrededor: planetas, lunas, asteroides y cometas.'], ['Solar System', 'The Sun and everything that goes around it: planets, moons, asteroids and comets.'], b('sun'), ['El Sol', 'The Sun']),
  T('comet', 'basics', ['Cometa', 'Cuerpo de hielo, polvo y roca. Cerca del Sol se calienta y forma una cola brillante que apunta lejos del Sol.'], ['Comet', 'A body of ice, dust and rock. Near the Sun it warms up and forms a bright tail that points away from the Sun.'], b('comet67p'), ['Cometa 67P', 'Comet 67P']),
  T('asteroid', 'basics', ['Asteroide', 'Roca espacial que gira alrededor del Sol. La mayoría está entre Marte y Júpiter.'], ['Asteroid', 'A space rock that goes around the Sun. Most are between Mars and Jupiter.'], b('eros'), ['Asteroide Eros', 'Asteroid Eros']),
  T('meteorite', 'basics', ['Meteorito', 'Pedazo de roca espacial que atraviesa la atmósfera y llega hasta la superficie de un planeta o luna.'], ['Meteorite', 'A piece of space rock that crosses the atmosphere and reaches the surface of a planet or moon.']),
  T('orbit', 'basics', ['Órbita', 'Camino curvo que sigue un objeto al girar alrededor de otro por la gravedad.'], ['Orbit', 'The curved path an object follows as gravity keeps it going around another.'], m('lro'), ['LRO en órbita lunar', 'LRO in lunar orbit']),
  T('gravity', 'basics', ['Gravedad', 'Fuerza que atrae los objetos entre sí. En la Luna es unas 6 veces más débil que en la Tierra.'], ['Gravity', 'The force that pulls objects toward each other. On the Moon it is about 6 times weaker than on Earth.'], MOON, ['La Luna', 'The Moon']),
  T('mars', 'basics', ['Marte', 'El «planeta rojo», cubierto de polvo con óxido de hierro. Es el destino con más naves en su superficie.'], ['Mars', 'The “red planet”, covered in dust with iron oxide. It is the place with the most spacecraft on its surface.'], b('mars'), ['Marte', 'Mars']),
  T('telescope', 'basics', ['Telescopio', 'Instrumento que recoge luz para ver con detalle objetos muy lejanos.'], ['Telescope', 'An instrument that collects light to see very distant objects in detail.'], m('jwst'), ['Telescopio James Webb', 'James Webb Telescope']),
  T('black_hole', 'basics', ['Agujero negro', 'Región del espacio con una gravedad tan fuerte que nada puede escapar, ni siquiera la luz.'], ['Black hole', 'A region of space with gravity so strong that nothing can escape, not even light.'], d('sagittarius_a'), ['Sagitario A*', 'Sagittarius A*']),
  T('constellation', 'basics', ['Constelación', 'Grupo de estrellas que, vistas desde la Tierra, forman una figura en el cielo, como Orión.'], ['Constellation', 'A group of stars that, seen from Earth, form a shape in the sky, like Orion.'], d('nebula_orion'), ['Nebulosa de Orión', 'Orion Nebula']),
  T('eclipse', 'basics', ['Eclipse', 'Cuando un cuerpo tapa la luz de otro: la Luna tapa el Sol (eclipse solar) o la Tierra da sombra a la Luna (eclipse lunar).'], ['Eclipse', 'When one body blocks another’s light: the Moon covers the Sun (solar eclipse) or Earth casts its shadow on the Moon (lunar eclipse).']),
  T('universe', 'basics', ['Universo', 'Todo lo que existe: galaxias, estrellas, planetas, materia, energía y el espacio mismo.'], ['Universe', 'Everything that exists: galaxies, stars, planets, matter, energy and space itself.']),
  T('au', 'basics', ['Unidad astronómica (UA)', 'Distancia media entre la Tierra y el Sol: unos 150 millones de km. Sirve para medir el Sistema Solar.'], ['Astronomical unit (AU)', 'The average distance between Earth and the Sun: about 150 million km. Used to measure the Solar System.'], b('earth'), ['La Tierra', 'Earth']),
  T('light_year', 'basics', ['Año luz', 'Distancia que recorre la luz en un año: unos 9,5 billones de km. Sirve para medir distancias entre estrellas.'], ['Light-year', 'The distance light travels in one year: about 9.5 trillion km. Used to measure distances between stars.'], d('milkyway'), ['Vía Láctea', 'Milky Way']),
  T('exoplanet', 'basics', ['Exoplaneta', 'Planeta que gira alrededor de una estrella distinta del Sol.'], ['Exoplanet', 'A planet that goes around a star other than the Sun.'], m('kepler'), ['Telescopio Kepler', 'Kepler Telescope']),

  // ── Hardware left behind (the challenge) ────────────────────────────────
  T('lunar_module', 'hardware', ['Módulo lunar', 'Nave del programa Apollo que bajaba a dos astronautas a la Luna y los subía de nuevo a la órbita.'], ['Lunar module', 'The Apollo spacecraft that took two astronauts down to the Moon and back up to orbit.'], m('apollo11'), ['Apollo 11 Eagle', 'Apollo 11 Eagle']),
  T('descent_stage', 'hardware', ['Etapa de descenso', 'Parte de abajo del módulo lunar, con las patas y el motor de aterrizaje. Se quedaba en la Luna como plataforma para despegar.'], ['Descent stage', 'The lower part of the lunar module, with the legs and landing engine. It stayed on the Moon as a launch pad.'], m('apollo11'), ['Apollo 11 Eagle', 'Apollo 11 Eagle']),
  T('lander', 'hardware', ['Módulo de aterrizaje', 'Nave que se posa en la superficie de otro mundo y trabaja sin moverse de ahí.'], ['Lander', 'A spacecraft that sets down on the surface of another world and works without moving from there.'], m('viking1'), ['Viking 1', 'Viking 1']),
  T('rover', 'hardware', ['Rover', 'Vehículo con ruedas que recorre la superficie de otro mundo, controlado desde la Tierra.'], ['Rover', 'A wheeled vehicle that drives across the surface of another world, controlled from Earth.'], m('sojourner'), ['Sojourner', 'Sojourner']),
  T('lrv', 'hardware', ['Vehículo lunar (LRV)', 'Coche eléctrico que usaron los astronautas de Apollo 15, 16 y 17. Los tres siguen aparcados en la Luna.'], ['Lunar Roving Vehicle (LRV)', 'The electric car used by the Apollo 15, 16 and 17 astronauts. All three are still parked on the Moon.'], m('lrv1'), ['LRV-1', 'LRV-1']),
  T('orbiter', 'hardware', ['Orbitador', 'Nave que da vueltas alrededor de un planeta o luna para estudiarlo desde arriba.'], ['Orbiter', 'A spacecraft that circles a planet or moon to study it from above.'], m('mro'), ['Mars Reconnaissance Orbiter', 'Mars Reconnaissance Orbiter']),
  T('probe', 'hardware', ['Sonda espacial', 'Nave robótica sin tripulación que viaja para explorar otros mundos o el espacio profundo.'], ['Space probe', 'A robotic spacecraft with no crew that travels to explore other worlds or deep space.'], m('voyager2'), ['Voyager 2', 'Voyager 2']),
  T('rtg', 'hardware', ['RTG (generador nuclear)', 'Generador que convierte en electricidad el calor del plutonio. Da energía de día y de noche, por eso lo usan naves lejanas.'], ['RTG (nuclear generator)', 'A generator that turns the heat of plutonium into electricity. It gives power day and night, so distant spacecraft use it.'], m('alsep_apollo12'), ['ALSEP del Apollo 12', 'Apollo 12 ALSEP']),
  T('solar_panel', 'hardware', ['Panel solar', 'Placa que convierte la luz del Sol en electricidad. Si el polvo lo cubre, la nave se queda sin energía.'], ['Solar panel', 'A panel that turns sunlight into electricity. If dust covers it, the spacecraft runs out of power.'], m('insight'), ['InSight', 'InSight']),
  T('alsep', 'hardware', ['ALSEP', 'Estaciones científicas que dejaron los astronautas de Apollo en la Luna: medían sismos, magnetismo y viento solar.'], ['ALSEP', 'Science stations the Apollo astronauts left on the Moon: they measured quakes, magnetism and the solar wind.'], m('alsep_apollo12'), ['ALSEP del Apollo 12', 'Apollo 12 ALSEP']),
  T('retroreflector', 'hardware', ['Retrorreflector', 'Espejo especial que devuelve la luz hacia donde vino. Con láseres desde la Tierra se mide la distancia a la Luna.'], ['Retroreflector', 'A special mirror that sends light back where it came from. Lasers from Earth use it to measure the distance to the Moon.'], m('apollo11'), ['Apollo 11', 'Apollo 11']),
  T('seismometer', 'hardware', ['Sismómetro', 'Instrumento que mide los temblores del suelo. InSight registró más de 1.300 martemotos.'], ['Seismometer', 'An instrument that measures ground shaking. InSight recorded more than 1,300 marsquakes.'], m('insight'), ['InSight', 'InSight']),
  T('robotic_arm', 'hardware', ['Brazo robótico', 'Brazo mecánico de un rover o módulo para excavar, tomar muestras y usar instrumentos.'], ['Robotic arm', 'A mechanical arm on a rover or lander used to dig, take samples and use instruments.'], m('phoenix'), ['Phoenix', 'Phoenix']),
  T('heat_shield', 'hardware', ['Escudo térmico', 'Protección que soporta el calor al entrar en una atmósfera a gran velocidad.'], ['Heat shield', 'Protection that withstands the heat of entering an atmosphere at high speed.'], m('curiosity'), ['Curiosity', 'Curiosity']),
  T('parachute', 'hardware', ['Paracaídas', 'Frena la nave dentro de la atmósfera antes de aterrizar. Huygens bajó así sobre Titán.'], ['Parachute', 'It slows the spacecraft inside the atmosphere before landing. Huygens came down on Titan this way.'], m('huygens'), ['Huygens en Titán', 'Huygens on Titan']),
  T('airbags', 'hardware', ['Bolsas de aire', 'Globos que envolvían a Pathfinder, Spirit y Opportunity para rebotar en Marte hasta detenerse.'], ['Airbags', 'Balloons that wrapped Pathfinder, Spirit and Opportunity so they could bounce on Mars until they stopped.'], m('spirit'), ['Spirit', 'Spirit']),
  T('sky_crane', 'hardware', ['Grúa aérea', 'Plataforma con cohetes que bajó a Curiosity y Perseverance colgados de cables y luego se alejó volando.'], ['Sky crane', 'A rocket platform that lowered Curiosity and Perseverance on cables and then flew away.'], m('perseverance'), ['Perseverance', 'Perseverance']),
  T('sol', 'hardware', ['Sol (día marciano)', 'Un día en Marte: unas 24 horas y 40 minutos. Las misiones cuentan su tiempo en soles.'], ['Sol (Martian day)', 'A day on Mars: about 24 hours and 40 minutes. Missions count their time in sols.'], m('opportunity'), ['Opportunity', 'Opportunity']),
  T('telemetry', 'hardware', ['Telemetría', 'Datos que una nave envía por radio sobre su estado: energía, temperatura y posición.'], ['Telemetry', 'Data a spacecraft sends by radio about its condition: power, temperature and position.'], m('opportunity'), ['Opportunity', 'Opportunity']),
  T('regolith', 'hardware', ['Regolito', 'Capa de polvo y rocas sueltas que cubre la superficie de la Luna, Marte y los asteroides.'], ['Regolith', 'The layer of dust and loose rocks covering the surface of the Moon, Mars and asteroids.'], m('surveyor3'), ['Surveyor 3', 'Surveyor 3']),
  T('end_of_mission', 'hardware', ['Fin de misión', 'Cuando una nave deja de funcionar o se apaga: sin energía, sin combustible o por una avería. Muchas se quedan donde terminaron.'], ['End of mission', 'When a spacecraft stops working or is switched off: no power, no fuel or a failure. Many stay where they ended.'], m('kepler'), ['Telescopio Kepler', 'Kepler Telescope']),
  T('planetary_protection', 'hardware', ['Protección planetaria', 'Reglas para no llevar microbios de la Tierra a otros mundos. Por eso Galileo y Cassini se lanzaron contra sus planetas.'], ['Planetary protection', 'Rules to avoid carrying Earth microbes to other worlds. That is why Galileo and Cassini were sent into their planets.'], m('cassini'), ['Cassini', 'Cassini']),
  T('space_debris', 'hardware', ['Basura espacial', 'Satélites viejos y restos de cohetes que siguen girando alrededor de la Tierra sin funcionar.'], ['Space debris', 'Old satellites and rocket parts that keep circling Earth without working.'], b('earth'), ['La Tierra', 'Earth']),
  T('heliopause', 'hardware', ['Heliopausa', 'Frontera donde termina el viento del Sol y empieza el espacio interestelar. Voyager 1 la cruzó en 2012.'], ['Heliopause', 'The boundary where the Sun’s wind ends and interstellar space begins. Voyager 1 crossed it in 2012.'], m('voyager1'), ['Voyager 1', 'Voyager 1']),
];
