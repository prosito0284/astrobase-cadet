// ─────────────────────────────────────────────────────────────────────────────
// MODO CADETE — Datos reales de la NASA (curados y guardados en el juego)
//
// Todo lo que aparece aquí es un hecho publicado. Cuando el juego usa un dato
// guardado lo dice ("dato guardado"); solo la llamarada que se descarga de
// DONKI al iniciar la partida se marca como "en vivo".
// ─────────────────────────────────────────────────────────────────────────────

export type Site = 'moon' | 'mars';
export type Lang = 'es' | 'en';
export interface T { es: string; en: string }

export interface Effects {
  air?: number;
  energy?: number;
  shield?: number;
  health?: number;
  stars?: number;
}

export interface Source {
  name: string;
  url: string;
}

// ── Tormentas solares reales (llamaradas clase X registradas por NASA DONKI) ──
export interface SolarStorm {
  id: string;
  classType: string;   // Clase de rayos X de la llamarada, p. ej. "X9.0"
  date: string;        // Fecha (UTC) del pico de la llamarada
  live?: boolean;      // true solo si se descargó en vivo durante esta partida
  liveSource?: 'donki' | 'swpc'; // de dónde vino el dato en vivo (DONKI por defecto)
  story: T;            // Qué pasó de verdad
}

export const REAL_STORMS: SolarStorm[] = [
  {
    id: 'flr-2024-10-03',
    classType: 'X9.0',
    date: '2024-10-03',
    story: {
      es: 'El 3 de octubre de 2024 el Sol lanzó una llamarada X9.0, la más fuerte de su ciclo actual hasta ese momento.',
      en: 'On October 3, 2024 the Sun fired an X9.0 flare, the strongest of its current cycle up to that point.',
    },
  },
  {
    id: 'flr-2024-05-14',
    classType: 'X8.7',
    date: '2024-05-14',
    story: {
      es: 'El 14 de mayo de 2024 hubo una llamarada X8.7. Esa misma semana se vieron auroras en lugares donde casi nunca aparecen, como México.',
      en: 'On May 14, 2024 there was an X8.7 flare. That same week, auroras were seen in places that almost never get them, like Mexico.',
    },
  },
  {
    id: 'flr-2024-05-11',
    classType: 'X5.8',
    date: '2024-05-11',
    story: {
      es: 'El 11 de mayo de 2024 una llamarada X5.8 llegó junto a la tormenta geomagnética más fuerte en la Tierra desde 2003.',
      en: 'On May 11, 2024 an X5.8 flare arrived along with the strongest geomagnetic storm on Earth since 2003.',
    },
  },
  {
    id: 'flr-2017-09-06',
    classType: 'X9.3',
    date: '2017-09-06',
    story: {
      es: 'El 6 de septiembre de 2017 el Sol produjo una llamarada X9.3, la más fuerte de todo su ciclo anterior.',
      en: 'On September 6, 2017 the Sun produced an X9.3 flare, the strongest of its whole previous cycle.',
    },
  },
  {
    id: 'flr-2017-09-10',
    classType: 'X8.2',
    date: '2017-09-10',
    story: {
      es: 'El 10 de septiembre de 2017 una llamarada X8.2 lanzó partículas que llegaron hasta Marte: el rover Curiosity midió el doble de radiación en el suelo marciano.',
      en: 'On September 10, 2017 an X8.2 flare sent particles all the way to Mars: the Curiosity rover measured double the radiation on the Martian ground.',
    },
  },
  {
    id: 'flr-2024-10-09',
    classType: 'X1.8',
    date: '2024-10-09',
    story: {
      es: 'El 9 de octubre de 2024 una llamarada X1.8 vino con una nube de partículas que causó una fuerte tormenta geomagnética al día siguiente.',
      en: 'On October 9, 2024 an X1.8 flare came with a particle cloud that caused a strong geomagnetic storm the next day.',
    },
  },
];

export const DONKI_SOURCE: Source = {
  name: 'NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)',
  url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
};

// ── Radiación de fondo real en cada sitio ──
export const SITE_INFO: Record<Site, {
  name: T;
  place: T;
  dailyDoseMSv: number;     // Dosis diaria en la superficie sin escudo
  doseFact: T;
  doseSource: Source;
  commDelay: T;
  solarGain: number;        // Energía que dan los paneles cada día (juego)
}> = {
  moon: {
    name: { es: 'Luna', en: 'Moon' },
    place: { es: 'Polo Sur, cerca del cráter Shackleton', en: 'South Pole, near Shackleton crater' },
    dailyDoseMSv: 1.37,
    doseFact: {
      es: 'En la superficie de la Luna se reciben unos 1.37 mSv de radiación al día (medido en 2019 por la sonda Chang\'e 4). Una radiografía de pecho son unos 0.1 mSv.',
      en: 'The Moon\'s surface gets about 1.37 mSv of radiation per day (measured in 2019 by the Chang\'e 4 lander). A chest X-ray is about 0.1 mSv.',
    },
    doseSource: { name: 'Zhang et al., Science Advances (2020)', url: 'https://doi.org/10.1126/sciadv.aaz1334' },
    commDelay: { es: '1.3 segundos', en: '1.3 seconds' },
    solarGain: 20,
  },
  mars: {
    name: { es: 'Marte', en: 'Mars' },
    place: { es: 'Cráter Jezero', en: 'Jezero crater' },
    dailyDoseMSv: 0.64,
    doseFact: {
      es: 'En el suelo de Marte se reciben unos 0.64 mSv de radiación al día (medido por el instrumento RAD del rover Curiosity). Su aire delgado protege un poco más que en la Luna.',
      en: 'The ground on Mars gets about 0.64 mSv of radiation per day (measured by the Curiosity rover\'s RAD instrument). Its thin air protects a bit more than on the Moon.',
    },
    doseSource: { name: 'NASA/JPL — Curiosity RAD (Hassler et al., Science 2014)', url: 'https://doi.org/10.1126/science.1244797' },
    commDelay: { es: 'de 3 a 22 minutos', en: '3 to 22 minutes' },
    solarGain: 16,
  },
};

export const XRAY_MSV = 0.1; // Radiografía de pecho

// ── Tarjetas de decisión ──
export interface CardOption {
  label: T;
  detail: T;
  effects: Effects;
  effectsBySite?: Partial<Record<Site, Effects>>;
  outcome: T;
  outcomeBySite?: Partial<Record<Site, T>>;
}

export interface DecisionCard {
  id: string;
  sites: Site[];
  icon: string;
  title: T;
  text: T;
  textBySite?: Partial<Record<Site, T>>;
  options: [CardOption, CardOption];
  fact: T;
  factBySite?: Partial<Record<Site, T>>;
  source: Source;
}

export const DECISION_CARDS: DecisionCard[] = [
  {
    id: 'water_recycle',
    sites: ['moon', 'mars'],
    icon: '💧',
    title: { es: 'El reciclador de agua', en: 'The water recycler' },
    text: {
      es: 'El agua es muy pesada para traerla desde la Tierra. La máquina de reciclaje limpia el agua usada… pero gasta energía.',
      en: 'Water is too heavy to bring from Earth. The recycling machine cleans used water… but it uses energy.',
    },
    options: [
      {
        label: { es: 'Encender el reciclador', en: 'Turn on the recycler' },
        detail: { es: 'Agua limpia para todos, pero gasta energía', en: 'Clean water for everyone, but it uses energy' },
        effects: { energy: -12, health: 6 },
        outcome: { es: 'El reciclador limpió el agua y el equipo bebió y se aseó bien.', en: 'The recycler cleaned the water and the crew drank and washed well.' },
      },
      {
        label: { es: 'Usar solo el agua guardada', en: 'Use only stored water' },
        detail: { es: 'Ahorras energía, pero hay que racionar el agua', en: 'Save energy, but water must be rationed' },
        effects: { health: -7 },
        outcome: { es: 'Ahorraste energía, pero con poca agua el equipo se sintió cansado.', en: 'You saved energy, but with little water the crew felt tired.' },
      },
    ],
    fact: {
      es: 'En la Estación Espacial se recupera el 98% del agua, ¡incluso la del sudor y la orina! La máquina la limpia hasta dejarla más pura que el agua de la llave.',
      en: 'On the Space Station 98% of the water is recovered, even from sweat and urine! The machine cleans it until it is purer than tap water.',
    },
    source: { name: 'NASA — Water recovery milestone on the ISS', url: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/' },
  },
  {
    id: 'sleep_lights',
    sites: ['moon', 'mars'],
    icon: '😴',
    title: { es: 'El equipo no puede dormir', en: 'The crew can\'t sleep' },
    text: {
      es: 'Afuera el día y la noche no duran lo mismo que en la Tierra, y el equipo está confundido.',
      en: 'Outside, day and night don\'t last as long as on Earth, and the crew is confused.',
    },
    textBySite: {
      moon: { es: 'En la Luna un día dura casi un mes de la Tierra. El equipo está confundido y no puede dormir.', en: 'On the Moon one day lasts almost a month on Earth. The crew is confused and can\'t sleep.' },
      mars: { es: 'En Marte un día (un "sol") dura 24 horas y 40 minutos. Los relojes se desfasan y el equipo duerme mal.', en: 'On Mars a day (a "sol") lasts 24 hours and 40 minutes. Clocks drift and the crew sleeps badly.' },
    },
    options: [
      {
        label: { es: 'Luces especiales para dormir', en: 'Special sleep lights' },
        detail: { es: 'Luces que cambian de color como el cielo; gastan energía', en: 'Lights that change color like the sky; they use energy' },
        effects: { energy: -8, health: 8 },
        outcome: { es: 'Las luces imitaron el atardecer y todos durmieron profundo.', en: 'The lights copied the sunset and everyone slept deeply.' },
      },
      {
        label: { es: 'Aprovechar para trabajar', en: 'Use the time to work' },
        detail: { es: '+1 descubrimiento, pero el equipo queda agotado', en: '+1 discovery, but the crew gets exhausted' },
        effects: { stars: 1, health: -10 },
        outcome: { es: '¡Descubrimiento! Pero sin dormir, el equipo está agotado.', en: 'Discovery! But without sleep, the crew is exhausted.' },
      },
    ],
    fact: {
      es: 'Dormir bien en el espacio es difícil. La NASA estudia cómo la luz de distintos colores ayuda al cuerpo a saber cuándo es de día y cuándo es de noche.',
      en: 'Sleeping well in space is hard. NASA studies how light of different colors helps the body know when it is day and when it is night.',
    },
    source: { name: 'NASA — Human Research Program', url: 'https://www.nasa.gov/hrp/' },
  },
  {
    id: 'micrometeorite',
    sites: ['moon'],
    icon: '☄️',
    title: { es: '¡Una piedrita espacial golpeó la base!', en: 'A tiny space rock hit the base!' },
    text: {
      es: 'La Luna no tiene aire que frene las piedritas del espacio. Una del tamaño de un grano de arena hizo un hoyito y se escapa un poco de aire.',
      en: 'The Moon has no air to slow down space rocks. One the size of a grain of sand made a tiny hole and some air is leaking.',
    },
    options: [
      {
        label: { es: 'Salir a parcharlo', en: 'Go out and patch it' },
        detail: { es: 'Caminata con traje espacial: cansa y da radiación', en: 'Spacewalk in a suit: tiring and you get radiation' },
        effects: { health: -6, shield: 5 },
        outcome: { es: 'Dos astronautas salieron, taparon el hoyo y reforzaron la pared.', en: 'Two astronauts went out, sealed the hole and reinforced the wall.' },
      },
      {
        label: { es: 'Dejarlo para después', en: 'Leave it for later' },
        detail: { es: 'Nadie sale, pero se escapa aire todo el día', en: 'Nobody goes out, but air leaks all day' },
        effects: { air: -12 },
        outcome: { es: 'Nadie salió, pero el hoyito dejó escapar mucho aire.', en: 'Nobody went out, but the tiny hole let a lot of air escape.' },
      },
    ],
    fact: {
      es: 'La Estación Espacial usa "escudos Whipple": una capa delgada separada de la pared que rompe las piedritas antes de que lleguen a la nave.',
      en: 'The Space Station uses "Whipple shields": a thin layer set apart from the wall that breaks up tiny rocks before they reach the ship.',
    },
    source: { name: 'NASA — Orbital Debris Program Office', url: 'https://orbitaldebris.jsc.nasa.gov/' },
  },
  {
    id: 'rover_trip',
    sites: ['mars'],
    icon: '🚙',
    title: { es: 'Viaje en el rover', en: 'Rover trip' },
    text: {
      es: 'Muy cerca hay un antiguo delta de río con rocas que podrían guardar pistas de vida antigua.',
      en: 'Nearby there is an ancient river delta with rocks that could hold clues of ancient life.',
    },
    options: [
      {
        label: { es: 'Ir a buscar rocas', en: 'Go look for rocks' },
        detail: { es: '+1 descubrimiento, pero el rover gasta energía', en: '+1 discovery, but the rover uses energy' },
        effects: { energy: -18, stars: 1 },
        outcome: { es: '¡Encontraron una roca con capas como las de un río! Gran descubrimiento.', en: 'They found a rock with layers like a river\'s! Great discovery.' },
      },
      {
        label: { es: 'Quedarse en la base', en: 'Stay at the base' },
        detail: { es: 'Ahorras energía, pero no hay descubrimiento', en: 'Save energy, but no discovery' },
        effects: {},
        outcome: { es: 'Guardaste energía. Las rocas seguirán ahí otro día.', en: 'You saved energy. The rocks will still be there another day.' },
      },
    ],
    fact: {
      es: 'El rover Perseverance explora el cráter Jezero, donde hace mucho hubo un lago. Guarda muestras de rocas en tubos para que algún día se traigan a la Tierra.',
      en: 'The Perseverance rover explores Jezero crater, where there was once a lake. It stores rock samples in tubes so they can someday be brought to Earth.',
    },
    source: { name: 'NASA — Mars 2020 Perseverance', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
  },
  {
    id: 'perchlorate',
    sites: ['mars'],
    icon: '🧂',
    title: { es: 'Polvo salado en los trajes', en: 'Salty dust on the suits' },
    text: {
      es: 'Los trajes regresaron llenos de polvo rojo. Tiene unas sales que no son buenas si se respiran.',
      en: 'The suits came back covered in red dust. It has salts that are bad to breathe.',
    },
    options: [
      {
        label: { es: 'Limpiar los trajes afuera', en: 'Clean the suits outside' },
        detail: { es: 'Las aspiradoras gastan energía', en: 'The vacuums use energy' },
        effects: { energy: -10 },
        outcome: { es: 'Limpiaron todo antes de entrar: la base quedó sin polvo.', en: 'They cleaned everything before coming in: the base stayed dust-free.' },
      },
      {
        label: { es: 'Entrar así', en: 'Go in like that' },
        detail: { es: 'Ahorras energía, pero el polvo entra a la base', en: 'Save energy, but the dust gets into the base' },
        effects: { health: -10 },
        outcome: { es: 'El polvo se metió en la base y a varios les dio tos.', en: 'The dust got into the base and several people started coughing.' },
      },
    ],
    fact: {
      es: 'En 2008 la sonda Phoenix de la NASA encontró percloratos en el suelo de Marte. Son sales que pueden dañar la salud, pero también podrían servir algún día para hacer oxígeno o combustible.',
      en: 'In 2008 NASA\'s Phoenix lander found perchlorates in the Martian soil. These salts can harm health, but someday they might also help make oxygen or fuel.',
    },
    source: { name: 'NASA — Phoenix', url: 'https://science.nasa.gov/mission/phoenix/' },
  },
  {
    id: 'insight_dust',
    sites: ['mars'],
    icon: '🔆',
    title: { es: 'Paneles cubiertos de polvo', en: 'Dusty solar panels' },
    text: {
      es: 'El viento dejó una capa de polvo sobre los paneles solares y cada día dan menos energía.',
      en: 'The wind left a layer of dust on the solar panels and they give less energy every day.',
    },
    options: [
      {
        label: { es: 'Limpiarlos con escobas', en: 'Sweep them clean' },
        detail: { es: 'Recuperas energía, pero es trabajo cansado afuera', en: 'Get energy back, but it\'s tiring work outside' },
        effects: { energy: 12, health: -6 },
        outcome: { es: 'Los paneles quedaron brillantes y volvieron a dar energía.', en: 'The panels were shiny again and gave energy again.' },
      },
      {
        label: { es: 'Dejarlos así', en: 'Leave them' },
        detail: { es: 'Nadie se cansa, pero hoy hay menos energía', en: 'Nobody gets tired, but there is less energy today' },
        effects: { energy: -10 },
        outcome: { es: 'Nadie salió, pero el polvo tapó parte de la luz del Sol.', en: 'Nobody went out, but the dust blocked part of the sunlight.' },
      },
    ],
    fact: {
      es: 'El módulo InSight de la NASA midió terremotos en Marte durante 4 años. Su misión terminó en 2022, cuando el polvo cubrió tanto sus paneles que ya no tuvo energía.',
      en: 'NASA\'s InSight lander measured marsquakes for 4 years. Its mission ended in 2022, when dust covered its panels so much that it ran out of power.',
    },
    source: { name: 'NASA — InSight', url: 'https://science.nasa.gov/mission/insight/' },
  },
  {
    id: 'greenhouse_light',
    sites: ['moon', 'mars'],
    icon: '🥬',
    title: { es: 'Las plantas piden luz', en: 'The plants need light' },
    text: {
      es: 'Las lechugas del invernadero hacen oxígeno, pero sus lámparas gastan mucha energía.',
      en: 'The greenhouse lettuce makes oxygen, but its lamps use a lot of energy.',
    },
    options: [
      {
        label: { es: 'Encender las lámparas', en: 'Turn the lamps on' },
        detail: { es: 'Más aire, menos energía', en: 'More air, less energy' },
        effects: { energy: -20, air: 14 },
        outcome: { es: 'Las plantas crecieron y llenaron la base de oxígeno, pero las baterías bajaron.', en: 'The plants grew and filled the base with oxygen, but the batteries went down.' },
      },
      {
        label: { es: 'Dejarlas apagadas', en: 'Keep them off' },
        detail: { es: 'Ahorras energía, pero las plantas no ayudan', en: 'Save energy, but the plants don\'t help' },
        effects: { air: -5 },
        outcome: { es: 'Ahorraste energía, pero sin luz las plantas casi no hicieron oxígeno.', en: 'You saved energy, but without light the plants made almost no oxygen.' },
      },
    ],
    fact: {
      es: 'En 2015 los astronautas de la Estación Espacial comieron por primera vez lechuga cultivada en el espacio, en el experimento Veggie de la NASA.',
      en: 'In 2015, astronauts on the Space Station ate lettuce grown in space for the first time, in NASA\'s Veggie experiment.',
    },
    source: { name: 'NASA — Veggie', url: 'https://science.nasa.gov/mission/veggie/' },
  },
  {
    id: 'experiment',
    sites: ['moon', 'mars'],
    icon: '🔬',
    title: { es: '¿Hacemos un experimento?', en: 'Shall we run an experiment?' },
    text: {
      es: 'Los científicos en la Tierra quieren saber cómo crecen unas semillas aquí. ¡Sería un gran descubrimiento!',
      en: 'Scientists on Earth want to know how some seeds grow here. It would be a great discovery!',
    },
    options: [
      {
        label: { es: 'Hacer el experimento', en: 'Run the experiment' },
        detail: { es: '+1 descubrimiento, pero gasta energía y cansa', en: '+1 discovery, but uses energy and tires the crew' },
        effects: { stars: 1, energy: -15, health: -5 },
        outcome: { es: '¡Descubrimiento! Los datos viajaron a la Tierra. El equipo quedó cansado.', en: 'Discovery! The data traveled to Earth. The crew got tired.' },
      },
      {
        label: { es: 'Descansar hoy', en: 'Rest today' },
        detail: { es: 'El equipo recupera fuerzas, pero no hay descubrimiento', en: 'The crew recovers, but no discovery' },
        effects: { health: 5 },
        outcome: { es: 'El equipo descansó, pero hoy no se aprendió nada nuevo para la ciencia.', en: 'The crew rested, but nothing new was learned for science today.' },
      },
    ],
    fact: {
      es: 'La NASA guarda los resultados de sus experimentos con seres vivos en el espacio en una biblioteca abierta llamada OSDR. Cualquiera puede consultarla.',
      en: 'NASA keeps the results of its space biology experiments in an open library called OSDR. Anyone can look at it.',
    },
    source: { name: 'NASA Open Science Data Repository (OSDR)', url: 'https://osdr.nasa.gov/' },
  },
  {
    id: 'air_alarm',
    sites: ['moon', 'mars'],
    icon: '🚨',
    title: { es: '¡Alarma en el reciclador de aire!', en: 'Air recycler alarm!' },
    text: {
      es: 'Una luz roja parpadea. Puedes pedir ayuda a los expertos en la Tierra o arreglarlo tú.',
      en: 'A red light is blinking. You can ask the experts on Earth for help or fix it yourself.',
    },
    textBySite: {
      moon: { es: 'Una luz roja parpadea. Desde la Luna, un mensaje a la Tierra tarda solo 1.3 segundos.', en: 'A red light is blinking. From the Moon, a message to Earth takes only 1.3 seconds.' },
      mars: { es: 'Una luz roja parpadea. Desde Marte, un mensaje a la Tierra tarda de 3 a 22 minutos… ¡y la respuesta tarda lo mismo de regreso!', en: 'A red light is blinking. From Mars, a message to Earth takes 3 to 22 minutes… and the answer takes just as long to come back!' },
    },
    options: [
      {
        label: { es: 'Preguntar a Houston', en: 'Ask Houston' },
        detail: { es: 'Arreglo seguro, pero hay que esperar la respuesta', en: 'Safe fix, but you must wait for the answer' },
        effects: {},
        effectsBySite: { moon: { air: -3 }, mars: { air: -18 } },
        outcome: { es: 'Houston respondió y lo arreglaste.', en: 'Houston answered and you fixed it.' },
        outcomeBySite: {
          moon: { es: 'Houston respondió en segundos y lo arreglaste casi sin perder aire.', en: 'Houston answered in seconds and you fixed it, losing almost no air.' },
          mars: { es: 'La respuesta tardó muchos minutos en ir y volver (¡hasta 44!). Mientras esperabas, se perdió mucho aire.', en: 'The answer took many minutes to go and come back (up to 44!). While you waited, a lot of air was lost.' },
        },
      },
      {
        label: { es: 'Arreglarlo nosotros', en: 'Fix it ourselves' },
        detail: { es: 'Rápido, pero es trabajo duro y gasta energía', en: 'Fast, but it\'s hard work and uses energy' },
        effects: { energy: -10, health: -8 },
        outcome: { es: 'El equipo lo arregló solo y rápido, pero quedó agotado.', en: 'The crew fixed it alone and fast, but got exhausted.' },
      },
    ],
    fact: {
      es: 'La luz y la radio viajan a 300,000 km por segundo. La Luna está a 1.3 segundos de luz, pero Marte puede estar a más de 20 minutos. Por eso los astronautas en Marte tendrán que decidir solos.',
      en: 'Light and radio travel at 300,000 km per second. The Moon is 1.3 light-seconds away, but Mars can be more than 20 light-minutes away. That is why astronauts on Mars will have to decide on their own.',
    },
    source: { name: 'NASA — Deep Space Network', url: 'https://www.nasa.gov/communicating-with-missions/dsn/' },
  },
  {
    id: 'exercise',
    sites: ['moon', 'mars'],
    icon: '🏋️',
    title: { es: 'Hora del ejercicio', en: 'Exercise time' },
    text: {
      es: 'Con poca gravedad, los huesos y músculos se debilitan si no se usan.',
      en: 'With low gravity, bones and muscles get weaker if they are not used.',
    },
    options: [
      {
        label: { es: 'Hacer 2 horas de ejercicio', en: 'Exercise for 2 hours' },
        detail: { es: 'El equipo se pone fuerte, pero las máquinas gastan energía', en: 'The crew gets stronger, but the machines use energy' },
        effects: { energy: -10, health: 10 },
        outcome: { es: 'El equipo hizo ejercicio y se siente fuerte.', en: 'The crew exercised and feels strong.' },
      },
      {
        label: { es: 'Usar ese tiempo para ciencia', en: 'Use that time for science' },
        detail: { es: '+1 descubrimiento, pero los huesos se debilitan', en: '+1 discovery, but bones get weaker' },
        effects: { stars: 1, health: -10 },
        outcome: { es: '¡Descubrimiento! Pero sin ejercicio el equipo perdió fuerza.', en: 'Discovery! But without exercise the crew lost strength.' },
      },
    ],
    fact: {
      es: 'Sin gravedad, los astronautas pueden perder entre 1% y 1.5% de sus huesos cada mes. Por eso en la Estación Espacial hacen unas 2 horas de ejercicio al día.',
      en: 'Without gravity, astronauts can lose 1% to 1.5% of their bone mass every month. That is why on the Space Station they exercise about 2 hours a day.',
    },
    source: { name: 'NASA — Human Research Program', url: 'https://www.nasa.gov/hrp/' },
  },
  {
    id: 'call_home',
    sites: ['moon', 'mars'],
    icon: '📡',
    title: { es: 'Mensaje para la familia', en: 'Message for the family' },
    text: {
      es: 'El equipo extraña a sus familias. La antena grande gasta energía.',
      en: 'The crew misses their families. The big antenna uses energy.',
    },
    options: [
      {
        label: { es: 'Usar la antena', en: 'Use the antenna' },
        detail: { es: 'El equipo se anima, pero gasta energía', en: 'The crew cheers up, but it uses energy' },
        effects: { energy: -15, health: 8 },
        outcome: { es: 'Hablaron con sus familias y se sienten felices.', en: 'They talked with their families and feel happy.' },
        outcomeBySite: {
          moon: { es: 'Hicieron una videollamada casi en vivo: solo 1.3 segundos de espera.', en: 'They made an almost live video call: only a 1.3-second wait.' },
          mars: { es: 'Desde Marte no se puede hablar en vivo: enviaron videos que tardan minutos en llegar. Aun así, se animaron.', en: 'From Mars you can\'t talk live: they sent videos that take minutes to arrive. Still, they cheered up.' },
        },
      },
      {
        label: { es: 'Guardar la energía', en: 'Save the energy' },
        detail: { es: 'Ahorras energía, pero el equipo se pone triste', en: 'Save energy, but the crew gets sad' },
        effects: { health: -6 },
        outcome: { es: 'Ahorraste energía, pero el equipo extraña su casa.', en: 'You saved energy, but the crew misses home.' },
      },
    ],
    fact: {
      es: 'Las antenas gigantes de la NASA en California, España y Australia se turnan para hablar con las naves, porque la Tierra gira.',
      en: 'NASA\'s giant antennas in California, Spain and Australia take turns talking to spacecraft, because the Earth spins.',
    },
    source: { name: 'NASA — Deep Space Network', url: 'https://www.nasa.gov/communicating-with-missions/dsn/' },
  },
  {
    id: 'moon_ice',
    sites: ['moon'],
    icon: '🧊',
    title: { es: 'Hielo en el cráter oscuro', en: 'Ice in the dark crater' },
    text: {
      es: 'En el fondo del cráter nunca llega el Sol y hay hielo. Con hielo se hace agua… ¡y oxígeno!',
      en: 'The Sun never reaches the bottom of the crater, and there is ice there. Ice makes water… and oxygen!',
    },
    options: [
      {
        label: { es: 'Ir a buscar hielo', en: 'Go get ice' },
        detail: { es: 'Más aire, pero gasta energía y afuera hay radiación', en: 'More air, but uses energy and there\'s radiation outside' },
        effects: { energy: -15, air: 20, health: -5, stars: 1 },
        outcome: { es: 'Trajeron hielo y lo convirtieron en oxígeno. Afuera recibieron algo de radiación.', en: 'They brought ice and turned it into oxygen. Outside they got some radiation.' },
      },
      {
        label: { es: 'Quedarse en la base', en: 'Stay in the base' },
        detail: { es: 'Seguro, pero hay que racionar el aire', en: 'Safe, but air must be rationed' },
        effects: { air: -5 },
        outcome: { es: 'Se quedaron seguros, pero tuvieron que gastar parte del aire guardado.', en: 'They stayed safe, but had to use some of the stored air.' },
      },
    ],
    fact: {
      es: 'En 2009 la misión LCROSS de la NASA chocó a propósito contra un cráter del polo sur de la Luna y encontró agua congelada en el polvo que levantó.',
      en: 'In 2009 NASA\'s LCROSS mission crashed on purpose into a crater at the Moon\'s south pole and found frozen water in the dust it kicked up.',
    },
    source: { name: 'NASA — LCROSS', url: 'https://science.nasa.gov/mission/lcross/' },
  },
  {
    id: 'lunar_night',
    sites: ['moon'],
    icon: '🌑',
    title: { es: 'Se acerca la noche lunar', en: 'The lunar night is coming' },
    text: {
      es: 'Una noche en la Luna dura unos 14 días de la Tierra. Los paneles solares no darán energía.',
      en: 'A night on the Moon lasts about 14 Earth days. The solar panels won\'t make energy.',
    },
    options: [
      {
        label: { es: 'Apagar el invernadero', en: 'Turn off the greenhouse' },
        detail: { es: 'Ahorras energía, pero las plantas no hacen oxígeno', en: 'Save energy, but the plants make no oxygen' },
        effects: { energy: 10, air: -10 },
        outcome: { es: 'Las baterías aguantan, pero el aire bajó sin las plantas.', en: 'The batteries hold up, but the air dropped without the plants.' },
      },
      {
        label: { es: 'Dejar todo encendido', en: 'Keep everything on' },
        detail: { es: 'Las plantas siguen, pero las baterías bajan mucho', en: 'The plants keep going, but the batteries drop a lot' },
        effects: { energy: -25, air: 5 },
        outcome: { es: 'Las plantas siguieron haciendo oxígeno, pero las baterías quedaron muy bajas.', en: 'The plants kept making oxygen, but the batteries got very low.' },
      },
    ],
    fact: {
      es: 'En el polo sur de la Luna hay crestas donde el Sol casi nunca se oculta. Por eso la NASA eligió esa zona para las misiones Artemis.',
      en: 'At the Moon\'s south pole there are ridges where the Sun almost never sets. That is one reason NASA chose that area for the Artemis missions.',
    },
    source: { name: 'NASA — Artemis', url: 'https://www.nasa.gov/humans-in-space/artemis/' },
  },
  {
    id: 'moon_dust',
    sites: ['moon'],
    icon: '🌫️',
    title: { es: 'Polvo lunar pegajoso', en: 'Sticky Moon dust' },
    text: {
      es: 'El equipo vuelve de afuera con los trajes llenos de polvo lunar, que es filoso como vidrio.',
      en: 'The crew comes back from outside with suits full of Moon dust, which is sharp like glass.',
    },
    options: [
      {
        label: { es: 'Limpiar bien los trajes', en: 'Clean the suits well' },
        detail: { es: 'Las aspiradoras gastan energía', en: 'The vacuums use energy' },
        effects: { energy: -10 },
        outcome: { es: 'Los trajes quedaron limpios y nadie respiró polvo.', en: 'The suits got clean and nobody breathed dust.' },
      },
      {
        label: { es: 'Entrar rápido', en: 'Go in quickly' },
        detail: { es: 'Ahorras energía, pero el polvo entra a la base', en: 'Save energy, but dust gets into the base' },
        effects: { health: -10 },
        outcome: { es: 'El polvo entró a la base: ojos irritados y estornudos para todos.', en: 'Dust got into the base: itchy eyes and sneezing for everyone.' },
      },
    ],
    fact: {
      es: 'En 1972 el astronauta Harrison Schmitt, del Apolo 17, sintió algo parecido a una alergia por el polvo lunar que entró a su nave.',
      en: 'In 1972, Apollo 17 astronaut Harrison Schmitt felt something like hay fever from the Moon dust that got into his spacecraft.',
    },
    source: { name: 'NASA — Apollo 17', url: 'https://www.nasa.gov/mission/apollo-17/' },
  },
  {
    id: 'moxie',
    sites: ['mars'],
    icon: '🫧',
    title: { es: 'Hacer oxígeno del aire de Marte', en: 'Make oxygen from Mars air' },
    text: {
      es: 'El aire de Marte es casi todo dióxido de carbono. Una máquina puede sacarle oxígeno… si le das energía.',
      en: 'Mars air is almost all carbon dioxide. A machine can pull oxygen out of it… if you give it energy.',
    },
    options: [
      {
        label: { es: 'Encender la máquina', en: 'Turn on the machine' },
        detail: { es: 'Más aire y +1 descubrimiento, pero gasta mucha energía', en: 'More air and +1 discovery, but uses a lot of energy' },
        effects: { energy: -25, air: 20, stars: 1 },
        outcome: { es: 'La máquina convirtió aire marciano en oxígeno respirable.', en: 'The machine turned Martian air into breathable oxygen.' },
      },
      {
        label: { es: 'Dejarla apagada', en: 'Leave it off' },
        detail: { es: 'Ahorras energía, pero hay que racionar el aire', en: 'Save energy, but air must be rationed' },
        effects: { air: -5 },
        outcome: { es: 'Ahorraste energía, pero el aire guardado bajó.', en: 'You saved energy, but the stored air went down.' },
      },
    ],
    fact: {
      es: 'El experimento MOXIE, a bordo del rover Perseverance, fabricó 122 gramos de oxígeno con el aire de Marte entre 2021 y 2023.',
      en: 'The MOXIE experiment, aboard the Perseverance rover, made 122 grams of oxygen from Mars air between 2021 and 2023.',
    },
    source: { name: 'NASA — MOXIE', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
  },
  {
    id: 'mars_dust_storm',
    sites: ['mars'],
    icon: '🌪️',
    title: { es: 'Tormenta de polvo', en: 'Dust storm' },
    text: {
      es: 'Una tormenta cubrió los paneles solares de polvo. Casi no entra luz.',
      en: 'A storm covered the solar panels with dust. Almost no light gets in.',
    },
    options: [
      {
        label: { es: 'Salir a limpiar los paneles', en: 'Go out and clean the panels' },
        detail: { es: 'Recuperas energía, pero afuera hay radiación y se gasta aire', en: 'Get energy back, but there\'s radiation outside and it uses air' },
        effects: { energy: 20, health: -8, air: -5 },
        outcome: { es: 'Los paneles brillan otra vez. El equipo recibió algo de radiación afuera.', en: 'The panels shine again. The crew got some radiation outside.' },
      },
      {
        label: { es: 'Esperar a que pase', en: 'Wait for it to pass' },
        detail: { es: 'Nadie sale, pero casi no hay energía', en: 'Nobody goes out, but there\'s almost no energy' },
        effects: { energy: -25 },
        outcome: { es: 'Nadie salió, pero las baterías bajaron mucho sin luz del Sol.', en: 'Nobody went out, but the batteries dropped a lot without sunlight.' },
      },
    ],
    fact: {
      es: 'En 2018 una tormenta de polvo cubrió todo Marte. El rover Opportunity se quedó sin energía en sus paneles y nunca volvió a despertar.',
      en: 'In 2018 a dust storm covered all of Mars. The Opportunity rover ran out of power in its panels and never woke up again.',
    },
    source: { name: 'NASA — Opportunity', url: 'https://science.nasa.gov/mission/mer-opportunity/' },
  },
];

// ── Glosario: palabras difíciles explicadas en una línea ──
export const GLOSSARY: Record<string, T> = {
  radiacion: {
    es: 'Radiación: energía invisible que viene del Sol y del espacio. Mucha hace daño al cuerpo.',
    en: 'Radiation: invisible energy from the Sun and space. Too much harms the body.',
  },
  escudo: {
    es: 'Escudo: paredes gruesas de tierra lunar o marciana y agua alrededor de la base que frenan la radiación.',
    en: 'Shield: thick walls of Moon or Mars soil and water around the base that block radiation.',
  },
  msv: {
    es: 'mSv (milisievert): la unidad para medir cuánta radiación recibe el cuerpo. Una radiografía de pecho son 0.1 mSv.',
    en: 'mSv (millisievert): the unit for how much radiation the body gets. A chest X-ray is 0.1 mSv.',
  },
  llamarada: {
    es: 'Llamarada solar: una explosión en el Sol. Las de clase X son las más fuertes.',
    en: 'Solar flare: an explosion on the Sun. Class X flares are the strongest.',
  },
  energia: {
    es: 'Energía: la electricidad de las baterías. La dan los paneles solares y la gastan las máquinas.',
    en: 'Energy: the electricity in the batteries. Solar panels make it and machines use it.',
  },
  aire: {
    es: 'Aire: el oxígeno que respira el equipo. Cada día se gasta un poco.',
    en: 'Air: the oxygen the crew breathes. A little is used up every day.',
  },
  sol: {
    es: 'Sol (en Marte): así se llama un día marciano. Dura 24 horas y 40 minutos.',
    en: 'Sol (on Mars): the name of a Martian day. It lasts 24 hours and 40 minutes.',
  },
  donki: {
    es: 'DONKI: la base de datos de la NASA que anota cada tormenta del Sol.',
    en: 'DONKI: NASA\'s database that records every storm from the Sun.',
  },
};

// ── Fuentes mostradas en la página "¿De dónde salen los datos?" ──
export interface DataSourceEntry {
  name: string;
  url: string;
  what: T;
  why: T;
  mode: 'live' | 'stored';
}

export const DATA_SOURCES: DataSourceEntry[] = [
  {
    name: 'NASA DONKI — Solar Flares (FLR)',
    url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    what: {
      es: 'La llamarada solar más fuerte de los últimos 30 días, y 6 llamaradas clase X reales de 2017 y 2024.',
      en: 'The strongest solar flare of the last 30 days, plus 6 real class X flares from 2017 and 2024.',
    },
    why: {
      es: 'Su fuerza decide cuánto daño hace la tormenta si no subes el escudo.',
      en: 'Its strength decides how much harm the storm does if you don\'t raise the shield.',
    },
    mode: 'live',
  },
  {
    name: 'NOAA SWPC — GOES X-ray flares (respaldo)',
    url: 'https://www.swpc.noaa.gov/products/goes-x-ray-flux',
    what: {
      es: 'Las llamaradas que midieron los satélites GOES (NOAA y NASA) en los últimos 7 días.',
      en: 'The flares measured by the GOES satellites (NOAA and NASA) in the last 7 days.',
    },
    why: {
      es: 'Si DONKI no responde, la primera tormenta usa la llamarada más fuerte de esta semana. Si fue pequeña, el juego lo dice: ¡el Sol estuvo tranquilo!',
      en: 'If DONKI does not answer, the first storm uses this week\'s strongest flare. If it was small, the game says so: the Sun was calm!',
    },
    mode: 'live',
  },
  {
    name: 'Curiosity RAD (NASA/JPL) · Chang\'e 4 LND',
    url: 'https://doi.org/10.1126/science.1244797',
    what: {
      es: 'La radiación diaria real en el suelo de Marte (0.64 mSv) y de la Luna (1.37 mSv).',
      en: 'The real daily radiation on the ground of Mars (0.64 mSv) and the Moon (1.37 mSv).',
    },
    why: {
      es: 'Es la dosis de cada día del juego, reducida por tu escudo.',
      en: 'It is the dose for each game day, reduced by your shield.',
    },
    mode: 'stored',
  },
  {
    name: 'NASA OSDR · Veggie · Human Research Program',
    url: 'https://osdr.nasa.gov/',
    what: {
      es: 'Hallazgos reales sobre plantas en el espacio y la salud de los astronautas (huesos, ejercicio).',
      en: 'Real findings about plants in space and astronaut health (bones, exercise).',
    },
    why: {
      es: 'Explican por qué cada decisión cuesta lo que cuesta.',
      en: 'They explain why each decision costs what it costs.',
    },
    mode: 'stored',
  },
  {
    name: 'NASA Mars 2020 (MOXIE) · Opportunity · LCROSS · Artemis · DSN',
    url: 'https://science.nasa.gov/mars/',
    what: {
      es: 'Datos reales de misiones: oxígeno de MOXIE, tormenta de 2018, hielo lunar, noche lunar y retraso de las comunicaciones.',
      en: 'Real mission data: MOXIE oxygen, the 2018 storm, Moon ice, the lunar night and communication delay.',
    },
    why: {
      es: 'Dan la historia real detrás de cada tarjeta.',
      en: 'They give the true story behind each card.',
    },
    mode: 'stored',
  },
];
