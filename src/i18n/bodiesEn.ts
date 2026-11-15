// English names and texts for the Sun, planets, moons and deep-space targets
// (Spanish originals in data/solarSystemData.ts). Applied in place by i18n/data.ts.

type Stats = {
  distanceAu: string;
  diameterKm: string;
  orbitalPeriod: string;
  dayLength: string;
  temperature: string;
  moonsCount: string;
  gravity: string;
  escapeVelocity: string;
  atmosphere: string;
};
type BodyEn = { name: string; classification?: string; description?: string; stats?: Stats };

export const BODIES_EN: Record<string, BodyEn> = {
  sun: {
    name: 'Sun',
    classification: 'Yellow dwarf star · G2V',
    description: 'The central star of the Solar System. The only light source in the scene, it casts the real day/night contrast across the whole system.',
    stats: { distanceAu: '0.00 AU', diameterKm: '1,392,700 km', orbitalPeriod: '230 million years', dayLength: '25.4 days', temperature: '5,505 °C', moonsCount: '8 planets', gravity: '274.0 m/s²', escapeVelocity: '617.7 km/s', atmosphere: '73% H · 25% He (photospheric plasma)' },
  },
  mercury: {
    name: 'Mercury',
    classification: 'Rocky planet · Inner',
    description: 'The planet closest to the Sun (0.39 AU). Resting place of the MESSENGER probe, on the Shakespeare plain.',
    stats: { distanceAu: '0.39 AU', diameterKm: '4,879 km', orbitalPeriod: '88 days', dayLength: '58.6 days', temperature: '−180 to 430 °C', moonsCount: '0', gravity: '3.70 m/s²', escapeVelocity: '4.25 km/s', atmosphere: 'Thin exosphere (O₂, Na, H₂, He)' },
  },
  venus: {
    name: 'Venus',
    classification: 'Rocky planet · Inner',
    description: 'A planet that spins backward, wrapped in thick sulfuric clouds. The Soviet lander Venera 13 lies on its scorching surface.',
    stats: { distanceAu: '0.72 AU', diameterKm: '12,104 km', orbitalPeriod: '225 days', dayLength: '243 days (retro.)', temperature: '464 °C', moonsCount: '0', gravity: '8.87 m/s²', escapeVelocity: '10.36 km/s', atmosphere: '96.5% CO₂ · 3.5% N₂ (92 bar)' },
  },
  earth: {
    name: 'Earth',
    classification: 'Rocky planet · Habitable zone',
    description: 'Our home at 1.00 AU, with the tidally locked Moon and its historic relics such as Apollo 11\'s Eagle and Lunokhod.',
    stats: { distanceAu: '1.00 AU', diameterKm: '12,742 km', orbitalPeriod: '365.25 days', dayLength: '23 h 56 min', temperature: '15 °C', moonsCount: '1', gravity: '9.81 m/s²', escapeVelocity: '11.19 km/s', atmosphere: '78% N₂ · 21% O₂ · 1% Ar' },
  },
  mars: {
    name: 'Mars',
    classification: 'Rocky planet · Inner',
    description: 'The silent home of Opportunity, Spirit, InSight, Sojourner and Phoenix. At 1.52 AU from the Sun, sunlight is less than half as strong as on Earth.',
    stats: { distanceAu: '1.52 AU', diameterKm: '6,779 km', orbitalPeriod: '687 days', dayLength: '24 h 37 min', temperature: '−65 °C', moonsCount: '2', gravity: '3.72 m/s²', escapeVelocity: '5.03 km/s', atmosphere: '95.3% CO₂ · 2.6% N₂ · 1.9% Ar (6 mbar)' },
  },
  eros: {
    name: 'Eros',
    classification: 'Near-Earth asteroid · S-type',
    description: 'Asteroid 433 Eros, a 34 km elongated rock that crosses the orbit of Mars (1.13–1.78 AU). In February 2001 the NEAR Shoemaker probe set down on its surface, where it still rests.',
    stats: { distanceAu: '1.13–1.78 AU', diameterKm: '34.4 × 11.2 × 11.2 km', orbitalPeriod: '1.76 years', dayLength: '5 h 16 min', temperature: '−150 to +100 °C', moonsCount: '0', gravity: '≈0.006 m/s²', escapeVelocity: '≈0.01 km/s', atmosphere: 'None' },
  },
  ceres: {
    name: 'Ceres',
    classification: 'Dwarf planet · Asteroid belt',
    description: 'The largest body in the main asteroid belt (2.77 AU). Visited by the Dawn probe, it has bright deposits of hydrothermal salts in Occator crater.',
    stats: { distanceAu: '2.77 AU', diameterKm: '939 km', orbitalPeriod: '4.60 years', dayLength: '9 h 04 min', temperature: '−105 °C', moonsCount: '0', gravity: '0.28 m/s²', escapeVelocity: '0.51 km/s', atmosphere: 'Very thin, short-lived water vapor' },
  },
  comet67p: {
    name: 'Comet 67P',
    classification: 'Periodic comet · Jupiter family',
    description: 'A 4 km two-lobed nucleus on an eccentric elliptical orbit (1.24–5.68 AU). The Rosetta probe and the Philae lander rest on its surface.',
    stats: { distanceAu: '1.24–5.68 AU', diameterKm: '4.3 × 4.1 km', orbitalPeriod: '6.44 years', dayLength: '12 h 24 min', temperature: '−70 to −180 °C', moonsCount: '0', gravity: '0.0002 m/s²', escapeVelocity: '0.001 km/s', atmosphere: 'Coma of H₂O, CO₂, CO and organics' },
  },
  jupiter: {
    name: 'Jupiter',
    classification: 'Gas giant · Outer',
    description: 'A gas giant 5.20 AU from the Sun, with banded clouds and the four Galilean moons: Io, Europa, Ganymede and Callisto.',
    stats: { distanceAu: '5.20 AU', diameterKm: '139,820 km', orbitalPeriod: '11.86 years', dayLength: '9 h 55 min', temperature: '−110 °C', moonsCount: '95', gravity: '24.79 m/s²', escapeVelocity: '59.5 km/s', atmosphere: '89.8% H₂ · 10.2% He · CH₄, NH₃' },
  },
  saturn: {
    name: 'Saturn',
    classification: 'Gas giant · Ring system',
    description: 'At 9.58 AU, where sunlight is almost 100 times fainter than on Earth. Cassini rests in its atmosphere and Huygens lies on Titan.',
    stats: { distanceAu: '9.54 AU', diameterKm: '116,460 km', orbitalPeriod: '29.45 years', dayLength: '10 h 39 min', temperature: '−140 °C', moonsCount: '146', gravity: '10.44 m/s²', escapeVelocity: '35.5 km/s', atmosphere: '96.3% H₂ · 3.25% He · traces of CH₄' },
  },
  uranus: {
    name: 'Uranus',
    classification: 'Ice giant · Outer',
    description: 'An ice giant at 19.19 AU with an extreme axial tilt of 97.8°. Its faint rings and moons circle almost at right angles to the ecliptic.',
    stats: { distanceAu: '19.19 AU', diameterKm: '50,724 km', orbitalPeriod: '84 years', dayLength: '17 h 14 min (retro.)', temperature: '−195 °C', moonsCount: '28', gravity: '8.87 m/s²', escapeVelocity: '21.3 km/s', atmosphere: '82.5% H₂ · 15.2% He · 2.3% CH₄' },
  },
  neptune: {
    name: 'Neptune',
    classification: 'Ice giant · Outer',
    description: '30.07 AU from the Sun, where light takes more than four hours to arrive. Triton orbits it backward.',
    stats: { distanceAu: '30.07 AU', diameterKm: '49,244 km', orbitalPeriod: '164.8 years', dayLength: '16 h 6 min', temperature: '−200 °C', moonsCount: '16', gravity: '11.15 m/s²', escapeVelocity: '23.5 km/s', atmosphere: '80% H₂ · 19% He · 1.5% CH₄' },
  },
  pluto: {
    name: 'Pluto',
    classification: 'Dwarf planet · Kuiper Belt',
    description: 'An icy world 39.5 AU from the Sun with glaciers of solid nitrogen in Sputnik Planitia and a binary orbit with its large moon Charon.',
    stats: { distanceAu: '39.48 AU', diameterKm: '2,377 km', orbitalPeriod: '247.9 years', dayLength: '6.39 days (retro.)', temperature: '−229 °C', moonsCount: '5', gravity: '0.62 m/s²', escapeVelocity: '1.21 km/s', atmosphere: 'Thin N₂, CH₄, CO (10 µbar)' },
  },
  eris: {
    name: 'Eris',
    classification: 'Dwarf planet · Scattered disk',
    description: 'One of the most massive dwarf planets of the outer Solar System (mean distance 67.8 AU), covered by a bright crust of methane frost.',
    stats: { distanceAu: '67.78 AU', diameterKm: '2,326 km', orbitalPeriod: '559 years', dayLength: '25 h 54 min', temperature: '−243 °C', moonsCount: '1', gravity: '0.82 m/s²', escapeVelocity: '1.38 km/s', atmosphere: 'Surface frost of CH₄ and N₂' },
  },
  // Lunas (solo el nombre)
  luna: { name: 'Moon' },
  phobos: { name: 'Phobos' },
  deimos: { name: 'Deimos' },
  io: { name: 'Io' },
  europa: { name: 'Europa' },
  ganymede: { name: 'Ganymede' },
  callisto: { name: 'Callisto' },
  enceladus: { name: 'Enceladus' },
  rhea: { name: 'Rhea' },
  titan: { name: 'Titan' },
  iapetus: { name: 'Iapetus' },
  miranda: { name: 'Miranda' },
  ariel: { name: 'Ariel' },
  titania: { name: 'Titania' },
  oberon: { name: 'Oberon' },
  proteus: { name: 'Proteus' },
  triton: { name: 'Triton' },
  charon: { name: 'Charon' },
};

type DeepEn = {
  categoryLabel: string;
  name: string;
  classification: string;
  distanceLabel: string;
  physicalScaleLabel: string;
  nasaObservatories?: string;
  discoveryYear?: string;
  whatItIs: string;
  whyImportant: string;
};

export const DEEP_SPACE_EN: Record<string, DeepEn> = {
  milkyway: {
    categoryLabel: 'Galaxy',
    name: 'Milky Way (full map)',
    classification: 'Barred spiral galaxy SBbc · 105,700 light-years',
    distanceLabel: '26,670 light-years to the galactic core',
    physicalScaleLabel: 'Diameter: 105,700 ly · Disk thickness: ~1,000 ly',
    discoveryYear: '1920 (Shapley) / Gaia DR3',
    whatItIs:
      'Our home galaxy at proportional scale: four spiral arms (Perseus, Scutum-Centaurus, Sagittarius and Norma) with our Sun on the Orion Spur, next to the real coordinates of official black holes, pulsars and nebulae.',
    whyImportant:
      'It places, with scientific precision, all the extreme objects inside the Milky Way relative to the Solar System and the galactic center.',
  },
  sagittarius_a: {
    categoryLabel: 'Black hole',
    name: 'Sagittarius A* (Sgr A*)',
    classification: 'Supermassive black hole · 4.3 million solar masses',
    distanceLabel: '26,670 light-years · Galactic Center',
    physicalScaleLabel: 'Event horizon: 24 million km (~17 solar diameters)',
    discoveryYear: '1974 / EHT image 2022',
    whatItIs:
      'The supermassive black hole at the very center of the Milky Way. Its event horizon is about 24 million km across, and it pulls magnetized plasma and S-stars at relativistic speeds.',
    whyImportant:
      'Photographed in 2022 by the Event Horizon Telescope and monitored by Chandra, it confirms general relativity in extreme gravity and governs the central dynamics of our galaxy.',
  },
  cygnus_x1: {
    categoryLabel: 'Black hole',
    name: 'Cygnus X-1 (HDE 226868)',
    classification: 'Binary stellar black hole · 21.2 M☉',
    distanceLabel: '7,200 light-years · Orion Arm',
    physicalScaleLabel: 'Horizon: ~125 km · 5.6-day binary orbit',
    discoveryYear: '1964 / Confirmed 1971',
    whatItIs:
      'The first stellar black hole ever confirmed. It constantly pulls gas from its blue supergiant companion HDE 226868 through an accretion bridge that shines brightly in X-rays.',
    whyImportant:
      'It proved for the first time that black holes born from collapsing massive stars are real, and settled the famous scientific bet between Stephen Hawking and Kip Thorne.',
  },
  gaia_bh1: {
    categoryLabel: 'Black hole',
    name: 'Gaia BH1',
    classification: 'Nearest dormant black hole · 9.62 M☉',
    distanceLabel: '1,560 light-years · Constellation Ophiuchus',
    physicalScaleLabel: 'Horizon: ~57 km · G-star orbit: 1.4 AU (185.6 d)',
    discoveryYear: '2022 (Gaia DR3)',
    whatItIs:
      'The closest known black hole to Earth: a dark remnant of 9.6 solar masses with no active accretion disk, quietly orbited by a yellow star very similar to our Sun.',
    whyImportant:
      'It revealed a hidden population of silent black holes in our solar neighborhood that can only be found by measuring the astrometric wobble of their companion star.',
  },
  grs_1915: {
    categoryLabel: 'Black hole',
    name: 'GRS 1915+105',
    classification: 'Relativistic galactic microquasar · 12.4 M☉',
    distanceLabel: '28,000 light-years · Constellation Aquila',
    physicalScaleLabel: 'Horizon: ~73 km · Plasma jets at 0.92 c',
    discoveryYear: '1992 (Granat / VLA)',
    whatItIs:
      'A binary black hole spinning close to the maximum possible inside our galaxy that copies, on a small scale, the behavior of a quasar, launching twin jets of plasma at more than 90% of the speed of light.',
    whyImportant:
      'It was the first source in the Milky Way where plasma ejections with apparent faster-than-light motion were seen, showing how magnetic disks launch relativistic jets.',
  },
  crab_pulsar: {
    categoryLabel: 'Pulsar',
    name: 'Crab Pulsar (PSR B0531+21)',
    classification: 'Neutron star · 30.2 rotations per second',
    distanceLabel: '6,500 light-years · Perseus Arm',
    physicalScaleLabel: 'Star: ~20 km · X-ray torus: ~1.5 light-years',
    discoveryYear: '1968 (Supernova SN 1054)',
    whatItIs:
      'The ultra-dense core left by the supernova of the year 1054 AD. It spins 30.2 times a second, sweeping space with twin electromagnetic beams and powering a bright X-ray torus photographed by Chandra.',
    whyImportant:
      'It works as a cosmic dynamo that accelerates particles to peta-electronvolt energies, and serves as a calibration standard in X-ray and gamma-ray astrophysics.',
  },
  vela_pulsar: {
    categoryLabel: 'Pulsar',
    name: 'Vela Pulsar (PSR B0833-45)',
    classification: 'Neutron star · 11.2 rotations per second',
    distanceLabel: '959 light-years · Constellation Vela',
    physicalScaleLabel: 'Star: ~20 km · X-ray jet: ~0.7 light-years',
    discoveryYear: '1968 (Supernova ~11,000 years ago)',
    whatItIs:
      'A young pulsar racing at supersonic speed through the remains of its own stellar explosion, creating curved double shock arcs and a pulsing jet of particles captured by Chandra and IXPE.',
    whyImportant:
      'It let astronomers watch, in real video, how the relativistic winds of a neutron star sculpt shock waves in the interstellar medium of our galaxy.',
  },
  nebula_orion: {
    categoryLabel: 'NASA nebula',
    name: 'Orion Nebula (M42)',
    classification: 'Diffuse H II emission nebula · ~24 light-years',
    distanceLabel: '1,344 light-years · Orion Spur',
    physicalScaleLabel: 'Diameter: ~24 light-years · >700 young stars',
    whatItIs:
      'The closest region of massive star formation to Earth. Vast veils of ionized hydrogen and oxygen glow crimson and turquoise around the bright four-star Trapezium cluster.',
    whyImportant:
      'Thanks to Hubble and the James Webb Space Telescope (JWST), it has revealed real protoplanetary disks ("proplyds") where new planetary systems like ours are born.',
  },
  nebula_eagle: {
    categoryLabel: 'NASA nebula',
    name: 'Pillars of Creation (M16 · Eagle)',
    classification: 'Interstellar molecular columns · ~5 light-years',
    distanceLabel: '5,700 light-years · Sagittarius Arm',
    physicalScaleLabel: 'Tallest pillar: ~4–5 light-years high',
    whatItIs:
      'Three towering columns of cold molecular hydrogen and dust in the Eagle Nebula, eroded at their tips by ultraviolet light from young massive stars and full of golden and crimson protostellar knots.',
    whyImportant:
      'They are one of NASA\'s most iconic science images, showing live how radiation sculpts the gas where new stars are born.',
  },
  nebula_carina: {
    categoryLabel: 'NASA nebula',
    name: 'Carina Nebula and Eta Carinae (NGC 3372)',
    classification: 'Nebula complex and hypergiant star · ~300 light-years',
    distanceLabel: '8,500 light-years · Carina-Sagittarius Arm',
    physicalScaleLabel: 'Complex: ~300 ly · Bipolar Homunculus: ~0.7 ly',
    nasaObservatories: 'NASA JWST (Cosmic Cliffs) · Hubble · Chandra',
    discoveryYear: '1752 / First JWST field 2022',
    whatItIs:
      'A giant stellar nursery crowned by the bright bipolar Homunculus nebula around the unstable hypergiant Eta Carinae, and the golden and blue "Cosmic Cliffs" of dust revealed by JWST.',
    whyImportant:
      'Eta Carinae is one of the most massive and luminous star systems in the whole Milky Way, a candidate to explode as a spectacular supernova on cosmic timescales.',
  },
  nebula_crab: {
    categoryLabel: 'NASA nebula',
    name: 'Crab Nebula (M1)',
    classification: 'Remnant of supernova SN 1054 · ~11 light-years',
    distanceLabel: '6,500 light-years · Constellation Taurus',
    physicalScaleLabel: 'Diameter: ~11 light-years (expanding at 1,500 km/s)',
    discoveryYear: '1054 AD / Hubble & JWST 2023',
    whatItIs:
      'An intricate 3D cage of sulfur, oxygen and hydrogen filaments rapidly expanding after a star exploded in the year 1054, lit from the center by a bluish synchrotron cloud.',
    whyImportant:
      'It lets us study in detail how supernova explosions seed the Milky Way with carbon, oxygen, iron and other elements needed to form planets and life.',
  },
  nebula_helix: {
    categoryLabel: 'NASA nebula',
    name: 'Helix Nebula (NGC 7293)',
    classification: 'Nearby planetary nebula · ~5.7 light-years',
    distanceLabel: '655 light-years · Constellation Aquarius',
    physicalScaleLabel: 'Diameter: ~5.74 light-years · Radial cometary knots',
    discoveryYear: '1824 (Harding) / Hubble-Spitzer composite',
    whatItIs:
      'Bright outer layers of gas thrown off by a dying Sun-like star: a double blue-turquoise helical ring of ionized oxygen wrapped in crimson hydrogen and tens of thousands of cometary knots pointing at the central white dwarf.',
    whyImportant:
      'It shows very realistically the future fate of our own Sun, about 5 billion years from now, when it runs out of nuclear fuel.',
  },
};
