// Guía imprimible para maestros y familias (Modo Cadete).
import type { Lang, T } from './data';

interface Section { title: T; items: T[] }

const SECTIONS: Section[] = [
  {
    title: { es: '👧🧒 Para quién', en: '👧🧒 Who it is for' },
    items: [
      { es: 'Niñas y niños de 7 a 12 años. Cada partida dura de 15 a 20 minutos.', en: 'Children aged 7 to 12. Each game takes 15 to 20 minutes.' },
      { es: 'Para quienes todavía leen despacio: «Leer todo en voz alta» (en ⚙️ Ajustes) lee cada tarjeta automáticamente, y las palabras subrayadas (radiación, escudo, llamarada…) se pueden tocar para ver qué significan.', en: 'For slower readers: “Read everything aloud” (in ⚙️ Settings) reads every card automatically, and underlined words (radiation, shield, flare…) can be tapped to see what they mean.' },
      { es: 'No necesita cuenta ni instalar nada. Funciona en celular, tableta o computadora, en español o inglés, y puede leer los textos en voz alta. Después de abrirlo una vez, funciona sin internet.', en: 'No account or install needed. Works on phone, tablet or computer, in Spanish or English, and can read texts aloud. After opening it once, it works offline.' },
    ],
  },
  {
    title: { es: '🎯 Qué aprenden', en: '🎯 What they learn' },
    items: [
      { es: 'Recursos limitados: el aire, la energía y el escudo compiten entre sí. Cada decisión tiene un costo.', en: 'Limited resources: air, energy and shielding compete. Every decision has a cost.' },
      { es: 'El clima espacial es real: el Sol lanza llamaradas que la NASA mide (DONKI), y la radiación se mide en milisieverts (mSv).', en: 'Space weather is real: the Sun throws flares that NASA measures (DONKI), and radiation is measured in millisieverts (mSv).' },
      { es: 'La distancia importa: un mensaje tarda 1.3 segundos en llegar a la Luna y de 3 a 22 minutos en llegar a Marte. Por eso en Marte los astronautas tendrán que decidir solos.', en: 'Distance matters: a message takes 1.3 seconds to reach the Moon and 3 to 22 minutes to reach Mars. That is why astronauts on Mars will have to decide on their own.' },
    ],
  },
  {
    title: { es: '⏱️ Antes de jugar (5 min)', en: '⏱️ Before playing (5 min)' },
    items: [
      { es: 'Pregunten: "¿Qué necesitas para vivir un día?" Hagan una lista y luego vean cuáles de esas cosas hay en la Luna.', en: 'Ask: "What do you need to live for one day?" Make a list, then check which of those things exist on the Moon.' },
      { es: 'Con una sola computadora y un proyector: en ⚙️ Ajustes activen «Modo clase» y, si la imagen se ve lavada, «Tema claro». La letra se agranda y en cada tarjeta aparece una votación: cuenten las manos para A y para B y toquen "Decidir por mayoría". Si hay empate, el juego pide discutir y votar otra vez.', en: 'With one computer and a projector: in ⚙️ Settings turn on “Class mode” and, if the image looks washed out, “Light theme”. The text gets bigger and each card shows a vote: count hands for A and B and tap "Decide by majority". If there is a tie, the game asks the class to discuss and vote again.' },
      { es: 'Misma misión para toda la clase: jueguen una vez y copien el "Código de misión" que sale al final (por ejemplo LN-48213), o inventen uno con dos letras y 5 números (L = Luna, M = Marte; F = Fácil, N = Normal). Todos lo escriben en "¿Tu maestra o maestro te dio un código?" y juegan exactamente la misma misión. Al final comparen: ¿quién eligió distinto y qué pasó?', en: 'Same mission for the whole class: play once and copy the "Mission code" shown at the end (for example LN-48213), or make one up with two letters and 5 numbers (L = Moon, M = Mars; F = Easy, N = Normal). Everyone types it in "Did your teacher give you a mission code?" and plays exactly the same mission. Afterwards compare: who chose differently and what happened?' },
    ],
  },
  {
    title: { es: '💬 Preguntas para conversar después', en: '💬 Questions to discuss afterwards' },
    items: [
      { es: '¿Qué decisión fue la más difícil? ¿Por qué?', en: 'Which decision was the hardest? Why?' },
      { es: '¿Por qué pedir ayuda a Houston es fácil desde la Luna pero difícil desde Marte?', en: 'Why is asking Houston for help easy from the Moon but hard from Mars?' },
      { es: '¿Recibiste menos radiación en la Luna o en Marte? ¿Por qué crees que pasa? (Pista: Marte tiene un poco de aire.)', en: 'Did you get less radiation on the Moon or on Mars? Why do you think so? (Hint: Mars has a little air.)' },
      { es: '¿A cuántas radiografías equivale tu misión? ¿Y un año normal en la Tierra (2.4 mSv)?', en: 'How many X-rays was your mission worth? And a normal year on Earth (2.4 mSv)?' },
      { es: 'Si diseñaras tu propia base, ¿qué cambiarías para protegerte del Sol?', en: 'If you designed your own base, what would you change to protect yourself from the Sun?' },
    ],
  },
  {
    title: { es: '🧩 Actividad sin pantalla: "Teléfono espacial"', en: '🧩 Screen-free activity: "Space phone"' },
    items: [
      { es: 'Dos equipos: uno es la Tierra y el otro es Marte. Marte tiene un problema (por ejemplo, "se rompió el filtro de aire") y solo puede hablar con la Tierra mediante notas.', en: 'Two teams: one is Earth, the other is Mars. Mars has a problem (for example, "the air filter broke") and can only talk to Earth with notes.' },
      { es: 'Cada nota tiene que esperar 20 segundos antes de entregarse (1 segundo = 1 minuto real). ¿Cuánto tardan en resolverlo? ¿Habría sido más rápido decidir solos?', en: 'Each note must wait 20 seconds before being delivered (1 second = 1 real minute). How long does it take to solve? Would deciding alone have been faster?' },
    ],
  },
  {
    title: { es: '🔢 Reto de matemáticas', en: '🔢 Math challenge' },
    items: [
      { es: 'La luz viaja a unos 300,000 km por segundo. Si Marte está a {km} millones de km, ¿cuántos segundos tarda un mensaje? ({km},000,000 ÷ 300,000 = ?) Pásalo a minutos dividiendo entre 60.', en: 'Light travels about 300,000 km per second. If Mars is {km} million km away, how many seconds does a message take? ({km},000,000 ÷ 300,000 = ?) Convert to minutes by dividing by 60.' },
    ],
  },
  {
    title: { es: '🛰️ Datos reales usados', en: '🛰️ Real data used' },
    items: [
      { es: 'NASA DONKI (llamaradas solares): el juego intenta traer la más fuerte del último mes. Si DONKI no responde, prueba con los satélites GOES de NOAA (últimos 7 días). Si no hay conexión, lo avisa y usa llamaradas reales guardadas de 2017 y 2024.', en: 'NASA DONKI (solar flares): the game tries to fetch the strongest flare of the last month. If DONKI does not answer, it tries the NOAA GOES satellites (last 7 days). With no connection, it says so and uses real stored flares from 2017 and 2024.' },
      { es: 'Radiación: Curiosity RAD en Marte (0.64 mSv/día) y Chang\'e 4 en la Luna (1.37 mSv/día). Comunicaciones: Deep Space Network de la NASA. Distancia a Marte: calculada con las órbitas aproximadas de JPL.', en: 'Radiation: Curiosity RAD on Mars (0.64 mSv/day) and Chang\'e 4 on the Moon (1.37 mSv/day). Communications: NASA Deep Space Network. Distance to Mars: calculated with JPL approximate orbits.' },
    ],
  },
];

const fillKm = (s: string, km: number) => s.replace(/\{km\}/g, String(km));

export default function TeacherGuide({ lang, marsKm, onBack, onPaper, labels }: {
  lang: Lang;
  marsKm: number;
  onBack: () => void;
  onPaper: () => void;
  labels: { title: string; print: string; back: string };
}) {
  return (
    <section className="cadet-print rounded-3xl border border-slate-700 bg-slate-900/80 p-5 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs font-black tracking-[0.3em] uppercase text-cyan-400">🚀 ASTROBASE CADET</p>
          <h2 className="text-2xl font-black text-white">{labels.title}</h2>
        </div>
        <div className="cadet-no-print flex gap-2">
          <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-xl text-sm font-black bg-amber-400 text-slate-950 hover:brightness-110">🖨️ {labels.print}</button>
          <button type="button" onClick={onPaper} className="px-3 py-2 rounded-xl text-sm font-black bg-cyan-400 text-slate-950 hover:brightness-110">✂️ {lang === 'es' ? 'Misión en papel' : 'Paper mission'}</button>
          <button type="button" autoFocus onClick={onBack} className="px-3 py-2 rounded-xl text-sm font-bold bg-slate-800 border border-slate-600 text-white hover:bg-slate-700">← {labels.back}</button>
        </div>
      </div>
      {SECTIONS.map(sec => (
        <div key={sec.title.es}>
          <h3 className="font-black text-white mb-1.5">{sec.title[lang]}</h3>
          <ul className="list-disc pl-5 space-y-1">
            {sec.items.map(it => (
              <li key={it.es} className="text-sm text-slate-200 leading-relaxed">{fillKm(it[lang], marsKm)}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-xs text-slate-400">Troncos Intergalácticos · NASA Space Apps Challenge · astrobase-cadet-y2hf.vercel.app</p>
    </section>
  );
}
