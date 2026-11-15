// English direct answers of the search box, keyed by the Spanish headline, plus English keywords
// so questions typed in English find the same answer.
type RuleEn = { headline: string; answer: string; keywords: string[] };

export const KNOWLEDGE_EN: Record<string, RuleEn> = {
  'Apolo 11 (Eagle) · 20 de julio de 1969': {
    headline: 'Apollo 11 (Eagle) · July 20, 1969',
    answer:
      'Apollo 11 was the first crewed mission to land on the Moon (Neil Armstrong and Buzz Aldrin), in Mare Tranquillitatis. (The first robotic impact before it was Luna 2 in 1959.)',
    keywords: ['first moon landing', 'first man on the moon', 'first humans on the moon', 'apollo 11', 'sea of tranquility'],
  },
  'Lunokhod 1 · Primer rover planetario (1970)': {
    headline: 'Lunokhod 1 · First planetary rover (1970)',
    answer:
      'Lunokhod 1 (USSR, November 1970) was the first remotely driven robotic rover on the surface of another world, covering 10.54 km in the lunar Mare Imbrium.',
    keywords: ['first rover', 'first planetary rover', 'lunokhod'],
  },
  'Sojourner · Primer rover en Marte (1997)': {
    headline: 'Sojourner · First rover on Mars (1997)',
    answer:
      'Sojourner landed with Mars Pathfinder on July 4, 1997, and became the first wheeled vehicle to drive on the Martian surface.',
    keywords: ['first rover on mars', 'first mars rover', 'pathfinder'],
  },
  'Perseverance e Ingenuity · Cráter Jezero (2020)': {
    headline: 'Perseverance and Ingenuity · Jezero crater (2020)',
    answer:
      'The Perseverance rover and the Ingenuity helicopter achieved the first controlled powered flight on another planet (72 flights) and collect samples that may hold biosignatures on Mars.',
    keywords: ['first flight on mars', 'mars helicopter', 'flight on another planet'],
  },
  'InSight · Sismología e interior marciano': {
    headline: 'InSight · Seismology and the interior of Mars',
    answer:
      'Note: although the famous phrase "My battery is low and it’s getting dark" is linked to Opportunity, InSight detected more than 1,300 marsquakes and measured the liquid core of Mars.',
    keywords: ['marsquake', 'marsquakes', 'core of mars', 'mars interior'],
  },
  'Opportunity (MER-B) · Evidencia mineral de agua': {
    headline: 'Opportunity (MER-B) · Mineral evidence of water',
    answer:
      'Opportunity drove 45.16 km between the Eagle, Victoria and Endeavour craters over 15 years, giving the first direct mineral evidence of liquid surface water on Mars.',
    keywords: ['battery is low', 'getting dark', 'water on mars', 'blueberries'],
  },
  'Phoenix Mars Lander · Hielo subsuperficial (2008)': {
    headline: 'Phoenix Mars Lander · Subsurface ice (2008)',
    answer:
      'The Phoenix lander dug into the Martian arctic soil and physically confirmed water ice just below the surface.',
    keywords: ['ice on mars', 'water ice mars', 'mars arctic'],
  },
  'Estación Espacial Internacional (ISS)': {
    headline: 'International Space Station (ISS)',
    answer:
      'Humanity’s largest orbital laboratory, in low Earth orbit about 408 km up, continuously inhabited since November 2000.',
    keywords: ['international space station', 'space station', 'astronauts living in space'],
  },
  'Telescopio Espacial James Webb (JWST)': {
    headline: 'James Webb Space Telescope (JWST)',
    answer:
      'The most powerful infrared space telescope ever launched, placed 1.5 million km away (L2) to observe the first galaxies after the Big Bang and the atmospheres of exoplanets.',
    keywords: ['james webb', 'webb telescope', 'most powerful telescope', 'infrared telescope'],
  },
  'Telescopio Espacial Hubble (HST)': {
    headline: 'Hubble Space Telescope (HST)',
    answer:
      'Since 1990 it has made more than 1.5 million observations, measuring the age and acceleration of the universe, with iconic images such as the Pillars of Creation.',
    keywords: ['hubble telescope', 'space telescope'],
  },
  'Voyager 1 · Objeto humano más lejano': {
    headline: 'Voyager 1 · The most distant human-made object',
    answer:
      'Launched in 1977, Voyager 1 carries the interstellar Golden Record and is the spacecraft farthest from Earth (more than 24 billion km), already in interstellar space.',
    keywords: ['farthest spacecraft', 'most distant', 'golden record', 'interstellar space'],
  },
  'Voyager 2 · Única sonda en Urano y Neptuno': {
    headline: 'Voyager 2 · The only probe at Uranus and Neptune',
    answer:
      'The only spacecraft in history to visit all four giant planets (Jupiter, Saturn, Uranus and Neptune) before crossing the heliopause.',
    keywords: ['visited uranus', 'visited neptune', 'grand tour'],
  },
  'Rosetta y Philae · Primer aterrizaje en un cometa': {
    headline: 'Rosetta and Philae · First landing on a comet',
    answer:
      'In 2014 the European Rosetta probe orbited comet 67P/Churyumov-Gerasimenko and released the Philae lander in the first soft landing on a comet.',
    keywords: ['landing on a comet', 'comet landing', 'first comet'],
  },
  'Módulo Huygens · Aterrizaje en Titán (2005)': {
    headline: 'Huygens probe · Landing on Titan (2005)',
    answer:
      'The Huygens probe made the most distant landing ever achieved in the outer Solar System, descending by parachute onto the surface of Titan, Saturn’s moon.',
    keywords: ['landing on titan', 'most distant landing', 'farthest landing'],
  },
  'Sagitario A* · Corazón de la Vía Láctea': {
    headline: 'Sagittarius A* · Heart of the Milky Way',
    answer:
      'Sagittarius A* is the supermassive black hole of 4.3 million solar masses at the center of our galaxy (26,670 light-years away), imaged directly by the EHT in 2022.',
    keywords: ['sagittarius', 'supermassive black hole', 'center of the galaxy', 'galactic center'],
  },
  'Cygnus X-1 · Primer agujero negro estelar (21,2 M☉)': {
    headline: 'Cygnus X-1 · First stellar black hole (21.2 M☉)',
    answer:
      'At 7,200 light-years in the Milky Way, Cygnus X-1 strips plasma from its blue supergiant companion HDE 226868, giving off powerful X-rays observed by Chandra.',
    keywords: ['first black hole', 'stellar black hole'],
  },
  'Gaia BH1 · Agujero negro más cercano (1.560 al)': {
    headline: 'Gaia BH1 · Nearest black hole (1,560 ly)',
    answer:
      'Discovered with Gaia data, Gaia BH1 has 9.62 solar masses and orbits a Sun-like star just 1,560 light-years away in our Milky Way.',
    keywords: ['nearest black hole', 'closest black hole'],
  },
  'GRS 1915+105 · Microcuásar galáctico': {
    headline: 'GRS 1915+105 · Galactic microquasar',
    answer:
      'A stellar black hole of 12.4 solar masses in the Milky Way that fires bipolar plasma jets at more than 92% of the speed of light.',
    keywords: ['microquasar'],
  },
  'Púlsar del Cangrejo · Estrella de neutrones (30,2 Hz)': {
    headline: 'Crab Pulsar · Neutron star (30.2 Hz)',
    answer:
      'Born in the supernova of the year 1054, this 20 km pulsar spins 30.2 times per second inside an X-ray synchrotron torus photographed by NASA’s Chandra.',
    keywords: ['crab pulsar', 'neutron star', 'pulsar'],
  },
  'Púlsar de Vela · Viento relativista (959 al)': {
    headline: 'Vela Pulsar · Relativistic wind (959 ly)',
    answer:
      'A neutron star just 959 light-years away that spins 11.2 times per second, launching a curved X-ray jet and shock arcs captured by Chandra and IXPE.',
    keywords: ['vela pulsar'],
  },
  'Nebulosa de Orión (M42) · Guardería estelar': {
    headline: 'Orion Nebula (M42) · Stellar nursery',
    answer:
      'At 1,344 light-years, it is the nearest region where massive stars and protoplanetary disks are born, around the Trapezium cluster.',
    keywords: ['orion nebula', 'stellar nursery', 'where stars are born'],
  },
  'Pilares de la Creación (M16 · Águila)': {
    headline: 'Pillars of Creation (M16 · Eagle)',
    answer:
      'Columns of molecular gas and dust 5 light-years tall in the Milky Way’s Sagittarius arm, sculpted by young stars in iconic Hubble and JWST images.',
    keywords: ['pillars of creation', 'eagle nebula'],
  },
  'Nebulosa de Carina y Eta Carinae (NGC 3372)': {
    headline: 'Carina Nebula and Eta Carinae (NGC 3372)',
    answer:
      'A 300-light-year star complex 8,500 light-years away that holds JWST’s Cosmic Cliffs and the colossal bipolar hypergiant Eta Carinae.',
    keywords: ['carina nebula', 'cosmic cliffs'],
  },
  'Nebulosa del Cangrejo (M1) · Supernova 1054': {
    headline: 'Crab Nebula (M1) · Supernova of 1054',
    answer:
      'A filamentary remnant expanding at 1,500 km/s after the stellar explosion recorded in 1054 AD, lit from its core by the Crab Pulsar.',
    keywords: ['crab nebula', 'supernova'],
  },
  'Nebulosa de la Hélice (NGC 7293)': {
    headline: 'Helix Nebula (NGC 7293)',
    answer:
      'A planetary nebula 655 light-years away formed by the layers shed by a dying Sun-like star around a hot central white dwarf.',
    keywords: ['helix nebula', 'planetary nebula', 'white dwarf'],
  },
  'Vía Láctea · Nuestra galaxia espiral barrada': {
    headline: 'Milky Way · Our barred spiral galaxy',
    answer:
      'The Solar System orbits in the minor Orion Arm about 26,670 light-years from the galactic center, completing a lap every ~230 million years.',
    keywords: ['milky way', 'our galaxy'],
  },
  'El Sol · Estrella enana amarilla G2V': {
    headline: 'The Sun · G2V yellow dwarf star',
    answer:
      'It holds 99.86% of all the mass in the Solar System, with a photosphere at 5,505 °C and a surface gravity of 274 m/s².',
    keywords: ['the sun', 'our star'],
  },
  'Venera 13 · Superficie infernal de Venus (1982)': {
    headline: 'Venera 13 · The hellish surface of Venus (1982)',
    answer:
      'Venera 13 sent the first color panoramic photos from Venus, surviving 127 minutes at 457 °C and 89 atmospheres of pressure.',
    keywords: ['surface of venus', 'venus landing'],
  },
  'Júpiter · El planeta más grande del Sistema Solar': {
    headline: 'Jupiter · The largest planet in the Solar System',
    answer:
      'With a diameter of 139,820 km and surface gravity of 24.79 m/s², it hosts the anticyclonic storm of the Great Red Spot and 95 moons.',
    keywords: ['largest planet', 'biggest planet', 'great red spot'],
  },
  'Saturno · El sistema de anillos más extenso': {
    headline: 'Saturn · The largest ring system',
    answer:
      'Saturn’s rings stretch across hundreds of thousands of kilometers, with millions of pieces of water ice and rock divided by the Cassini Division.',
    keywords: ['rings of saturn', 'saturn rings', 'planet with rings'],
  },
  'Europa (luna de Júpiter) · Océano global bajo hielo': {
    headline: 'Europa (moon of Jupiter) · Global ocean under the ice',
    answer:
      'Beneath its fractured ice crust it hides a salty liquid ocean with more than twice the water of all Earth’s oceans, the target of Europa Clipper.',
    keywords: ['ocean under ice', 'europa ocean', 'europa clipper'],
  },
  'Encélado · Géiseres oceánicos en Saturno': {
    headline: 'Enceladus · Ocean geysers at Saturn',
    answer:
      'Its polar cracks blast plumes of water vapor and molecular hydrogen straight into the E ring from a salty underground ocean.',
    keywords: ['geysers', 'enceladus'],
  },
  'Ío · El mundo más volcánicamente activo': {
    headline: 'Io · The most volcanically active world',
    answer:
      'The gravitational pull of Jupiter and Europa heats its interior through tides, feeding more than 400 active volcanoes of sulfur and silicates.',
    keywords: ['volcanoes', 'most volcanic', 'volcanic moon'],
  },
  'Plutón · Planeta enano del cinturón de Kuiper': {
    headline: 'Pluto · Kuiper Belt dwarf planet',
    answer:
      'Explored by New Horizons in 2015, it revealed the vast nitrogen glacier plain Sputnik Planitia (its famous "heart") and mountains of water ice.',
    keywords: ['dwarf planet', 'new horizons', 'kuiper belt'],
  },
  'Mercurio · El planeta más rápido y cercano (0,39 UA)': {
    headline: 'Mercury · The fastest and closest planet (0.39 AU)',
    answer:
      'It orbits the Sun at ~47.4 km/s, completing a year every 88 Earth days, and endures extremes from −180 °C to +430 °C.',
    keywords: ['fastest planet', 'closest planet to the sun', 'nearest planet to the sun'],
  },
};
