import { CelestialBodyId, DeepSpaceTargetId } from './solarSystemData';

export type GuidedTourTarget =
  | { kind: 'body'; bodyId: CelestialBodyId }
  | { kind: 'moon'; bodyId: CelestialBodyId; moonId: string }
  | { kind: 'mission'; missionId: string }
  | { kind: 'deepspace'; id: DeepSpaceTargetId };

export interface GuidedTourStep {
  id: string;
  title: string;
  nasaBadge: string;
  narration: string;
  scienceFact: string;
  target: GuidedTourTarget;
}

export interface GuidedTour {
  id: string;
  name: string;
  subtitle: string;
  accentColor: string;
  steps: GuidedTourStep[];
}

export const NASA_GUIDED_TOURS: GuidedTour[] = [
  {
    id: 'solar_architecture',
    name: 'Gran Tour del Sistema Solar',
    subtitle: 'Escala real 1:215 · Datos abiertos NASA/JPL',
    accentColor: '#F59E0B',
    steps: [
      {
        id: 'sun_core',
        title: 'El Sol · Reactor G2V central',
        nasaBadge: 'NASA SDO · 5.505 °C fotosfera',
        narration:
          'Todo el Sistema Solar orbita la masa de nuestra estrella (99,86 % de la masa total). Sus prominencias magnéticas lanzan plasma solar a través del espacio interplanetario.',
        scienceFact: 'Gravedad superficial: 274 m/s² · Velocidad galáctica: 230 km/s.',
        target: { kind: 'body', bodyId: 'sun' },
      },
      {
        id: 'mercury_orbit',
        title: 'Mercurio · Velocidad orbital récord',
        nasaBadge: 'JPL J2000 · 0,39 UA',
        narration:
          'Al ser el planeta más próximo al Sol, Mercurio corre a 47,4 km/s de media (hasta 59 km/s en el perihelio), completando una órbita en apenas 88 días.',
        scienceFact: 'Su excentricidad de 0,206 es la mayor entre los ocho planetas.',
        target: { kind: 'body', bodyId: 'mercury' },
      },
      {
        id: 'earth_system',
        title: 'La Tierra y la Luna a escala real',
        nasaBadge: 'NASA PDS · 1,00 UA (60,3 radios terrestres)',
        narration:
          'Nuestro planeta orbita a 29,78 km/s bajo una atmósfera de nitrógeno y oxígeno. Su Luna orbita exactamente a 60,3 veces el radio terrestre en acoplamiento síncrono.',
        scienceFact: 'La luz solar tarda 8 min 19 s en recorrer los 149,6 millones de km hasta aquí.',
        target: { kind: 'body', bodyId: 'earth' },
      },
      {
        id: 'mars_world',
        title: 'Marte · El planeta rojo sin adornos',
        nasaBadge: 'NASA MGS / MRO · 1,52 UA',
        narration:
          'Con un día de 24 h 37 min y casquetes polares estacionales de CO₂ y agua helada, Marte recibe menos de la mitad de la radiación solar terrestre.',
        scienceFact: 'Atmósfera delgada de 6 mbar (95,3 % CO₂) · Gravedad: 3,72 m/s².',
        target: { kind: 'body', bodyId: 'mars' },
      },
      {
        id: 'jupiter_king',
        title: 'Júpiter · Escudo gravitacional y lunas',
        nasaBadge: 'NASA Juno · 5,20 UA',
        narration:
          'Su rápida rotación de 9 h 55 min esculpe bandas nubosas, auroras polares intensas y las cuatro lunas galileanas descubiertas en 1610.',
        scienceFact: 'Su velocidad de escape alcanza 59,5 km/s, más de cinco veces la de la Tierra.',
        target: { kind: 'body', bodyId: 'jupiter' },
      },
      {
        id: 'saturn_rings',
        title: 'Saturno · Arquitectura de anillos',
        nasaBadge: 'NASA Cassini · 9,54 UA',
        narration:
          'A casi 10 veces la distancia Sol-Tierra, la luz tarda 79 minutos en llegar. Sus anillos de hielo muestran la división de Cassini y las brechas de Encke y Keeler.',
        scienceFact: 'Densidad media de 0,687 g/cm³, menor que la del agua líquida.',
        target: { kind: 'body', bodyId: 'saturn' },
      },
      {
        id: 'neptune_outer',
        title: 'Neptuno · Frontera azul de los gigantes',
        nasaBadge: 'Voyager 2 · 30,07 UA',
        narration:
          'A 4.500 millones de km del Sol (4 h 10 min-luz), los vientos supersónicos de Neptuno superan los 2.000 km/h y su mayor luna, Tritón, orbita al revés.',
        scienceFact: 'Completa una sola órbita alrededor del Sol cada 164,8 años terrestres.',
        target: { kind: 'body', bodyId: 'neptune' },
      },
    ],
  },
  {
    id: 'ocean_worlds',
    name: 'Mundos de Agua y Biohabitabilidad',
    subtitle: 'Océanos subterráneos y hielos exóticos · NASA',
    accentColor: '#38BDF8',
    steps: [
      {
        id: 'ow_europa',
        title: 'Europa · Océano global bajo el hielo',
        nasaBadge: 'NASA Europa Clipper · Júpiter',
        narration:
          'Bajo una corteza fracturada de hielo de agua de 15–25 km de espesor se oculta un océano líquido salado calentado por mareas de Júpiter.',
        scienceFact: 'Contiene aproximadamente el doble de agua líquida que todos los océanos terrestres.',
        target: { kind: 'moon', bodyId: 'jupiter', moonId: 'europa' },
      },
      {
        id: 'ow_enceladus',
        title: 'Encélado · Géiseres activos del polo sur',
        nasaBadge: 'NASA Cassini · Saturno',
        narration:
          'Las "rayas de tigre" del polo sur expulsan penachos de vapor de agua, sales e hidrógeno molecular directamente desde un océano hidrotermal interno.',
        scienceFact: 'Posee los tres ingredientes químicos clave para la vida: agua, energía y orgánicos.',
        target: { kind: 'moon', bodyId: 'saturn', moonId: 'enceladus' },
      },
      {
        id: 'ow_titan',
        title: 'Titán · Ríos de metano líquido',
        nasaBadge: 'ESA/NASA Huygens · Saturno',
        narration:
          'Única luna del Sistema Solar con una atmósfera densa rica en nitrógeno y un ciclo meteorológico completo con lluvias, ríos y mares de metano y etano.',
        scienceFact: 'Presión superficial de 1,45 atm a −179 °C · Diámetro mayor que Mercurio.',
        target: { kind: 'moon', bodyId: 'saturn', moonId: 'titan' },
      },
      {
        id: 'ow_ceres',
        title: 'Ceres · Salmueras del Cinturón de Asteroides',
        nasaBadge: 'NASA Dawn · 2,77 UA',
        narration:
          'El planeta enano más interno conserva depósitos blancos de carbonato sódico en el cráter Occator, huella de criovulcanismo y salmueras recientes.',
        scienceFact: 'Concentra casi un tercio de la masa total del Cinturón Principal de Asteroides.',
        target: { kind: 'body', bodyId: 'ceres' },
      },
      {
        id: 'ow_pluto',
        title: 'Plutón · Glaciares de nitrógeno',
        nasaBadge: 'NASA New Horizons · 39,48 UA',
        narration:
          'Sputnik Planitia, su gigantesco corazón glaciar de 1.000 km, renueva continuamente su superficie helada por convección térmica interna.',
        scienceFact: 'Posee montañas de hielo de agua tan duras como la roca a −229 °C.',
        target: { kind: 'body', bodyId: 'pluto' },
      },
    ],
  },
  {
    id: 'historic_missions',
    name: 'Misiones Históricas de la NASA',
    subtitle: 'De Tranquility Base al espacio interestelar',
    accentColor: '#34D399',
    steps: [
      {
        id: 'hm_apollo11',
        title: 'Apollo 11 Eagle · Primeros pasos (1969)',
        nasaBadge: 'NASA Apollo · Mare Tranquillitatis',
        narration:
          'El 20 de julio de 1969 el módulo Eagle descendió en la Luna. Su etapa de descenso, la bandera y el sismómetro siguen intactos en el Mar de la Tranquilidad.',
        scienceFact: 'Trajo 21,5 kg de basaltos lunares que dataron el origen del sistema Tierra-Luna.',
        target: { kind: 'mission', missionId: 'apollo11' },
      },
      {
        id: 'hm_iss',
        title: 'Estación Espacial Internacional (ISS)',
        nasaBadge: 'NASA/ESA/JAXA · 408 km altitud',
        narration:
          'Con 109 metros de envergadura, su estructura de cercha integrada sostiene ocho enormes alas solares de Kapton cobrizo y seis radiadores térmicos.',
        scienceFact: 'Orbita la Tierra a 7,66 km/s completando una vuelta cada 92 minutos.',
        target: { kind: 'mission', missionId: 'iss' },
      },
      {
        id: 'hm_perseverance',
        title: 'Perseverance e Ingenuity · Cráter Jezero',
        nasaBadge: 'NASA Mars 2020 · 18,38° N 77,58° E',
        narration:
          'Recorre un antiguo delta fluvial marciano sellando testigos geológicos y realizó 72 vuelos históricos junto al helicóptero Ingenuity.',
        scienceFact: 'Su instrumento MOXIE produjo por primera vez oxígeno respirable en otro planeta.',
        target: { kind: 'mission', missionId: 'perseverance' },
      },
      {
        id: 'hm_jwst',
        title: 'Telescopio James Webb (JWST)',
        nasaBadge: 'NASA/ESA/CSA · Punto L2 a 1,5 M km',
        narration:
          'Su espejo hexagonal dorado de 6,5 metros y su parasol de 5 capas captan la luz infrarroja de las primeras galaxias y nebulosas de la Vía Láctea.',
        scienceFact: 'Opera protegido del calor solar a temperaturas criogénicas de −233 °C.',
        target: { kind: 'mission', missionId: 'jwst' },
      },
      {
        id: 'hm_voyager1',
        title: 'Voyager 1 · Emisario interestelar',
        nasaBadge: 'NASA JPL · >166 UA',
        narration:
          'Lanzada en 1977, cruzó la heliopausa en 2012 y sigue transmitiendo mediciones de plasma interestelar mientras porta el Disco de Oro.',
        scienceFact: 'Sus señales de radio tardan casi 23 horas en llegar a la Tierra a la velocidad de la luz.',
        target: { kind: 'mission', missionId: 'voyager1' },
      },
    ],
  },
  {
    id: 'milky_way_wonders',
    name: 'Vía Láctea: Fenómenos Extremos',
    subtitle: 'Agujeros negros, púlsares y nebulosas oficiales NASA',
    accentColor: '#A78BFA',
    steps: [
      {
        id: 'mw_map',
        title: 'Arquitectura de la Vía Láctea',
        nasaBadge: 'Gaia DR3 · 105.700 años luz',
        narration:
          'Observa nuestra galaxia completa en 3D con la posición real del Sol en el espolón de Orión y todos los agujeros negros, púlsares y nebulosas oficiales.',
        scienceFact: 'Alberga entre 100.000 y 400.000 millones de estrellas en cuatro brazos espirales.',
        target: { kind: 'deepspace', id: 'milkyway' },
      },
      {
        id: 'mw_sgra',
        title: 'Sagitario A* · Núcleo galáctico',
        nasaBadge: 'EHT / Chandra · 4,3 M masas solares',
        narration:
          'El coloso gravitacional central que gobierna el núcleo de nuestra galaxia. La curvatura extrema de la luz forma el característico anillo de fotones.',
        scienceFact: 'Diámetro del horizonte de sucesos: 24 millones de kilómetros.',
        target: { kind: 'deepspace', id: 'sagittarius_a' },
      },
      {
        id: 'mw_cygx1',
        title: 'Cygnus X-1 · Binario devorador de estrellas',
        nasaBadge: 'NASA Chandra · 21,2 masas solares',
        narration:
          'A 7.200 años luz, este agujero negro estelar arranca un torrente continuo de gas de la supergigante azul HDE 226868 cada 5,6 días.',
        scienceFact: 'Fue el primer agujero negro confirmado observacionalmente en la historia.',
        target: { kind: 'deepspace', id: 'cygnus_x1' },
      },
      {
        id: 'mw_crab',
        title: 'Púlsar del Cangrejo · Faro de 30 Hz',
        nasaBadge: 'NASA Chandra · 6.500 años luz',
        narration:
          'Una esfera ultradensa de neutrones de apenas 20 km que rota 30,2 veces por segundo rodeada por un toro brillante de partículas en rayos X.',
        scienceFact: 'Nació de la brillante supernova observada y registrada en el año 1054 d. C.',
        target: { kind: 'deepspace', id: 'crab_pulsar' },
      },
      {
        id: 'mw_pillars',
        title: 'Pilares de la Creación (M16)',
        nasaBadge: 'NASA Webb & Hubble · 5.700 años luz',
        narration:
          'Gigantescas columnas de gas frío y polvo de 5 años luz esculpidas por vientos estelares ultravioleta donde nacen estrellas jóvenes en el infrarrojo.',
        scienceFact: 'Las puntas brillantes contienen nudos protoestelares del tamaño de sistemas solares.',
        target: { kind: 'deepspace', id: 'nebula_eagle' },
      },
      {
        id: 'mw_orion',
        title: 'Nebulosa de Orión (M42)',
        nasaBadge: 'NASA JWST & Hubble · 1.344 años luz',
        narration:
          'Nuestro laboratorio más cercano de formación estelar y discos protoplanetarios alrededor del joven cúmulo estelar del Trapecio.',
        scienceFact: 'Visible a simple vista como la estrella central borrosa de la espada de Orión.',
        target: { kind: 'deepspace', id: 'nebula_orion' },
      },
    ],
  },
];
