// English text for the guided tours (keyed by tour id and step id).
type StepEn = { title: string; nasaBadge: string; narration: string; scienceFact: string };

export const TOURS_EN: Record<string, { name: string; subtitle: string }> = {
  hardware_chronology: {
    name: 'NASA Hardware Legacy · “Abandoned but not Forgotten” challenge',
    subtitle: 'Timeline · 17 spacecraft at their real location · ordered by launch date',
  },
  solar_architecture: { name: 'Grand Tour of the Solar System', subtitle: 'Real 1:215 scale · NASA/JPL open data' },
  ocean_worlds: { name: 'Water Worlds and Habitability', subtitle: 'Subsurface oceans and exotic ices · NASA' },
  historic_missions: { name: 'Historic NASA Missions', subtitle: 'From Tranquility Base to interstellar space' },
  milky_way_wonders: {
    name: 'Milky Way: Extreme Phenomena',
    subtitle: 'Black holes, pulsars and official NASA nebulae',
  },
};

export const TOUR_STEPS_EN: Record<string, StepEn> = {
  hw_surveyor1: {
    title: '1966 · Surveyor 1 · First soft landing',
    nasaBadge: 'Launched May 30, 1966 · Moon 2.47° S 43.34° W',
    narration:
      'The Surveyors proved that the lunar ground could hold up a spacecraft. Surveyor 1 touched down on June 2, 1966, north of Flamsteed crater and sent back more than 11,000 images.',
    scienceFact: 'Five Surveyors (1, 3, 5, 6 and 7) landed successfully; Apollo 12 astronauts walked over to Surveyor 3 in 1969.',
  },
  hw_apollo11_lm: {
    title: '1969 · Apollo Lunar Modules · Eagle',
    nasaBadge: 'Launched Jul 16, 1969 · Sea of Tranquility',
    narration:
      'When the astronauts lifted off, the descent stage of the Lunar Module stayed behind as a launch pad. Eagle’s is still at Tranquility Base, next to the commemorative plaque.',
    scienceFact: 'Six descent stages remain on the Moon: Eagle, Intrepid, Antares, Falcon, Orion and Challenger.',
  },
  hw_alsep: {
    title: '1969 · ALSEP · Apollo science stations',
    nasaBadge: 'Launched Nov 14, 1969 · Apollo 12, Oceanus Procellarum',
    narration:
      'Alan Bean deployed the first complete ALSEP station: a seismometer, magnetometer and solar-wind spectrometer powered by an RTG nuclear generator. It kept measuring after the astronauts left.',
    scienceFact: 'The ALSEP network ran until September 30, 1977; the laser retroreflectors are still used today.',
  },
  hw_lrv: {
    title: '1971 · Lunar Roving Vehicles (LRV)',
    nasaBadge: 'Launched Jul 26, 1971 · Apollo 15, Hadley-Apennine',
    narration:
      'The first of three electric “moon buggies” arrived with Apollo 15. The astronauts drove it 27.8 km and parked it for good next to the Falcon module.',
    scienceFact: 'LRV-2 (Apollo 16, Descartes) and LRV-3 (Apollo 17, Taurus-Littrow) are also still parked on the Moon.',
  },
  hw_pioneer10: {
    title: '1972 · Pioneer 10 · First at Jupiter',
    nasaBadge: 'Launched Mar 3, 1972 · ≈140 AU toward Aldebaran',
    narration:
      'The first spacecraft to cross the Asteroid Belt and to visit Jupiter. Today it drifts silently beyond the heliosphere, carrying the Pioneer plaque.',
    scienceFact: 'Its last signal arrived on January 23, 2003, from about 80 AU.',
  },
  hw_pioneer11: {
    title: '1973 · Pioneer 11 · First at Saturn',
    nasaBadge: 'Launched Apr 6, 1973 · ≈119 AU toward Aquila',
    narration:
      'It flew past Jupiter and in 1979 became the first to reach Saturn, discovering the F ring. It opened the path the Voyagers later followed.',
    scienceFact: 'NASA lost contact with it on September 30, 1995.',
  },
  hw_viking1: {
    title: '1975 · Viking 1 · First success on Mars',
    nasaBadge: 'Launched Aug 20, 1975 · Chryse Planitia 22.27° N',
    narration:
      'On July 20, 1976, Viking 1 became the first US lander to operate on Mars. It took the first photo from the surface and is still exactly where it landed.',
    scienceFact: 'It ran on nuclear power for more than 6 years, until November 1982.',
  },
  hw_viking2: {
    title: '1975 · Viking 2 · Frost in Utopia Planitia',
    nasaBadge: 'Launched Sep 9, 1975 · Utopia Planitia 47.64° N',
    narration:
      'Its twin landed on the northern plains on September 3, 1976, and photographed water frost on the Martian ground.',
    scienceFact: 'It operated for almost 4 years, until its batteries failed in April 1980.',
  },
  hw_near: {
    title: '1996 · NEAR Shoemaker · On asteroid Eros',
    nasaBadge: 'Launched Feb 17, 1996 · 433 Eros, 35.8° S',
    narration:
      'The first spacecraft to orbit an asteroid and to land on one. After a year mapping Eros, it descended on February 12, 2001, and rests south of the Himeros depression.',
    scienceFact: 'It was not designed to land, yet it kept transmitting from the surface for 16 more days.',
  },
  hw_sojourner: {
    title: '1996 · Sojourner · First rover on Mars',
    nasaBadge: 'Launched Dec 4, 1996 · Ares Vallis',
    narration:
      'Delivered by the Pathfinder lander in July 1997, this 10 kg rover drove about 100 m analyzing rocks. Today it is parked for good next to its lander.',
    scienceFact: 'Its last communication was on September 27, 1997.',
  },
  hw_spirit: {
    title: '2003 · Spirit · Twin of Gusev crater',
    nasaBadge: 'Launched Jun 10, 2003 · Gusev crater',
    narration:
      'Designed for 90 sols, it worked for more than 6 years. Stuck in soft sand at “Troy”, it is now a silent monument to Mars exploration.',
    scienceFact: 'It found almost pure silica, a sign of ancient hydrothermal systems.',
  },
  hw_opportunity: {
    title: '2003 · Opportunity · The marathon runner',
    nasaBadge: 'Launched Jul 7, 2003 · Meridiani Planum',
    narration:
      'Spirit’s twin drove 45 km in almost 15 years. A global dust storm cut off its power in June 2018 in Perseverance Valley.',
    scienceFact: 'It found hematite spherules (“blueberries”), evidence of ancient liquid water.',
  },
  hw_phoenix: {
    title: '2007 · Phoenix · Water ice in the Arctic',
    nasaBadge: 'Launched Aug 4, 2007 · Vastitas Borealis 68° N',
    narration:
      'It dug into the Martian arctic soil and watched chunks of water ice sublimate. The polar winter covered it in CO₂ ice and it lost power.',
    scienceFact: 'Its last signal was on November 2, 2008.',
  },
  hw_dawn: {
    title: '2007 · Dawn · Endless orbit around Ceres',
    nasaBadge: 'Launched Sep 27, 2007 · Vesta → Ceres',
    narration:
      'With ion engines it mapped Vesta and then Ceres. Out of fuel since 2018, it remains in a stable, powerless orbit around the dwarf planet.',
    scienceFact: 'It is the only spacecraft that has orbited two bodies of the Asteroid Belt.',
  },
  hw_kepler: {
    title: '2009 · Kepler · Exoplanet hunter',
    nasaBadge: 'Launched Mar 7, 2009 · Earth-trailing solar orbit',
    narration:
      'It watched more than 150,000 stars and confirmed more than 2,600 planets. Out of fuel since 2018, it drifts in an orbit around the Sun that trails the Earth.',
    scienceFact: 'Its orbit lasts 372.5 days, so each year it falls a little farther behind the Earth.',
  },
  hw_insight: {
    title: '2018 · InSight · Listening to marsquakes',
    nasaBadge: 'Launched May 5, 2018 · Elysium Planitia',
    narration:
      'Its seismometer recorded more than 1,300 marsquakes and revealed the liquid core of Mars. Dust covered its panels until it ran out of power.',
    scienceFact: 'Its last contact was on December 15, 2022.',
  },
  hw_ingenuity: {
    title: '2020 · Ingenuity · First flight on another planet',
    nasaBadge: 'Launched Jul 30, 2020 · Valinor Hills, Jezero',
    narration:
      'It traveled with Perseverance and flew 72 times. On its last landing it damaged a rotor blade and became a stationary artifact at Valinor Hills.',
    scienceFact: 'It flew in an atmosphere only 1% as dense as Earth’s.',
  },
  sun_core: {
    title: 'The Sun · Central G2V reactor',
    nasaBadge: 'NASA SDO · 5,505 °C photosphere',
    narration:
      'The whole Solar System orbits the mass of our star (99.86% of the total mass). Its magnetic prominences fling solar plasma across interplanetary space.',
    scienceFact: 'Surface gravity: 274 m/s² · Galactic speed: 230 km/s.',
  },
  mercury_orbit: {
    title: 'Mercury · Record orbital speed',
    nasaBadge: 'JPL J2000 · 0.39 AU',
    narration:
      'As the planet closest to the Sun, Mercury races at 47.4 km/s on average (up to 59 km/s at perihelion), completing an orbit in just 88 days.',
    scienceFact: 'Its eccentricity of 0.206 is the highest of the eight planets.',
  },
  earth_system: {
    title: 'The Earth and the Moon at real scale',
    nasaBadge: 'NASA PDS · 1.00 AU (60.3 Earth radii)',
    narration:
      'Our planet orbits at 29.78 km/s under an atmosphere of nitrogen and oxygen. Its Moon orbits at exactly 60.3 Earth radii, tidally locked.',
    scienceFact: 'Sunlight takes 8 min 19 s to travel the 149.6 million km to here.',
  },
  mars_world: {
    title: 'Mars · The red planet, unadorned',
    nasaBadge: 'NASA MGS / MRO · 1.52 AU',
    narration:
      'With a 24 h 37 min day and seasonal polar caps of CO₂ and water ice, Mars receives less than half of the solar radiation Earth gets.',
    scienceFact: 'Thin 6 mbar atmosphere (95.3% CO₂) · Gravity: 3.72 m/s².',
  },
  jupiter_king: {
    title: 'Jupiter · Gravity shield and moons',
    nasaBadge: 'NASA Juno · 5.20 AU',
    narration:
      'Its fast 9 h 55 min rotation sculpts cloud bands, intense polar auroras and the four Galilean moons discovered in 1610.',
    scienceFact: 'Its escape velocity reaches 59.5 km/s, more than five times Earth’s.',
  },
  saturn_rings: {
    title: 'Saturn · Ring architecture',
    nasaBadge: 'NASA Cassini · 9.54 AU',
    narration:
      'At almost 10 times the Sun–Earth distance, light takes 79 minutes to arrive. Its icy rings show the Cassini Division and the Encke and Keeler gaps.',
    scienceFact: 'Mean density of 0.687 g/cm³, lower than that of liquid water.',
  },
  neptune_outer: {
    title: 'Neptune · Blue frontier of the giants',
    nasaBadge: 'Voyager 2 · 30.07 AU',
    narration:
      'At 4.5 billion km from the Sun (4 h 10 light-minutes), Neptune’s supersonic winds exceed 2,000 km/h and its largest moon, Triton, orbits backwards.',
    scienceFact: 'It completes a single orbit around the Sun every 164.8 Earth years.',
  },
  ow_europa: {
    title: 'Europa · Global ocean under the ice',
    nasaBadge: 'NASA Europa Clipper · Jupiter',
    narration:
      'Beneath a fractured crust of water ice 15–25 km thick hides a salty liquid ocean warmed by Jupiter’s tides.',
    scienceFact: 'It holds about twice as much liquid water as all of Earth’s oceans.',
  },
  ow_enceladus: {
    title: 'Enceladus · Active south-pole geysers',
    nasaBadge: 'NASA Cassini · Saturn',
    narration:
      'The “tiger stripes” at the south pole blast plumes of water vapor, salts and molecular hydrogen straight from an internal hydrothermal ocean.',
    scienceFact: 'It has the three key chemical ingredients for life: water, energy and organics.',
  },
  ow_titan: {
    title: 'Titan · Rivers of liquid methane',
    nasaBadge: 'ESA/NASA Huygens · Saturn',
    narration:
      'The only moon in the Solar System with a dense, nitrogen-rich atmosphere and a full weather cycle with rain, rivers and seas of methane and ethane.',
    scienceFact: 'Surface pressure of 1.45 atm at −179 °C · Larger in diameter than Mercury.',
  },
  ow_ceres: {
    title: 'Ceres · Brines of the Asteroid Belt',
    nasaBadge: 'NASA Dawn · 2.77 AU',
    narration:
      'The innermost dwarf planet keeps white sodium carbonate deposits in Occator crater, traces of cryovolcanism and recent brines.',
    scienceFact: 'It holds almost a third of the total mass of the Main Asteroid Belt.',
  },
  ow_pluto: {
    title: 'Pluto · Nitrogen glaciers',
    nasaBadge: 'NASA New Horizons · 39.48 AU',
    narration:
      'Sputnik Planitia, its huge 1,000 km glacial heart, constantly renews its icy surface through internal thermal convection.',
    scienceFact: 'It has mountains of water ice as hard as rock at −229 °C.',
  },
  hm_apollo11: {
    title: 'Apollo 11 Eagle · First steps (1969)',
    nasaBadge: 'NASA Apollo · Mare Tranquillitatis',
    narration:
      'On July 20, 1969, the Eagle module descended to the Moon. Its descent stage, the flag and the seismometer remain intact in the Sea of Tranquility.',
    scienceFact: 'It brought back 21.5 kg of lunar basalts that dated the origin of the Earth–Moon system.',
  },
  hm_iss: {
    title: 'International Space Station (ISS)',
    nasaBadge: 'NASA/ESA/JAXA · 408 km altitude',
    narration:
      'Spanning 109 meters, its integrated truss holds eight huge copper-colored Kapton solar wings and six thermal radiators.',
    scienceFact: 'It orbits the Earth at 7.66 km/s, completing a lap every 92 minutes.',
  },
  hm_perseverance: {
    title: 'Perseverance and Ingenuity · Jezero crater',
    nasaBadge: 'NASA Mars 2020 · 18.38° N 77.58° E',
    narration:
      'It explores an ancient Martian river delta, sealing rock cores, and made history alongside the Ingenuity helicopter and its 72 flights.',
    scienceFact: 'Its MOXIE instrument produced breathable oxygen on another planet for the first time.',
  },
  hm_jwst: {
    title: 'James Webb Space Telescope (JWST)',
    nasaBadge: 'NASA/ESA/CSA · L2 point, 1.5 M km',
    narration:
      'Its 6.5-meter golden hexagonal mirror and 5-layer sunshield capture the infrared light of the first galaxies and of nebulae in the Milky Way.',
    scienceFact: 'It operates shielded from the Sun’s heat at cryogenic temperatures of −233 °C.',
  },
  hm_voyager1: {
    title: 'Voyager 1 · Interstellar envoy',
    nasaBadge: 'NASA JPL · >166 AU',
    narration:
      'Launched in 1977, it crossed the heliopause in 2012 and still sends measurements of interstellar plasma while carrying the Golden Record.',
    scienceFact: 'Its radio signals take almost 23 hours to reach Earth at the speed of light.',
  },
  mw_map: {
    title: 'Architecture of the Milky Way',
    nasaBadge: 'Gaia DR3 · 105,700 light-years',
    narration:
      'See our whole galaxy in 3D, with the real position of the Sun in the Orion Spur and all the official black holes, pulsars and nebulae.',
    scienceFact: 'It holds between 100 and 400 billion stars in four spiral arms.',
  },
  mw_sgra: {
    title: 'Sagittarius A* · Galactic core',
    nasaBadge: 'EHT / Chandra · 4.3 M solar masses',
    narration:
      'The central gravitational giant that rules the core of our galaxy. The extreme bending of light forms its characteristic photon ring.',
    scienceFact: 'Event horizon diameter: 24 million kilometers.',
  },
  mw_cygx1: {
    title: 'Cygnus X-1 · Star-eating binary',
    nasaBadge: 'NASA Chandra · 21.2 solar masses',
    narration:
      'At 7,200 light-years, this stellar black hole pulls a constant stream of gas from the blue supergiant HDE 226868, which it circles every 5.6 days.',
    scienceFact: 'It was the first black hole ever confirmed by observation.',
  },
  mw_crab: {
    title: 'Crab Pulsar · A 30 Hz lighthouse',
    nasaBadge: 'NASA Chandra · 6,500 light-years',
    narration:
      'An ultradense neutron sphere just 20 km across that spins 30.2 times per second, surrounded by a bright X-ray torus of particles.',
    scienceFact: 'It was born in the bright supernova observed and recorded in the year 1054 AD.',
  },
  mw_pillars: {
    title: 'Pillars of Creation (M16)',
    nasaBadge: 'NASA Webb & Hubble · 5,700 light-years',
    narration:
      'Giant columns of cold gas and dust 5 light-years tall, sculpted by ultraviolet stellar winds, where young stars are born in the infrared.',
    scienceFact: 'The bright tips contain protostellar knots the size of solar systems.',
  },
  mw_orion: {
    title: 'Orion Nebula (M42)',
    nasaBadge: 'NASA JWST & Hubble · 1,344 light-years',
    narration:
      'Our nearest laboratory of star formation and protoplanetary disks, around the young Trapezium star cluster.',
    scienceFact: 'Visible to the naked eye as the fuzzy middle star of Orion’s sword.',
  },
};
