// «Colombians at NASA»: Colombian women and men whose work is part of NASA missions. Every fact
// comes from the linked source (NASA pages when they exist). Roles can change; the year of the
// source is noted so the text does not claim more than it says.
import type { GuidedTourTarget } from './guidedToursData';

export interface ColombianText {
  role: string;
  story: string;
  /** Why it connects with the hardware in the app */
  link: string;
}

export interface ColombianAtNasa {
  id: string;
  name: string;
  /** City where they were born or grew up, as the source says */
  origin: string;
  gender: 'woman' | 'man';
  go: GuidedTourTarget;
  goLabel: { es: string; en: string };
  source: { label: string; url: string };
  es: ColombianText;
  en: ColombianText;
}

export const COLOMBIANS_AT_NASA: ColombianAtNasa[] = [
  {
    id: 'diana_trujillo',
    name: 'Diana Trujillo',
    origin: 'Cali',
    gender: 'woman',
    go: { kind: 'mission', missionId: 'perseverance' },
    goLabel: { es: 'Ir a Perseverance', en: 'Go to Perseverance' },
    source: { label: 'NASA · Diana Trujillo: From Colombia to Mars', url: 'https://www.nasa.gov/image-article/diana-trujillo-from-colombia-mars/' },
    es: {
      role: 'Ingeniera aeroespacial · Laboratorio de Propulsión a Chorro (JPL)',
      story:
        'Llegó a Estados Unidos a los 17 años con el sueño de trabajar en la NASA. Empezó en el equipo del brazo robótico de Curiosity y luego fue jefa táctica de misión de Perseverance. El 18 de febrero de 2021 presentó la primera transmisión de la NASA en español del aterrizaje en otro planeta.',
      link: 'Con el brazo robótico, Perseverance busca señales de vida antigua en Marte.',
    },
    en: {
      role: 'Aerospace engineer · Jet Propulsion Laboratory (JPL)',
      story:
        'She came to the United States at 17 with the dream of working at NASA. She started on Curiosity’s robotic arm team and later became a tactical mission lead for Perseverance. On February 18, 2021, she hosted NASA’s first Spanish-language broadcast of a landing on another planet.',
      link: 'With its robotic arm, Perseverance looks for signs of ancient life on Mars.',
    },
  },
  {
    id: 'adriana_ocampo',
    name: 'Adriana Ocampo',
    origin: 'Barranquilla',
    gender: 'woman',
    go: { kind: 'mission', missionId: 'newhorizons' },
    goLabel: { es: 'Ir a New Horizons', en: 'Go to New Horizons' },
    source: { label: 'NASA Science · Adriana Ocampo', url: 'https://solarsystem.nasa.gov/people/1780/adriana-ocampo' },
    es: {
      role: 'Geóloga planetaria · Sede de la NASA',
      story:
        'Nació en Barranquilla y creció en Argentina. Fue ejecutiva de programa en la sede de la NASA, donde dirigió el programa New Frontiers, el de misiones como New Horizons a Plutón, Juno a Júpiter y OSIRIS-REx al asteroide Bennu. Sus estudios del cráter Chicxulub ayudaron a entender el impacto que acabó con los dinosaurios.',
      link: 'New Horizons fue la primera nave en visitar Plutón, en 2015.',
    },
    en: {
      role: 'Planetary geologist · NASA Headquarters',
      story:
        'Born in Barranquilla and raised in Argentina, she was a program executive at NASA Headquarters, where she led the New Frontiers program: missions like New Horizons to Pluto, Juno to Jupiter and OSIRIS-REx to asteroid Bennu. Her studies of the Chicxulub crater helped explain the impact that ended the dinosaurs.',
      link: 'New Horizons was the first spacecraft to visit Pluto, in 2015.',
    },
  },
  {
    id: 'liliana_villarreal',
    name: 'Liliana «Lili» Villarreal',
    origin: 'Cartagena',
    gender: 'woman',
    go: { kind: 'body', bodyId: 'earth' },
    goLabel: { es: 'Ir a la Tierra', en: 'Go to Earth' },
    source: { label: 'NASA · Liliana Villarreal', url: 'https://www.nasa.gov/people/kennedy-biographies-villarreal/' },
    es: {
      role: 'Directora de Aterrizaje y Recuperación de Artemis · Centro Espacial Kennedy',
      story:
        'Nació en Cartagena y entró a la NASA en 2007. En Artemis I fue subdirectora del equipo que armó y probó el cohete SLS y la nave Orion. Como directora de aterrizaje y recuperación, lidera al equipo que recoge a los astronautas y la cápsula Orion cuando caen al océano Pacífico.',
      link: 'Las misiones Artemis vuelven a la Luna y regresan a la Tierra amerizando en el océano.',
    },
    en: {
      role: 'Artemis Landing and Recovery Director · Kennedy Space Center',
      story:
        'Born in Cartagena, she joined NASA in 2007. For Artemis I she was deputy of the team that assembled and tested the SLS rocket and the Orion spacecraft. As landing and recovery director, she leads the team that picks up the astronauts and the Orion capsule when they splash down in the Pacific Ocean.',
      link: 'Artemis missions go back to the Moon and come home with a splashdown in the ocean.',
    },
  },
  {
    id: 'clara_wright',
    name: 'Clara Wright',
    origin: 'Colombia',
    gender: 'woman',
    go: { kind: 'mission', missionId: 'iss' },
    goLabel: { es: 'Ir a la ISS', en: 'Go to the ISS' },
    source: { label: 'NASA · Clara Wright', url: 'https://www.nasa.gov/people/clara-wright/' },
    es: {
      role: 'Ingeniera de materiales · Laboratorio de Análisis de Fallas, Centro Espacial Kennedy',
      story:
        'Llegó de Colombia a Estados Unidos a los 8 años sin hablar inglés. Hoy investiga por qué se rompen las piezas de los cohetes y naves: lo llama «el CSI de la ingeniería». Es de las pocas personas del mundo que trabajan con equipos que han estado en el espacio.',
      link: 'Entender por qué falla una pieza es justo lo que explica por qué cada nave de este mapa se quedó donde está.',
    },
    en: {
      role: 'Materials engineer · Failure Analysis Laboratory, Kennedy Space Center',
      story:
        'She came from Colombia to the United States at 8 without speaking English. Today she finds out why parts of rockets and spacecraft break: she calls it “the CSI of engineering”. She is one of the few people in the world who work on hardware that has been to space.',
      link: 'Understanding why a part fails is exactly what explains why each spacecraft on this map was left where it is.',
    },
  },
  {
    id: 'pablo_gomez',
    name: 'Pablo Gómez',
    origin: 'Cali',
    gender: 'man',
    go: { kind: 'mission', missionId: 'viking1' },
    goLabel: { es: 'Ir a Viking 1', en: 'Go to Viking 1' },
    source: { label: 'NASA · I Am NASA Stennis: Pablo Gomez', url: 'https://www.nasa.gov/people/i-am-nasa-stennis-pablo-gomez/' },
    es: {
      role: 'Jefe de operaciones de pruebas eléctricas · Centro Espacial Stennis',
      story:
        'De niño, en Cali, descubrió el espacio en una revista con fotos de las Voyager, las Pioneer y Viking 1, el primer módulo que funcionó en Marte. A los 17 se fue a estudiar ingeniería eléctrica. En Stennis preparó el banco de pruebas donde se encendieron juntos los cuatro motores del cohete SLS de Artemis I, y recibió la Medalla de Plata de la NASA.',
      link: 'Viking 1 sigue en Marte, donde aterrizó en 1976: la nave que lo inspiró de niño.',
    },
    en: {
      role: 'Chief of Electrical Test Operations · Stennis Space Center',
      story:
        'As a boy in Cali he discovered space in a magazine with pictures of Voyager, Pioneer and Viking 1, the first lander to work on Mars. At 17 he left to study electrical engineering. At Stennis he prepared the test stand where the four engines of the Artemis I SLS rocket fired together, and he received NASA’s Silver Achievement Award.',
      link: 'Viking 1 is still on Mars, where it landed in 1976: the spacecraft that inspired him as a boy.',
    },
  },
  {
    id: 'cesar_ocampo',
    name: 'César Ocampo (1967–2024)',
    origin: 'Armenia, Quindío',
    gender: 'man',
    go: { kind: 'moon', bodyId: 'earth', moonId: 'luna' },
    goLabel: { es: 'Ir a la Luna', en: 'Go to the Moon' },
    source: { label: 'NASA NTRS · History of Copernicus', url: 'https://ntrs.nasa.gov/citations/20250007148' },
    es: {
      role: 'Ingeniero aeroespacial · creador del software Copernicus',
      story:
        'Nació en Armenia (Quindío) y se doctoró en astrodinámica. Creó Copernicus, un programa para diseñar las rutas de las naves en el espacio que luego se desarrolló en el Centro Espacial Johnson de la NASA y se usa desde hace 20 años para planear misiones. En 2017 dirigió Colciencias en Colombia.',
      link: 'Calcular cómo llegar a la Luna o a Marte gastando el menor combustible es el trabajo de Copernicus.',
    },
    en: {
      role: 'Aerospace engineer · creator of the Copernicus software',
      story:
        'Born in Armenia (Quindío), he earned a PhD in astrodynamics. He created Copernicus, a program to design spacecraft paths that was later developed at NASA’s Johnson Space Center and has been used for 20 years to plan missions. In 2017 he led Colciencias, Colombia’s science agency.',
      link: 'Working out how to reach the Moon or Mars with the least fuel is what Copernicus does.',
    },
  },
  {
    id: 'salim_nasser',
    name: 'Salim Nasser Posada',
    origin: 'Cali',
    gender: 'man',
    go: { kind: 'moon', bodyId: 'earth', moonId: 'luna' },
    goLabel: { es: 'Ir a la Luna', en: 'Go to the Moon' },
    source: {
      label: 'El País (Cali), abril 2026',
      url: 'https://www.elpais.com.co/colombia/salim-nasser-posada-la-historia-del-ingeniero-colombiano-que-trabaja-en-la-nasa-y-participa-en-la-mision-artemis-ii-0313.html',
    },
    es: {
      role: 'Jefe de Estructuras y Dinámica · NASA',
      story:
        'Creció en Cali y estudió ingeniería mecánica en la Universidad de los Andes. Lleva 20 años en la NASA calculando que cohetes, naves y torres resistan las fuerzas del lanzamiento. Para Artemis II analizó el brazo por donde entran los astronautas a la nave y el brazo que la abastece de combustible.',
      link: 'Artemis II llevó en 2026 a cuatro astronautas alrededor de la Luna.',
    },
    en: {
      role: 'Chief of Structures and Dynamics · NASA',
      story:
        'He grew up in Cali and studied mechanical engineering at the Universidad de los Andes. For 20 years at NASA he has checked that rockets, spacecraft and towers withstand the forces of launch. For Artemis II he analyzed the arm the astronauts use to board the spacecraft and the arm that fuels it.',
      link: 'In 2026 Artemis II flew four astronauts around the Moon.',
    },
  },
];
