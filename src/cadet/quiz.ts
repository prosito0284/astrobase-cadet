// ─────────────────────────────────────────────────────────────────────────────
// Mini cuestionario al final de la misión ("Bitácora del cadete").
// Cada pregunta sale del dato real ("Esto pasó de verdad") de una tarjeta que el
// niño jugó en ESA partida, así repasa lo que acaba de ver. La primera opción
// escrita es siempre la correcta; el orden se mezcla al armar el cuestionario.
// ─────────────────────────────────────────────────────────────────────────────
import type { T } from './data';
import type { CadetState } from './engine';
import { mulberry32, shuffle } from './engine';

export interface QuizItem {
  q: T;
  correct: T;
  wrong: [T, T];
}

export const CARD_QUIZ: Record<string, QuizItem> = {
  water_recycle: {
    q: { es: '¿Cuánta agua se recupera en la Estación Espacial?', en: 'How much water is recovered on the Space Station?' },
    correct: { es: 'El 98%, ¡hasta la del sudor!', en: '98%, even from sweat!' },
    wrong: [{ es: 'Nada: se tira al espacio', en: 'None: it\'s thrown into space' }, { es: 'La mitad', en: 'Half' }],
  },
  sleep_lights: {
    q: { es: '¿Qué estudia la NASA para ayudar a los astronautas a dormir?', en: 'What does NASA study to help astronauts sleep?' },
    correct: { es: 'Luces de colores que avisan al cuerpo si es de día o de noche', en: 'Colored lights that tell the body if it\'s day or night' },
    wrong: [{ es: 'Camas que flotan más alto', en: 'Beds that float higher' }, { es: 'Dormir solo una vez por semana', en: 'Sleeping only once a week' }],
  },
  micrometeorite: {
    q: { es: '¿Qué es un "escudo Whipple"?', en: 'What is a "Whipple shield"?' },
    correct: { es: 'Una capa delgada que rompe las piedritas antes de llegar a la nave', en: 'A thin layer that breaks up tiny rocks before they reach the ship' },
    wrong: [{ es: 'Un imán gigante', en: 'A giant magnet' }, { es: 'Un traje para la lluvia', en: 'A raincoat' }],
  },
  rover_trip: {
    q: { es: '¿Qué hace el rover Perseverance con las rocas de Marte?', en: 'What does the Perseverance rover do with Mars rocks?' },
    correct: { es: 'Las guarda en tubos para traerlas algún día a la Tierra', en: 'Stores them in tubes to bring to Earth someday' },
    wrong: [{ es: 'Las convierte en comida', en: 'Turns them into food' }, { es: 'Las lanza al espacio', en: 'Throws them into space' }],
  },
  perchlorate: {
    q: { es: '¿Qué encontró la sonda Phoenix en el suelo de Marte?', en: 'What did the Phoenix lander find in the Martian soil?' },
    correct: { es: 'Percloratos: sales que pueden dañar la salud', en: 'Perchlorates: salts that can harm health' },
    wrong: [{ es: 'Chocolate', en: 'Chocolate' }, { es: 'Dinosaurios', en: 'Dinosaurs' }],
  },
  insight_dust: {
    q: { es: '¿Por qué terminó la misión InSight en 2022?', en: 'Why did the InSight mission end in 2022?' },
    correct: { es: 'El polvo cubrió sus paneles solares', en: 'Dust covered its solar panels' },
    wrong: [{ es: 'Se la llevó un marciano', en: 'A Martian took it' }, { es: 'Se congeló el agua de su tanque', en: 'The water in its tank froze' }],
  },
  greenhouse_light: {
    q: { es: '¿Cómo se llama el experimento de la NASA que cultivó lechuga en el espacio?', en: 'What is the NASA experiment that grew lettuce in space called?' },
    correct: { es: 'Veggie', en: 'Veggie' },
    wrong: [{ es: 'MOXIE', en: 'MOXIE' }, { es: 'Phoenix', en: 'Phoenix' }],
  },
  experiment: {
    q: { es: '¿Dónde guarda la NASA los resultados de sus experimentos con seres vivos?', en: 'Where does NASA keep the results of its experiments with living things?' },
    correct: { es: 'En una biblioteca abierta llamada OSDR', en: 'In an open library called OSDR' },
    wrong: [{ es: 'En una caja fuerte secreta', en: 'In a secret safe' }, { es: 'No los guarda', en: 'It doesn\'t keep them' }],
  },
  air_alarm: {
    q: { es: '¿Por qué en Marte los astronautas tendrán que decidir solos?', en: 'Why will astronauts on Mars have to decide on their own?' },
    correct: { es: 'Porque los mensajes tardan muchos minutos en ir y volver', en: 'Because messages take many minutes to go and come back' },
    wrong: [{ es: 'Porque en Marte no hay teléfonos', en: 'Because there are no phones on Mars' }, { es: 'Porque Houston duerme todo el día', en: 'Because Houston sleeps all day' }],
  },
  exercise: {
    q: { es: '¿Cuánto ejercicio hacen al día los astronautas de la Estación Espacial?', en: 'How much do Space Station astronauts exercise each day?' },
    correct: { es: 'Unas 2 horas', en: 'About 2 hours' },
    wrong: [{ es: '5 minutos', en: '5 minutes' }, { es: 'Nada: flotan', en: 'None: they float' }],
  },
  call_home: {
    q: { es: '¿Por qué la NASA tiene antenas gigantes en tres países?', en: 'Why does NASA have giant antennas in three countries?' },
    correct: { es: 'Porque la Tierra gira y se turnan para hablar con las naves', en: 'Because Earth spins and they take turns talking to spacecraft' },
    wrong: [{ es: 'Para ver la televisión', en: 'To watch TV' }, { es: 'Para que no se pierdan', en: 'So they don\'t get lost' }],
  },
  moon_ice: {
    q: { es: '¿Qué encontró la misión LCROSS en un cráter de la Luna?', en: 'What did the LCROSS mission find in a crater on the Moon?' },
    correct: { es: 'Agua congelada', en: 'Frozen water' },
    wrong: [{ es: 'Queso', en: 'Cheese' }, { es: 'Un astronauta perdido', en: 'A lost astronaut' }],
  },
  lunar_night: {
    q: { es: '¿Por qué Artemis quiere ir al polo sur de la Luna?', en: 'Why does Artemis want to go to the Moon\'s south pole?' },
    correct: { es: 'Hay crestas donde el Sol casi nunca se oculta', en: 'There are ridges where the Sun almost never sets' },
    wrong: [{ es: 'Porque ahí hace calor', en: 'Because it is warm there' }, { es: 'Porque ahí hay aire', en: 'Because there is air there' }],
  },
  moon_dust: {
    q: { es: '¿Qué le pasó al astronauta del Apolo 17 con el polvo lunar?', en: 'What happened to the Apollo 17 astronaut with lunar dust?' },
    correct: { es: 'Sintió algo parecido a una alergia', en: 'He felt something like an allergy' },
    wrong: [{ es: 'Se volvió invisible', en: 'He became invisible' }, { es: 'Le dio mucha hambre', en: 'He got very hungry' }],
  },
  moxie: {
    q: { es: '¿Qué fabricó el experimento MOXIE en Marte?', en: 'What did the MOXIE experiment make on Mars?' },
    correct: { es: 'Oxígeno, con el aire de Marte', en: 'Oxygen, from the Martian air' },
    wrong: [{ es: 'Helado', en: 'Ice cream' }, { es: 'Gasolina para coches', en: 'Gas for cars' }],
  },
  mars_dust_storm: {
    q: { es: '¿Qué le pasó al rover Opportunity en 2018?', en: 'What happened to the Opportunity rover in 2018?' },
    correct: { es: 'Una tormenta de polvo lo dejó sin energía', en: 'A dust storm left it without power' },
    wrong: [{ es: 'Volvió solo a la Tierra', en: 'It drove back to Earth' }, { es: 'Se lo comió un volcán', en: 'A volcano ate it' }],
  },
};

export const STORM_QUIZ: QuizItem[] = [
  {
    q: { es: '¿Qué es lo mejor que puedes hacer cuando viene una llamarada solar?', en: 'What is the best thing to do when a solar flare is coming?' },
    correct: { es: 'Subir el escudo para proteger al equipo', en: 'Raise the shield to protect the crew' },
    wrong: [{ es: 'Salir a mirar el Sol', en: 'Go outside to look at the Sun' }, { es: 'Apagar el escudo para ahorrar', en: 'Turn the shield off to save energy' }],
  },
  {
    q: { es: '¿Cuál de estas llamaradas es la más fuerte?', en: 'Which of these flares is the strongest?' },
    correct: { es: 'Clase X', en: 'Class X' },
    wrong: [{ es: 'Clase C', en: 'Class C' }, { es: 'Clase M', en: 'Class M' }],
  },
];

export interface QuizQuestion {
  q: T;
  options: T[];       // 3 opciones ya mezcladas
  answer: number;     // índice de la correcta dentro de options
  cardId?: string;
}

/** Arma hasta 3 preguntas de las tarjetas jugadas en esta partida (+ 1 de tormenta). Determinista por semilla. */
export function buildQuiz(state: CadetState, max = 3): QuizQuestion[] {
  const rng = mulberry32((state.seed ^ 0x9e3779b9) >>> 0);
  const played = state.deck.slice(0, state.history.length);
  const cardIds = [...new Set(played.flatMap(e => (e.kind === 'card' && CARD_QUIZ[e.cardId] ? [e.cardId] : [])))];
  const hadStorm = played.some(e => e.kind === 'storm');

  const items: { item: QuizItem; cardId?: string }[] = [];
  if (hadStorm) items.push({ item: STORM_QUIZ[Math.floor(rng() * STORM_QUIZ.length)] });
  for (const id of shuffle(cardIds, rng)) {
    if (items.length >= max) break;
    items.push({ item: CARD_QUIZ[id], cardId: id });
  }
  return shuffle(items.slice(0, max), rng).map(({ item, cardId }) => {
    const options = shuffle([item.correct, ...item.wrong], rng);
    return { q: item.q, options, answer: options.indexOf(item.correct), cardId };
  });
}
