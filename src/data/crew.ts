import { Astronaut } from '../types/game';

export const INITIAL_CREW: Astronaut[] = [
  {
    id: 'valentina',
    name: 'Dra. Valentina Alarcón',
    role: 'Comandante & Astrofísica',
    avatar: '👩‍🚀',
    health: 100,
    morale: 95,
    skills: 'Especialista en clima espacial, cálculo orbital y liderazgo bajo presión.',
    quote: '«La Luna y Marte no perdonan errores de cálculo, pero cada desafío es una oportunidad de aprender.»',
  },
  {
    id: 'leo',
    name: 'Dr. Leo Chen',
    role: 'Botánico Espacial (OSDR)',
    avatar: '🧑‍🌾',
    health: 100,
    morale: 90,
    skills: 'Experto en hidroponía Veggie, microalgas y balance nutricional de astronautas.',
    quote: '«Ver brotar una lechuga verde en el polvo lunar es el recordatorio más hermoso de la vida en la Tierra.»',
  },
  {
    id: 'maya',
    name: 'Ing. Maya Rodriguez',
    role: 'Jefa de Soporte Vital (ECLSS)',
    avatar: '👩‍🔧',
    health: 100,
    morale: 92,
    skills: 'Mantenimiento de filtros de zeolita, electrólisis de agua y reciclaje de oxígeno.',
    quote: '«En el espacio profundo, ni una sola gota de agua ni una molécula de oxígeno deben desperdiciarse.»',
  },
  {
    id: 'mateo',
    name: 'Mateo Morales',
    role: 'Geólogo y Piloto de Rover',
    avatar: '👨‍🚀',
    health: 100,
    morale: 94,
    skills: 'Perforación de hielo en cráteres polares, análisis de regolito y robótica.',
    quote: '«El regolito bajo nuestras botas guarda los secretos de los primeros días del sistema solar.»',
  },
];
