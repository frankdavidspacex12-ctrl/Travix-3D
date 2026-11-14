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
    id: 'hardware_chronology',
    name: 'Legado de Hardware NASA · Cronología',
    subtitle: '17 naves en su ubicación real · ordenadas por fecha de lanzamiento',
    accentColor: '#FB7185',
    steps: [
      {
        id: 'hw_surveyor1',
        title: '1966 · Surveyor 1 · Primer aterrizaje suave',
        nasaBadge: 'Lanzado 30 may 1966 · Luna 2,47° S 43,34° O',
        narration:
          'Los Surveyor demostraron que el suelo lunar soportaba una nave. Surveyor 1 se posó el 2 de junio de 1966 al norte del cráter Flamsteed y envió más de 11.000 imágenes.',
        scienceFact:
          'Cinco Surveyor (1, 3, 5, 6 y 7) aterrizaron con éxito; Apollo 12 visitó a pie a Surveyor 3 en 1969.',
        target: { kind: 'mission', missionId: 'surveyor1' },
      },
      {
        id: 'hw_apollo11_lm',
        title: '1969 · Módulos Lunares Apollo · Eagle',
        nasaBadge: 'Lanzado 16 jul 1969 · Mar de la Tranquilidad',
        narration:
          'Cuando los astronautas despegaban, la etapa de descenso del Módulo Lunar quedaba como plataforma de lanzamiento. La del Eagle sigue en la Base Tranquilidad junto a la placa conmemorativa.',
        scienceFact:
          'Seis etapas de descenso permanecen en la Luna: Eagle, Intrepid, Antares, Falcon, Orion y Challenger.',
        target: { kind: 'mission', missionId: 'apollo11' },
      },
      {
        id: 'hw_alsep',
        title: '1969 · ALSEP · Estaciones científicas Apollo',
        nasaBadge: 'Lanzado 14 nov 1969 · Apollo 12, Oceanus Procellarum',
        narration:
          'Alan Bean desplegó la primera estación ALSEP completa: sismómetro, magnetómetro y espectrómetro de viento solar alimentados por un generador nuclear RTG. Siguió midiendo tras la partida de los astronautas.',
        scienceFact:
          'La red ALSEP funcionó hasta el 30 de septiembre de 1977; los retrorreflectores láser aún se usan hoy.',
        target: { kind: 'mission', missionId: 'alsep_apollo12' },
      },
      {
        id: 'hw_lrv',
        title: '1971 · Vehículos Lunares Itinerantes (LRV)',
        nasaBadge: 'Lanzado 26 jul 1971 · Apollo 15, Hadley-Apennine',
        narration:
          'El primero de tres "moon buggies" eléctricos llegó con Apollo 15. Los astronautas lo condujeron 27,8 km y lo aparcaron para siempre junto al módulo Falcon.',
        scienceFact:
          'Los LRV-2 (Apollo 16, Descartes) y LRV-3 (Apollo 17, Taurus-Littrow) también siguen aparcados en la Luna.',
        target: { kind: 'mission', missionId: 'apollo15' },
      },
      {
        id: 'hw_pioneer10',
        title: '1972 · Pioneer 10 · Primera en Júpiter',
        nasaBadge: 'Lanzado 3 mar 1972 · ≈140 UA hacia Aldebarán',
        narration:
          'Primera nave en cruzar el Cinturón de Asteroides y en visitar Júpiter. Hoy flota en silencio más allá de la heliosfera llevando la placa Pioneer.',
        scienceFact: 'Su última señal llegó el 23 de enero de 2003, desde unos 80 UA.',
        target: { kind: 'mission', missionId: 'pioneer10' },
      },
      {
        id: 'hw_pioneer11',
        title: '1973 · Pioneer 11 · Primera en Saturno',
        nasaBadge: 'Lanzado 6 abr 1973 · ≈119 UA hacia el Águila',
        narration:
          'Sobrevoló Júpiter y en 1979 fue la primera en llegar a Saturno, descubriendo el anillo F. Abrió el camino que luego siguieron las Voyager.',
        scienceFact: 'La NASA perdió contacto con ella el 30 de septiembre de 1995.',
        target: { kind: 'mission', missionId: 'pioneer11' },
      },
      {
        id: 'hw_viking1',
        title: '1975 · Viking 1 · Primer éxito en Marte',
        nasaBadge: 'Lanzado 20 ago 1975 · Chryse Planitia 22,27° N',
        narration:
          'El 20 de julio de 1976 Viking 1 se convirtió en el primer módulo estadounidense en operar en Marte. Tomó la primera foto desde la superficie y sigue exactamente donde aterrizó.',
        scienceFact: 'Funcionó con energía nuclear durante más de 6 años, hasta noviembre de 1982.',
        target: { kind: 'mission', missionId: 'viking1' },
      },
      {
        id: 'hw_viking2',
        title: '1975 · Viking 2 · Escarcha en Utopia Planitia',
        nasaBadge: 'Lanzado 9 sep 1975 · Utopia Planitia 47,64° N',
        narration:
          'Su gemelo aterrizó en las llanuras del norte el 3 de septiembre de 1976 y fotografió escarcha de agua sobre el suelo marciano.',
        scienceFact: 'Operó casi 4 años, hasta que sus baterías fallaron en abril de 1980.',
        target: { kind: 'mission', missionId: 'viking2' },
      },
      {
        id: 'hw_near',
        title: '1996 · NEAR Shoemaker · Sobre el asteroide Eros',
        nasaBadge: 'Lanzado 17 feb 1996 · 433 Eros, 35,8° S',
        narration:
          'Primera nave en orbitar un asteroide y en posarse en uno. Tras un año cartografiando Eros, descendió el 12 de febrero de 2001 y descansa al sur de la depresión Himeros.',
        scienceFact: 'No estaba diseñada para aterrizar, pero transmitió desde la superficie 16 días más.',
        target: { kind: 'mission', missionId: 'near_shoemaker' },
      },
      {
        id: 'hw_sojourner',
        title: '1996 · Sojourner · Primer rover en Marte',
        nasaBadge: 'Lanzado 4 dic 1996 · Ares Vallis',
        narration:
          'Entregado por el módulo Pathfinder en julio de 1997, este rover de 10 kg recorrió unos 100 m analizando rocas. Hoy está aparcado para siempre junto a su módulo.',
        scienceFact: 'Su última comunicación fue el 27 de septiembre de 1997.',
        target: { kind: 'mission', missionId: 'sojourner' },
      },
      {
        id: 'hw_spirit',
        title: '2003 · Spirit · Gemelo del cráter Gusev',
        nasaBadge: 'Lanzado 10 jun 2003 · Cráter Gusev',
        narration:
          'Diseñado para 90 soles, operó más de 6 años. Atrapado en arena blanda en "Troy", hoy es un monumento inactivo a la exploración marciana.',
        scienceFact: 'Encontró sílice casi pura, señal de antiguos sistemas hidrotermales.',
        target: { kind: 'mission', missionId: 'spirit' },
      },
      {
        id: 'hw_opportunity',
        title: '2003 · Opportunity · El maratonista',
        nasaBadge: 'Lanzado 7 jul 2003 · Meridiani Planum',
        narration:
          'El gemelo de Spirit recorrió 45 km en casi 15 años. Una tormenta de polvo global lo dejó sin energía en junio de 2018 en el valle Perseverance.',
        scienceFact: 'Halló esférulas de hematita ("arándanos"), prueba de agua líquida antigua.',
        target: { kind: 'mission', missionId: 'opportunity' },
      },
      {
        id: 'hw_phoenix',
        title: '2007 · Phoenix · Hielo de agua en el Ártico',
        nasaBadge: 'Lanzado 4 ago 2007 · Vastitas Borealis 68° N',
        narration:
          'Excavó el suelo ártico de Marte y vio sublimarse trozos de hielo de agua. El invierno polar lo cubrió de hielo de CO₂ y perdió la electricidad.',
        scienceFact: 'Su última señal fue el 2 de noviembre de 2008.',
        target: { kind: 'mission', missionId: 'phoenix' },
      },
      {
        id: 'hw_dawn',
        title: '2007 · Dawn · Órbita perpetua en Ceres',
        nasaBadge: 'Lanzado 27 sep 2007 · Vesta → Ceres',
        narration:
          'Con motores iónicos cartografió Vesta y luego Ceres. Sin combustible desde 2018, permanece en una órbita estable y sin energía alrededor del planeta enano.',
        scienceFact: 'Es la única nave que ha orbitado dos cuerpos del Cinturón de Asteroides.',
        target: { kind: 'mission', missionId: 'dawn' },
      },
      {
        id: 'hw_kepler',
        title: '2009 · Kepler · Cazador de exoplanetas',
        nasaBadge: 'Lanzado 7 mar 2009 · Órbita solar tras la Tierra',
        narration:
          'Vigiló más de 150.000 estrellas y confirmó más de 2.600 planetas. Sin combustible desde 2018, deriva en una órbita alrededor del Sol que sigue a la Tierra.',
        scienceFact: 'Su órbita dura 372,5 días, por eso se queda cada año un poco más atrás de la Tierra.',
        target: { kind: 'mission', missionId: 'kepler' },
      },
      {
        id: 'hw_insight',
        title: '2018 · InSight · Escuchando terremotos marcianos',
        nasaBadge: 'Lanzado 5 may 2018 · Elysium Planitia',
        narration:
          'Su sismómetro registró más de 1.300 martemotos y reveló el núcleo líquido de Marte. El polvo cubrió sus paneles hasta dejarlo sin electricidad.',
        scienceFact: 'Su último contacto fue el 15 de diciembre de 2022.',
        target: { kind: 'mission', missionId: 'insight' },
      },
      {
        id: 'hw_ingenuity',
        title: '2020 · Ingenuity · Primer vuelo en otro planeta',
        nasaBadge: 'Lanzado 30 jul 2020 · Valinor Hills, Jezero',
        narration:
          'Viajó con Perseverance y voló 72 veces. En su último aterrizaje dañó una pala del rotor y quedó como un artefacto estacionario en Valinor Hills.',
        scienceFact: 'Voló en una atmósfera con solo el 1 % de la densidad de la terrestre.',
        target: { kind: 'mission', missionId: 'ingenuity' },
      },
    ],
  },
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
