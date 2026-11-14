export type CelestialBodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'ceres'
  | 'comet67p'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'eris';

export type MoonTextureStyle =
  | 'luna'
  | 'phobos'
  | 'deimos'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'enceladus'
  | 'rhea'
  | 'titan'
  | 'iapetus'
  | 'miranda'
  | 'ariel'
  | 'titania'
  | 'oberon'
  | 'proteus'
  | 'triton'
  | 'charon';

export interface MoonData {
  id: string;
  name: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriodDays: number; // Negative = retrograde
  inclinationDeg: number;
  j2000MeanLonDeg: number;
  irregular?: boolean;
  style: MoonTextureStyle;
  atmosphereColor?: string;
  textureUrl?: string;
  bumpUrl?: string;
}

export interface CelestialBodyData {
  id: CelestialBodyId;
  name: string;
  classification: string;
  description: string;
  accentColor: string;
  atmosphereColor?: string;
  atmosphereIntensity?: number;
  /** Visual radius in Three.js world units */
  visualRadius: number;
  /** Real semi-major axis in AU (0 for Sun) */
  semiMajorAxisAu: number;
  /** Axial tilt / obliquity (degrees) */
  axialTiltDeg: number;
  /** Real orbital period in Earth days */
  orbitalPeriodDays: number;
  /** Real sidereal rotation period in hours (negative = retrograde) */
  rotationPeriodHours: number;
  cameraDistanceFactor: number;
  stats: {
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
  textures: {
    map: string;
    bumpMap?: string;
    normalMap?: string;
    specularMap?: string;
    cloudsMap?: string;
    ringColorMap?: string;
    ringAlphaMap?: string;
  };
  rings?: {
    innerMultiplier: number;
    outerMultiplier: number;
    opacity: number;
    hasCassiniDetail: boolean;
  };
  moons: MoonData[];
}

const PLANETS_LOCAL_BASE = '/textures/planets';
const MOONS_LOCAL_BASE = '/textures/moons';

export const CELESTIAL_BODIES: CelestialBodyData[] = [
  {
    id: 'sun',
    name: 'Sol',
    classification: 'Estrella enana amarilla · G2V',
    description:
      'Estrella central del Sistema Solar. Única fuente de luz física que proyecta el contraste real día/noche en todo el sistema.',
    accentColor: '#F59E0B',
    visualRadius: 4.65,
    semiMajorAxisAu: 0,
    axialTiltDeg: 7.25,
    orbitalPeriodDays: 1,
    rotationPeriodHours: 609.12,
    cameraDistanceFactor: 4.2,
    stats: {
      distanceAu: '0,00 UA',
      diameterKm: '1.392.700 km',
      orbitalPeriod: '230 M años',
      dayLength: '25,4 días',
      temperature: '5.505 °C',
      moonsCount: '8 planetas',
      gravity: '274,0 m/s²',
      escapeVelocity: '617,7 km/s',
      atmosphere: '73% H · 25% He (plasma fotosférico)',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/sunmap.jpg`,
    },
    moons: [],
  },
  {
    id: 'mercury',
    name: 'Mercurio',
    classification: 'Planeta rocoso · Interior',
    description:
      'El planeta más próximo al Sol (0,39 UA). Lugar de descanso de la sonda MESSENGER en la planicie Shakespeare.',
    accentColor: '#94A3B8',
    visualRadius: 0.42,
    semiMajorAxisAu: 0.387,
    axialTiltDeg: 0.03,
    orbitalPeriodDays: 87.97,
    rotationPeriodHours: 1407.6,
    cameraDistanceFactor: 4.0,
    stats: {
      distanceAu: '0,39 UA',
      diameterKm: '4.879 km',
      orbitalPeriod: '88 días',
      dayLength: '58,6 días',
      temperature: '−180 a 430 °C',
      moonsCount: '0',
      gravity: '3,70 m/s²',
      escapeVelocity: '4,25 km/s',
      atmosphere: 'Exosfera tenue (O₂, Na, H₂, He)',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/mercurymap.jpg`,
      bumpMap: `${PLANETS_LOCAL_BASE}/mercurybump.jpg`,
    },
    moons: [],
  },
  {
    id: 'venus',
    name: 'Venus',
    classification: 'Planeta rocoso · Interior',
    description:
      'Planeta de rotación retrógrada envuelto en densas nubes sulfúricas. En su infierno superficial yace el aterrizador soviético Venera 13.',
    accentColor: '#EAB308',
    atmosphereColor: '#FDBA74',
    atmosphereIntensity: 0.38,
    visualRadius: 0.85,
    semiMajorAxisAu: 0.723,
    axialTiltDeg: 177.36,
    orbitalPeriodDays: 224.7,
    rotationPeriodHours: -5832.5,
    cameraDistanceFactor: 3.8,
    stats: {
      distanceAu: '0,72 UA',
      diameterKm: '12.104 km',
      orbitalPeriod: '225 días',
      dayLength: '243 días (ret.)',
      temperature: '464 °C',
      moonsCount: '0',
      gravity: '8,87 m/s²',
      escapeVelocity: '10,36 km/s',
      atmosphere: '96,5% CO₂ · 3,5% N₂ (92 bar)',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/venusmap.jpg`,
      bumpMap: `${PLANETS_LOCAL_BASE}/venusbump.jpg`,
    },
    moons: [],
  },
  {
    id: 'earth',
    name: 'Tierra',
    classification: 'Planeta rocoso · Zona habitable',
    description:
      'Nuestro punto de origen a 1,00 UA, acompañado por la Luna en acoplamiento de marea síncrono con reliquias históricas como Apollo 11 Eagle y Lunokhod.',
    accentColor: '#38BDF8',
    atmosphereColor: '#60A5FA',
    atmosphereIntensity: 0.58,
    visualRadius: 0.92,
    semiMajorAxisAu: 1.0,
    axialTiltDeg: 23.44,
    orbitalPeriodDays: 365.256,
    rotationPeriodHours: 23.934,
    cameraDistanceFactor: 3.8,
    stats: {
      distanceAu: '1,00 UA',
      diameterKm: '12.742 km',
      orbitalPeriod: '365,25 días',
      dayLength: '23 h 56 min',
      temperature: '15 °C',
      moonsCount: '1',
      gravity: '9,81 m/s²',
      escapeVelocity: '11,19 km/s',
      atmosphere: '78% N₂ · 21% O₂ · 1% Ar',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/earth_atmos_2048.jpg`,
      normalMap: `${PLANETS_LOCAL_BASE}/earth_normal_2048.jpg`,
      specularMap: `${PLANETS_LOCAL_BASE}/earth_specular_2048.jpg`,
      cloudsMap: `${PLANETS_LOCAL_BASE}/earth_clouds_1024.png`,
    },
    moons: [
      {
        id: 'luna',
        name: 'Luna',
        radius: 0.25,
        orbitRadius: 55.5, // Real NASA ratio: 384,400 km / 6,371 km = 60.33 R_earth
        orbitalPeriodDays: 27.32166,
        inclinationDeg: 5.14,
        j2000MeanLonDeg: 218.32,
        style: 'luna',
        textureUrl: `${MOONS_LOCAL_BASE}/moon_1024.jpg`,
        bumpUrl: `${MOONS_LOCAL_BASE}/moonbump1k.jpg`,
      },
    ],
  },
  {
    id: 'mars',
    name: 'Marte',
    classification: 'Planeta rocoso · Interior',
    description:
      'Hogar silencioso de Opportunity, Spirit, InSight, Sojourner y Phoenix. A 1,52 UA del Sol, la luz solar es menos de la mitad que en la Tierra.',
    accentColor: '#EF4444',
    atmosphereColor: '#FB923C',
    atmosphereIntensity: 0.22,
    visualRadius: 0.56,
    semiMajorAxisAu: 1.524,
    axialTiltDeg: 25.19,
    orbitalPeriodDays: 686.98,
    rotationPeriodHours: 24.623,
    cameraDistanceFactor: 3.9,
    stats: {
      distanceAu: '1,52 UA',
      diameterKm: '6.779 km',
      orbitalPeriod: '687 días',
      dayLength: '24 h 37 min',
      temperature: '−65 °C',
      moonsCount: '2',
      gravity: '3,72 m/s²',
      escapeVelocity: '5,03 km/s',
      atmosphere: '95,3% CO₂ · 2,6% N₂ · 1,9% Ar (6 mbar)',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/marsmap2k.jpg`,
      bumpMap: `${PLANETS_LOCAL_BASE}/marsbump1k.jpg`,
    },
    moons: [
      {
        id: 'phobos',
        name: 'Fobos',
        radius: 0.085,
        orbitRadius: 1.55, // Real NASA ratio: 9,376 km / 3,390 km = 2.77 R_mars
        orbitalPeriodDays: 0.3189,
        inclinationDeg: 1.09,
        j2000MeanLonDeg: 42.0,
        irregular: true,
        style: 'phobos',
        textureUrl: `${MOONS_LOCAL_BASE}/phobos.jpg`,
      },
      {
        id: 'deimos',
        name: 'Deimos',
        radius: 0.06,
        orbitRadius: 3.88, // Real NASA ratio: 23,463 km / 3,390 km = 6.92 R_mars
        orbitalPeriodDays: 1.263,
        inclinationDeg: 1.79,
        j2000MeanLonDeg: 195.0,
        irregular: true,
        style: 'deimos',
        textureUrl: `${MOONS_LOCAL_BASE}/deimos.jpg`,
      },
    ],
  },
  {
    id: 'ceres',
    name: 'Ceres',
    classification: 'Planeta enano · Cinturón de asteroides',
    description:
      'El mayor cuerpo del Cinturón Principal de Asteroides (2,77 UA). Visitado por la sonda Dawn, posee depósitos brillantes de sales hidrotermales en el cráter Occator.',
    accentColor: '#9CA3AF',
    visualRadius: 0.24,
    semiMajorAxisAu: 2.768,
    axialTiltDeg: 4.0,
    orbitalPeriodDays: 1681.63,
    rotationPeriodHours: 9.074,
    cameraDistanceFactor: 4.6,
    stats: {
      distanceAu: '2,77 UA',
      diameterKm: '939 km',
      orbitalPeriod: '4,60 años',
      dayLength: '9 h 04 min',
      temperature: '−105 °C',
      moonsCount: '0',
      gravity: '0,28 m/s²',
      escapeVelocity: '0,51 km/s',
      atmosphere: 'Vapor de agua transitorio muy tenue',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/ceresmap.jpg`,
    },
    moons: [],
  },
  {
    id: 'comet67p',
    name: 'Cometa 67P',
    classification: 'Cometa periódico · Familia de Júpiter',
    description:
      'Núcleo bilobulado de 4 km en órbita elíptica excéntrica (1,24–5,68 UA). En su superficie reposan la sonda Rosetta y el módulo Philae.',
    accentColor: '#67E8F9',
    visualRadius: 0.32,
    semiMajorAxisAu: 3.463,
    axialTiltDeg: 52.0,
    orbitalPeriodDays: 2352.6,
    rotationPeriodHours: 12.404,
    cameraDistanceFactor: 4.5,
    stats: {
      distanceAu: '1,24–5,68 UA',
      diameterKm: '4,3 × 4,1 km',
      orbitalPeriod: '6,44 años',
      dayLength: '12 h 24 min',
      temperature: '−70 a −180 °C',
      moonsCount: '0',
      gravity: '0,0002 m/s²',
      escapeVelocity: '0,001 km/s',
      atmosphere: 'Coma de H₂O, CO₂, CO y orgánicos',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/comet67p.jpg`,
    },
    moons: [],
  },
  {
    id: 'jupiter',
    name: 'Júpiter',
    classification: 'Gigante gaseoso · Exterior',
    description:
      'Gigante gaseoso a 5,20 UA del Sol con bandas nubosas diferenciales y las cuatro lunas galileanas: Ío, Europa, Ganimedes y Calisto.',
    accentColor: '#FB923C',
    atmosphereColor: '#FDBA74',
    atmosphereIntensity: 0.2,
    visualRadius: 3.1,
    semiMajorAxisAu: 5.203,
    axialTiltDeg: 3.13,
    orbitalPeriodDays: 4332.59,
    rotationPeriodHours: 9.925,
    cameraDistanceFactor: 3.8,
    stats: {
      distanceAu: '5,20 UA',
      diameterKm: '139.820 km',
      orbitalPeriod: '11,86 años',
      dayLength: '9 h 55 min',
      temperature: '−110 °C',
      moonsCount: '95',
      gravity: '24,79 m/s²',
      escapeVelocity: '59,5 km/s',
      atmosphere: '89,8% H₂ · 10,2% He · CH₄, NH₃',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/jupitermap.jpg`,
    },
    moons: [
      {
        id: 'io',
        name: 'Ío',
        radius: 0.25,
        orbitRadius: 18.29, // Real NASA ratio: 421,700 km / 71,492 km = 5.90 R_jupiter
        orbitalPeriodDays: 1.769,
        inclinationDeg: 0.05,
        j2000MeanLonDeg: 106.1,
        style: 'io',
        textureUrl: `${MOONS_LOCAL_BASE}/io.jpg`,
      },
      {
        id: 'europa',
        name: 'Europa',
        radius: 0.22,
        orbitRadius: 29.1, // Real NASA ratio: 671,034 km / 71,492 km = 9.39 R_jupiter
        orbitalPeriodDays: 3.551,
        inclinationDeg: 0.47,
        j2000MeanLonDeg: 175.0,
        style: 'europa',
        textureUrl: `${MOONS_LOCAL_BASE}/europa.jpg`,
      },
      {
        id: 'ganymede',
        name: 'Ganimedes',
        radius: 0.37,
        orbitRadius: 46.41, // Real NASA ratio: 1,070,412 km / 71,492 km = 14.97 R_jupiter
        orbitalPeriodDays: 7.155,
        inclinationDeg: 0.2,
        j2000MeanLonDeg: 43.0,
        style: 'ganymede',
        textureUrl: `${MOONS_LOCAL_BASE}/ganymede.jpg`,
      },
      {
        id: 'callisto',
        name: 'Calisto',
        radius: 0.33,
        orbitRadius: 81.64, // Real NASA ratio: 1,882,709 km / 71,492 km = 26.34 R_jupiter
        orbitalPeriodDays: 16.689,
        inclinationDeg: 0.5,
        j2000MeanLonDeg: 317.0,
        style: 'callisto',
        textureUrl: `${MOONS_LOCAL_BASE}/callisto.jpg`,
      },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturno',
    classification: 'Gigante gaseoso · Sistema de anillos',
    description:
      'A 9,58 UA, donde la luz solar es casi 100 veces más tenue que en la Tierra. Cassini reposa en su atmósfera y Huygens descansa en Titán.',
    accentColor: '#FACC15',
    atmosphereColor: '#FDE68A',
    atmosphereIntensity: 0.18,
    visualRadius: 2.6,
    semiMajorAxisAu: 9.537,
    axialTiltDeg: 26.73,
    orbitalPeriodDays: 10759.22,
    rotationPeriodHours: 10.656,
    cameraDistanceFactor: 4.6,
    stats: {
      distanceAu: '9,54 UA',
      diameterKm: '116.460 km',
      orbitalPeriod: '29,45 años',
      dayLength: '10 h 39 min',
      temperature: '−140 °C',
      moonsCount: '146',
      gravity: '10,44 m/s²',
      escapeVelocity: '35,5 km/s',
      atmosphere: '96,3% H₂ · 3,25% He · trazas CH₄',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/saturnmap.jpg`,
      ringColorMap: `${PLANETS_LOCAL_BASE}/saturnringcolor.jpg`,
      ringAlphaMap: `${PLANETS_LOCAL_BASE}/saturnringpattern.gif`,
    },
    rings: {
      innerMultiplier: 1.32,
      outerMultiplier: 2.58,
      opacity: 0.94,
      hasCassiniDetail: true,
    },
    moons: [
      {
        id: 'enceladus',
        name: 'Encélado',
        radius: 0.15,
        orbitRadius: 10.27, // Real NASA ratio: 237,948 km / 60,268 km = 3.95 R_saturn (clears rings at 6.71)
        orbitalPeriodDays: 1.37,
        inclinationDeg: 0.02,
        j2000MeanLonDeg: 198.0,
        style: 'enceladus',
        textureUrl: `${MOONS_LOCAL_BASE}/enceladus.jpg`,
      },
      {
        id: 'rhea',
        name: 'Rea',
        radius: 0.21,
        orbitRadius: 22.74, // Real NASA ratio: 527,108 km / 60,268 km = 8.75 R_saturn
        orbitalPeriodDays: 4.518,
        inclinationDeg: 0.35,
        j2000MeanLonDeg: 35.0,
        style: 'rhea',
        textureUrl: `${MOONS_LOCAL_BASE}/rhea.jpg`,
      },
      {
        id: 'titan',
        name: 'Titán',
        radius: 0.38,
        orbitRadius: 52.71, // Real NASA ratio: 1,221,870 km / 60,268 km = 20.27 R_saturn
        orbitalPeriodDays: 15.945,
        inclinationDeg: 0.35,
        j2000MeanLonDeg: 163.0,
        style: 'titan',
        atmosphereColor: '#F59E0B',
        textureUrl: `${MOONS_LOCAL_BASE}/titan.jpg`,
      },
      {
        id: 'iapetus',
        name: 'Jápeto',
        radius: 0.2,
        orbitRadius: 153.62, // Real NASA ratio: 3,560,820 km / 60,268 km = 59.08 R_saturn
        orbitalPeriodDays: 79.322,
        inclinationDeg: 15.47,
        j2000MeanLonDeg: 318.0,
        style: 'iapetus',
        textureUrl: `${MOONS_LOCAL_BASE}/iapetus.jpg`,
      },
    ],
  },
  {
    id: 'uranus',
    name: 'Urano',
    classification: 'Gigante helado · Exterior',
    description:
      'Gigante helado a 19,19 UA con una inclinación axial extrema de 97,8°. Sus tenues anillos y lunas giran casi perpendiculares a la eclíptica.',
    accentColor: '#22D3EE',
    atmosphereColor: '#67E8F9',
    atmosphereIntensity: 0.28,
    visualRadius: 1.65,
    semiMajorAxisAu: 19.189,
    axialTiltDeg: 97.77,
    orbitalPeriodDays: 30688.5,
    rotationPeriodHours: -17.24,
    cameraDistanceFactor: 4.2,
    stats: {
      distanceAu: '19,19 UA',
      diameterKm: '50.724 km',
      orbitalPeriod: '84 años',
      dayLength: '17 h 14 min (ret.)',
      temperature: '−195 °C',
      moonsCount: '28',
      gravity: '8,87 m/s²',
      escapeVelocity: '21,3 km/s',
      atmosphere: '82,5% H₂ · 15,2% He · 2,3% CH₄',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/uranusmap.jpg`,
      ringColorMap: `${PLANETS_LOCAL_BASE}/uranusringcolour.jpg`,
      ringAlphaMap: `${PLANETS_LOCAL_BASE}/uranusringtrans.gif`,
    },
    rings: {
      innerMultiplier: 1.46,
      outerMultiplier: 1.88,
      opacity: 0.36,
      hasCassiniDetail: false,
    },
    moons: [
      {
        id: 'miranda',
        name: 'Miranda',
        radius: 0.11,
        orbitRadius: 8.35, // Real NASA ratio: 129,390 km / 25,559 km = 5.06 R_uranus
        orbitalPeriodDays: 1.413,
        inclinationDeg: 4.2,
        j2000MeanLonDeg: 311.0,
        style: 'miranda',
        textureUrl: `${MOONS_LOCAL_BASE}/miranda.jpg`,
      },
      {
        id: 'ariel',
        name: 'Ariel',
        radius: 0.15,
        orbitRadius: 12.33, // Real NASA ratio: 191,020 km / 25,559 km = 7.47 R_uranus
        orbitalPeriodDays: 2.52,
        inclinationDeg: 0.26,
        j2000MeanLonDeg: 156.0,
        style: 'ariel',
        textureUrl: `${MOONS_LOCAL_BASE}/ariel.jpg`,
      },
      {
        id: 'titania',
        name: 'Titania',
        radius: 0.2,
        orbitRadius: 28.14, // Real NASA ratio: 435,910 km / 25,559 km = 17.06 R_uranus
        orbitalPeriodDays: 8.706,
        inclinationDeg: 0.34,
        j2000MeanLonDeg: 25.0,
        style: 'titania',
        textureUrl: `${MOONS_LOCAL_BASE}/titania.jpg`,
      },
      {
        id: 'oberon',
        name: 'Oberón',
        radius: 0.18,
        orbitRadius: 37.67, // Real NASA ratio: 583,520 km / 25,559 km = 22.83 R_uranus
        orbitalPeriodDays: 13.463,
        inclinationDeg: 0.06,
        j2000MeanLonDeg: 283.0,
        style: 'oberon',
        textureUrl: `${MOONS_LOCAL_BASE}/oberon.jpg`,
      },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptuno',
    classification: 'Gigante helado · Exterior',
    description:
      'A 30,07 UA del Sol, donde la luz tarda más de cuatro horas en llegar. Tritón orbita a su alrededor en sentido retrógrado.',
    accentColor: '#3B82F6',
    atmosphereColor: '#60A5FA',
    atmosphereIntensity: 0.32,
    visualRadius: 1.6,
    semiMajorAxisAu: 30.07,
    axialTiltDeg: 28.32,
    orbitalPeriodDays: 60182,
    rotationPeriodHours: 16.11,
    cameraDistanceFactor: 4.2,
    stats: {
      distanceAu: '30,07 UA',
      diameterKm: '49.244 km',
      orbitalPeriod: '164,8 años',
      dayLength: '16 h 6 min',
      temperature: '−200 °C',
      moonsCount: '16',
      gravity: '11,15 m/s²',
      escapeVelocity: '23,5 km/s',
      atmosphere: '80% H₂ · 19% He · 1,5% CH₄',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/neptunemap.jpg`,
    },
    moons: [
      {
        id: 'proteus',
        name: 'Proteo',
        radius: 0.11,
        orbitRadius: 7.6, // Real NASA ratio: 117,647 km / 24,764 km = 4.75 R_neptune
        orbitalPeriodDays: 1.122,
        inclinationDeg: 0.5,
        j2000MeanLonDeg: 90.0,
        irregular: true,
        style: 'proteus',
      },
      {
        id: 'triton',
        name: 'Tritón',
        radius: 0.28,
        orbitRadius: 22.92, // Real NASA ratio: 354,759 km / 24,764 km = 14.33 R_neptune
        orbitalPeriodDays: -5.877,
        inclinationDeg: 23.0,
        j2000MeanLonDeg: 221.0,
        style: 'triton',
        textureUrl: `${MOONS_LOCAL_BASE}/triton.jpg`,
      },
    ],
  },
  {
    id: 'pluto',
    name: 'Plutón',
    classification: 'Planeta enano · Cinturón de Kuiper',
    description:
      'Mundo helado a 39,5 UA del Sol con glaciares de nitrógeno sólido en Sputnik Planitia y una órbita binaria junto a su gran luna Caronte.',
    accentColor: '#E2B48D',
    atmosphereColor: '#93C5FD',
    atmosphereIntensity: 0.24,
    visualRadius: 0.28,
    semiMajorAxisAu: 39.48,
    axialTiltDeg: 122.53,
    orbitalPeriodDays: 90560,
    rotationPeriodHours: -153.29,
    cameraDistanceFactor: 4.6,
    stats: {
      distanceAu: '39,48 UA',
      diameterKm: '2.377 km',
      orbitalPeriod: '247,9 años',
      dayLength: '6,39 días (ret.)',
      temperature: '−229 °C',
      moonsCount: '5',
      gravity: '0,62 m/s²',
      escapeVelocity: '1,21 km/s',
      atmosphere: 'N₂, CH₄, CO tenue (10 µbar)',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/plutomap.jpg`,
      bumpMap: `${PLANETS_LOCAL_BASE}/plutobump1k.jpg`,
    },
    moons: [
      {
        id: 'charon',
        name: 'Caronte',
        radius: 0.145,
        orbitRadius: 4.62, // Real NASA ratio: 19,591 km / 1,188 km = 16.49 R_pluto
        orbitalPeriodDays: 6.387,
        inclinationDeg: 0.08,
        j2000MeanLonDeg: 223.0,
        style: 'charon',
        textureUrl: `${MOONS_LOCAL_BASE}/charon.jpg`,
      },
    ],
  },
  {
    id: 'eris',
    name: 'Eris',
    classification: 'Planeta enano · Disco disperso',
    description:
      'Uno de los planetas enanos más masivos del Sistema Solar exterior (67,8 UA de distancia media), cubierto por una brillante corteza de escarcha de metano.',
    accentColor: '#E2E8F0',
    visualRadius: 0.27,
    semiMajorAxisAu: 67.78,
    axialTiltDeg: 78.0,
    orbitalPeriodDays: 204199,
    rotationPeriodHours: 25.9,
    cameraDistanceFactor: 4.6,
    stats: {
      distanceAu: '67,78 UA',
      diameterKm: '2.326 km',
      orbitalPeriod: '559 años',
      dayLength: '25 h 54 min',
      temperature: '−243 °C',
      moonsCount: '1',
      gravity: '0,82 m/s²',
      escapeVelocity: '1,38 km/s',
      atmosphere: 'Escarcha superficial de CH₄ y N₂',
    },
    textures: {
      map: `${PLANETS_LOCAL_BASE}/erismap.jpg`,
      bumpMap: `${PLANETS_LOCAL_BASE}/plutobump1k.jpg`,
    },
    moons: [],
  },
];

export type DeepSpaceCategory = 'galaxy' | 'black_hole' | 'pulsar' | 'nebula';

export type DeepSpaceTargetId =
  | 'milkyway'
  | 'sagittarius_a'
  | 'cygnus_x1'
  | 'gaia_bh1'
  | 'grs_1915'
  | 'crab_pulsar'
  | 'vela_pulsar'
  | 'nebula_orion'
  | 'nebula_eagle'
  | 'nebula_carina'
  | 'nebula_crab'
  | 'nebula_helix';

export interface DeepSpaceTarget {
  id: DeepSpaceTargetId;
  category: DeepSpaceCategory;
  categoryLabel: string;
  name: string;
  classification: string;
  distanceLabel: string;
  physicalScaleLabel: string;
  nasaObservatories: string;
  discoveryYear: string;
  /** Galactocentric XYZ position in light-years relative to Sgr A* (Sun sits near [0, 65, 26670]) */
  galacticPosLy: [number, number, number];
  whatItIs: string;
  whyImportant: string;
  nasaQuery: string;
  accentColor: string;
}

export const DEEP_SPACE_TARGETS: DeepSpaceTarget[] = [
  {
    id: 'milkyway',
    category: 'galaxy',
    categoryLabel: 'Galaxia',
    name: 'Vía Láctea (Mapa completo)',
    classification: 'Galaxia espiral barrada SBbc · 105.700 años luz',
    distanceLabel: '26.670 años luz al núcleo galáctico',
    physicalScaleLabel: 'Diámetro: 105.700 al · Grosor del disco: ~1.000 al',
    nasaObservatories: 'ESA Gaia · NASA Spitzer · Chandra · JWST',
    discoveryYear: '1920 (Shapley) / Gaia DR3',
    galacticPosLy: [0, 0, 0],
    whatItIs:
      'Nuestra galaxia hogar a escala proporcional: cuatro brazos espirales (Perseo, Escudo-Centauro, Sagitario y Norma) con nuestro Sol en el espolón de Orión, junto a las coordenadas reales de agujeros negros, púlsares y nebulosas oficiales.',
    whyImportant:
      'Permite ubicar con precisión científica todos los objetos extremos que habitan dentro de la Vía Láctea respecto al Sistema Solar y el centro galáctico.',
    nasaQuery: 'Milky Way galaxy center Spitzer Webb Chandra',
    accentColor: '#93C5FD',
  },
  // ================= AGUJEROS NEGROS OFICIALES EN LA VÍA LÁCTEA =================
  {
    id: 'sagittarius_a',
    category: 'black_hole',
    categoryLabel: 'Agujero Negro',
    name: 'Sagitario A* (Sgr A*)',
    classification: 'Agujero negro supermasivo · 4,3 M masas solares',
    distanceLabel: '26.670 años luz · Centro Galáctico',
    physicalScaleLabel: 'Horizonte de sucesos: 24 M km (~17 diámetros solares)',
    nasaObservatories: 'EHT · NASA Chandra · NuSTAR · JWST',
    discoveryYear: '1974 / Imagen EHT 2022',
    galacticPosLy: [0, 0, 0],
    whatItIs:
      'El agujero negro supermasivo en el centro exacto de la Vía Láctea. Su horizonte de sucesos mide unos 24 millones de km de diámetro y atrae plasma magnetizado y estrellas S a velocidades relativistas.',
    whyImportant:
      'Fotografiado en 2022 por el Event Horizon Telescope y monitoreado por Chandra, confirma la relatividad general en gravedad extrema y regula la dinámica central de nuestra galaxia.',
    nasaQuery: 'Sagittarius A star Event Horizon Telescope Chandra',
    accentColor: '#F59E0B',
  },
  {
    id: 'cygnus_x1',
    category: 'black_hole',
    categoryLabel: 'Agujero Negro',
    name: 'Cygnus X-1 (HDE 226868)',
    classification: 'Agujero negro estelar binario · 21,2 M☉',
    distanceLabel: '7.200 años luz · Brazo de Orión',
    physicalScaleLabel: 'Horizonte: ~125 km · Órbita binaria de 5,6 días',
    nasaObservatories: 'NASA Chandra · Uhuru · IXPE · NuSTAR',
    discoveryYear: '1964 / Confirmado 1971',
    galacticPosLy: [-6250, 380, 23050],
    whatItIs:
      'El primer agujero negro estelar confirmado de la historia. Succión gravitacional constante de gas desde su compañera supergigante azul HDE 226868 a través de un puente de acreción que brilla intensamente en rayos X.',
    whyImportant:
      'Demostró por primera vez la existencia real de agujeros negros nacidos del colapso de estrellas masivas y resolvió la célebre apuesta científica entre Stephen Hawking y Kip Thorne.',
    nasaQuery: 'Cygnus X-1 black hole NASA Chandra binary',
    accentColor: '#38BDF8',
  },
  {
    id: 'gaia_bh1',
    category: 'black_hole',
    categoryLabel: 'Agujero Negro',
    name: 'Gaia BH1',
    classification: 'Agujero negro latente más cercano · 9,62 M☉',
    distanceLabel: '1.560 años luz · Constelación de Ofiuco',
    physicalScaleLabel: 'Horizonte: ~57 km · Órbita estrella G: 1,4 UA (185,6 d)',
    nasaObservatories: 'ESA Gaia · Gemini / NOIRLab · Chandra',
    discoveryYear: '2022 (Gaia DR3)',
    galacticPosLy: [760, 480, 25360],
    whatItIs:
      'El agujero negro más cercano conocido a la Tierra: un remanente oscuro de 9,6 masas solares sin disco activo de acreción, acompañado en órbita tranquila por una estrella amarilla muy similar a nuestro Sol.',
    whyImportant:
      'Reveló una población oculta de agujeros negros silenciosos en nuestro vecindario solar que solo pueden detectarse midiendo el bamboleo astrométrico de su estrella compañera.',
    nasaQuery: 'Gaia BH1 closest black hole star orbit',
    accentColor: '#FBBF24',
  },
  {
    id: 'grs_1915',
    category: 'black_hole',
    categoryLabel: 'Agujero Negro',
    name: 'GRS 1915+105',
    classification: 'Microcuásar galáctico relativista · 12,4 M☉',
    distanceLabel: '28.000 años luz · Constelación del Águila',
    physicalScaleLabel: 'Horizonte: ~73 km · Chorros de plasma a 0,92 c',
    nasaObservatories: 'NASA Chandra · RXTE · Swift · Spitzer',
    discoveryYear: '1992 (Granat / VLA)',
    galacticPosLy: [-21500, -140, 8800],
    whatItIs:
      'Un agujero negro binario de rotación casi extrema dentro de nuestra galaxia que reproduce a pequeña escala el comportamiento de un cuásar, lanzando chorros bipolares de plasma a más del 90 % de la velocidad de la luz.',
    whyImportant:
      'Fue la primera fuente en la Vía Láctea donde se observaron eyecciones de plasma con movimiento aparente superlumínico, permitiendo estudiar cómo los discos magnéticos lanzan chorros relativistas.',
    nasaQuery: 'GRS 1915+105 microquasar NASA Chandra jet',
    accentColor: '#FB7185',
  },
  // ================= PÚLSARES OFICIALES EN LA VÍA LÁCTEA =================
  {
    id: 'crab_pulsar',
    category: 'pulsar',
    categoryLabel: 'Púlsar',
    name: 'Púlsar del Cangrejo (PSR B0531+21)',
    classification: 'Estrella de neutrones · 30,2 rotaciones/seg',
    distanceLabel: '6.500 años luz · Brazo de Perseo',
    physicalScaleLabel: 'Estrella: ~20 km · Toro de rayos X: ~1,5 años luz',
    nasaObservatories: 'NASA Chandra · Hubble · NICER · Fermi',
    discoveryYear: '1968 (Supernova SN 1054)',
    galacticPosLy: [1300, -650, 33050],
    whatItIs:
      'El núcleo ultradenso remanente de la supernova del año 1054 d. C. Gira 30,2 veces por segundo barriendo el espacio con haces electromagnéticos gemelos y alimentando un brillante toro de rayos X fotografiado por Chandra.',
    whyImportant:
      'Actúa como una dinamo cósmica que acelera partículas hasta energías de petaelectronvoltios, sirviendo como estándar de calibración en astrofísica de rayos X y rayos gamma.',
    nasaQuery: 'Crab Pulsar Chandra X-ray torus jets NASA',
    accentColor: '#60A5FA',
  },
  {
    id: 'vela_pulsar',
    category: 'pulsar',
    categoryLabel: 'Púlsar',
    name: 'Púlsar de Vela (PSR B0833-45)',
    classification: 'Estrella de neutrones · 11,2 rotaciones/seg',
    distanceLabel: '959 años luz · Constelación de Vela',
    physicalScaleLabel: 'Estrella: ~20 km · Chorro de rayos X: ~0,7 años luz',
    nasaObservatories: 'NASA Chandra · IXPE · Fermi · Hubble',
    discoveryYear: '1968 (Supernova hace ~11.000 años)',
    galacticPosLy: [940, -50, 26820],
    whatItIs:
      'Un joven púlsar que se desplaza a velocidad supersónica a través de los restos de su propia explosión estelar, creando dobles arcos de choque curvos y un chorro pulsante de partículas captado por Chandra e IXPE.',
    whyImportant:
      'Permitió observar en vídeo real cómo los vientos relativistas de una estrella de neutrones esculpen ondas de choque en el medio interestelar de nuestra galaxia.',
    nasaQuery: 'Vela Pulsar NASA Chandra X-ray jet movie',
    accentColor: '#22D3EE',
  },
  // ================= NEBULOSAS OFICIALES NASA EN LA VÍA LÁCTEA =================
  {
    id: 'nebula_orion',
    category: 'nebula',
    categoryLabel: 'Nebulosa NASA',
    name: 'Nebulosa de Orión (M42)',
    classification: 'Nebulosa difusa de emisión H II · ~24 años luz',
    distanceLabel: '1.344 años luz · Espolón de Orión',
    physicalScaleLabel: 'Diámetro: ~24 años luz · >700 estrellas jóvenes',
    nasaObservatories: 'NASA JWST · Hubble · Spitzer · Chandra',
    discoveryYear: '1610 (Peiresc) / JWST 2022–2024',
    galacticPosLy: [510, -450, 27840],
    whatItIs:
      'La región de formación estelar masiva más cercana a la Tierra. Vastos velos de hidrógeno y oxígeno ionizados brillan en tonos carmesí y turquesa alrededor del brillante cúmulo cuádruple del Trapecio.',
    whyImportant:
      'Gracias a Hubble y al James Webb (JWST), ha revelado discos protoplanetarios reales ("proplyds") donde nacen nuevos sistemas planetarios como el nuestro.',
    nasaQuery: 'Orion Nebula M42 Webb Hubble Trapezium',
    accentColor: '#F472B6',
  },
  {
    id: 'nebula_eagle',
    category: 'nebula',
    categoryLabel: 'Nebulosa NASA',
    name: 'Pilares de la Creación (M16 · Águila)',
    classification: 'Columnas moleculares interestelares · ~5 años luz',
    distanceLabel: '5.700 años luz · Brazo de Sagitario',
    physicalScaleLabel: 'Pilar mayor: ~4–5 años luz de altura',
    nasaObservatories: 'NASA Hubble · JWST NIRCam & MIRI · Chandra',
    discoveryYear: '1995 (Hubble) / 2022 (JWST)',
    galacticPosLy: [-1680, 120, 21220],
    whatItIs:
      'Tres monumentales columnas de hidrógeno molecular frío y polvo en la Nebulosa del Águila, erosionadas en sus puntas por la radiación ultravioleta de estrellas jóvenes masivas y repletas de nudos protoestelares dorados y carmesí.',
    whyImportant:
      'Constituyen una de las imágenes científicas más emblemáticas de la NASA, mostrando en directo cómo la radiación esculpe el gas donde nacen nuevas estrellas.',
    nasaQuery: 'Pillars of Creation Eagle Nebula Webb Hubble',
    accentColor: '#FB923C',
  },
  {
    id: 'nebula_carina',
    category: 'nebula',
    categoryLabel: 'Nebulosa NASA',
    name: 'Nebulosa de Carina y Eta Carinae (NGC 3372)',
    classification: 'Complejo nebular y estrella hipergigante · ~300 años luz',
    distanceLabel: '8.500 años luz · Brazo de Carina-Sagitario',
    physicalScaleLabel: 'Complejo: ~300 al · Homúnculo bipolar: ~0,7 al',
    nasaObservatories: 'NASA JWST (Acantilados Cósmicos) · Hubble · Chandra',
    discoveryYear: '1752 / Primer campo JWST 2022',
    galacticPosLy: [8100, -100, 24100],
    whatItIs:
      'Gigantesca guardería estelar coronada por la brillante nebulosa bipolar del Homúnculo alrededor de la inestable hipergigante Eta Carinae y los "Acantilados Cósmicos" de polvo dorado y azul revelados por el JWST.',
    whyImportant:
      'Eta Carinae es uno de los sistemas estelares más masivos y luminosos de toda la Vía Láctea, candidata a estallar en una espectacular supernova en escalas cósmicas.',
    nasaQuery: 'Carina Nebula Cosmic Cliffs Eta Carinae Webb Hubble',
    accentColor: '#FBBF24',
  },
  {
    id: 'nebula_crab',
    category: 'nebula',
    categoryLabel: 'Nebulosa NASA',
    name: 'Nebulosa del Cangrejo (M1)',
    classification: 'Remanente de supernova SN 1054 · ~11 años luz',
    distanceLabel: '6.500 años luz · Constelación de Tauro',
    physicalScaleLabel: 'Diámetro: ~11 años luz (se expande a 1.500 km/s)',
    nasaObservatories: 'NASA Hubble · JWST · Chandra · IXPE',
    discoveryYear: '1054 d. C. / Hubble & JWST 2023',
    galacticPosLy: [1300, -650, 33050],
    whatItIs:
      'Una intrincada jaula tridimensional de filamentos de azufre, oxígeno e hidrógeno en rápida expansión tras la explosión de una estrella en el año 1054, iluminada desde el centro por una nube sincrotrón azulada.',
    whyImportant:
      'Permite estudiar en detalle cómo las explosiones de supernova siembran la Vía Láctea con carbono, oxígeno, hierro y otros elementos esenciales para formar planetas y vida.',
    nasaQuery: 'Crab Nebula M1 Webb Hubble Chandra composite',
    accentColor: '#38BDF8',
  },
  {
    id: 'nebula_helix',
    category: 'nebula',
    categoryLabel: 'Nebulosa NASA',
    name: 'Nebulosa de la Hélice (NGC 7293)',
    classification: 'Nebulosa planetaria cercana · ~5,7 años luz',
    distanceLabel: '655 años luz · Constelación de Acuario',
    physicalScaleLabel: 'Diámetro: ~5,74 años luz · Nudos cometarios radiales',
    nasaObservatories: 'NASA Hubble · Spitzer · GALEX · Chandra',
    discoveryYear: '1824 (Harding) / Compuesto Hubble-Spitzer',
    galacticPosLy: [-210, -490, 26390],
    whatItIs:
      'Capas externas brillantes de gas eyectadas por una estrella moribunda similar al Sol: un doble anillo helicoidal azul-turquesa de oxígeno ionizado rodeado de hidrógeno carmesí y decenas de miles de nudos cometarios apuntando hacia su enana blanca central.',
    whyImportant:
      'Anticipa con gran realismo el destino futuro de nuestro propio Sol dentro de unos 5.000 millones de años cuando agote su combustible nuclear.',
    nasaQuery: 'Helix Nebula NGC 7293 Hubble Spitzer NASA',
    accentColor: '#2DD4BF',
  },
];


