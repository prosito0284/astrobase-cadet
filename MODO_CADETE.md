# ASTROBASE CADET — Modo Cadete (7–12 años)

Respuesta al reto **NASA Space Apps: Build a Junior Astronaut Mission Trainer**.

## Cómo se juega

- 10 días, 4 astronautas, base en la **Luna** (polo sur) o en **Marte** (cráter Jezero).
- Solo **3 recursos**: 🫁 Aire, ⚡ Energía y 🛡️ Escudo. La ❤️ salud del equipo es la consecuencia.
- Cada día llega **una tarjeta con dos opciones**. Ninguna es gratis: cada una cuesta aire, energía, escudo o salud, o renuncia a un descubrimiento.
- Los días 1, 4, 7 y 10 (☀️ en el calendario) llega una **tormenta solar real**. Subir el escudo cuesta 30 de energía; no subirlo hace daño según la fuerza real de la llamarada.
- **No se puede gastar energía que no hay**: si falta energía, la acción solo funciona en proporción.
- Antes de elegir se muestra el costo de cada opción, incluido el daño que haría la tormenta.
- Después de cada día se explica qué cambió y por qué, con una línea de **"Esto pasó de verdad"** y su fuente.
- Hay **19 tarjetas** (13 para la Luna y 13 para Marte). Cada partida usa 6, en un orden distinto cada vez. Perder no castiga: da una pista y permite volver a intentar.
- Bilingüe (ES/EN), con lectura en voz alta y un glosario de palabras difíciles. No necesita cuenta ni descarga.
- Debajo de las barras se ve lo que pasa **cada día, pase lo que pase**: el aire que se respira y la energía que dan los paneles menos la que gastan las máquinas. Así el niño puede planear.
- Un **doble toque** rápido en "Siguiente día" no elige sin querer la opción que aparece debajo del dedo.
- **🌕🔴 ¿Luna o Marte?:** antes de elegir, una tabla compara la distancia (la de Marte calculada para hoy), el retraso de los mensajes, el viaje, la gravedad, la duración del día, el aire y la radiación. Incluye la calculadora "¿cuánto pesarías?". La gravedad viene de NASA: 1/6 en la Luna y 38 % en Marte (100 → 38). El peso no se guarda.
- **🗣️ Lectura automática:** al activarla, el juego lee en voz alta cada tarjeta y cada reporte apenas aparecen. Pensado para niñas y niños de 7–8 años que todavía leen despacio.
- **Palabras difíciles tocables:** dentro de las tarjetas y de "Esto pasó de verdad", palabras como *radiación*, *escudo*, *llamarada* o *mSv* aparecen subrayadas, y al tocarlas se abre su explicación.
- **☀️ Tema claro para proyectores:** los proyectores "lavan" los fondos oscuros. Este tema reasigna los colores de Tailwind solo dentro del juego, y pasó la auditoría axe con 0 fallas de contraste, igual que el tema oscuro.
- **🏫 Modo clase (proyector):** agranda toda la letra y agrega a cada tarjeta una votación A/B con "Decidir por mayoría". Si hay empate, pide que la clase lo discuta.
- **Códigos de misión para clases:** cada partida tiene un código (por ejemplo `LN-48213`: Luna, Normal, número 48213). Quien lo escriba al inicio, o abra `?mision=LN-48213`, juega exactamente la misma misión, así la clase puede comparar decisiones. Con código no se usa la tormenta en vivo, para que todos tengan lo mismo.
- **Aviso de tormenta:** el día anterior a cada ☀️ el juego avisa cuánta energía cuesta subir el escudo y cuánta tienes.
- **Cambios visibles:** después de cada día, cada barra muestra cuánto subió o bajó (+14, −6…).
- **Dos niveles:**
  - **🌱 Fácil (7–9 años):** se empieza con un poco más de energía y escudo, y el botón **🎧 Pedir ayuda a Control de Misión** recomienda una opción. La pista sale de una búsqueda completa de todos los días que faltan, así que seguirla siempre gana (está probado en los tests).
  - **🚀 Normal (10–12 años):** sin pistas.

  Las tormentas hacen el mismo daño en los dos niveles, así que ignorarlas siempre termina mal.
- La primera partida empieza con un **tutorial guiado** de 3 pasos. Se puede repetir con el botón **❓ Cómo jugar**.
- Al terminar, el niño puede escribir su nombre e **imprimir un diploma** con su medalla, sus descubrimientos y la radiación recibida. El nombre solo se guarda en ese equipo.
- **Accesibilidad:** las barras y el calendario tienen etiquetas para lectores de pantalla y el foco del teclado se ve claramente. `Esc` cierra las ventanas, y si el sistema pide menos movimiento se quitan las animaciones.
- **"¿Cómo está el Sol ahora?":** una gráfica en vivo de los rayos X del Sol en las últimas 24 h, medidos por los satélites GOES, con las clases A, B, C, M y X. Se puede tocar para ver cada hora, y dice cuánta salud quitaría en tu base la llamarada más fuerte del día si no tuvieras escudo.
- **Dibujo de la base:** cambia con tus barras. La cúpula se ve más fuerte con más escudo, el invernadero brilla con más aire, los paneles se iluminan con más energía y las caras de la tripulación muestran su salud. En los días de tormenta aparece el Sol con rayos.
- **"Tu radiación día a día":** al final aparece una gráfica de barras con la dosis de cada día. Los días ☀️ se marcan con color y con el ícono, y se puede tocar una barra para ver su dosis, sus radiografías y el escudo de ese día. Así se ve que un escudo alto deja la barra más baja.
- **"¿Y si hubieras elegido otra cosa?":** al final, el juego repite tu misión exacta cambiando una sola decisión y te muestra la que más habría cambiado el resultado. Por ejemplo: *"El Día 1 elegiste «Ahorrar energía». Si hubieras elegido «Subir el escudo»… ¡habrías ganado la misión!"*. Usa el mismo criterio que la pista de Control de Misión, y los tests comprueban que una misión perfecta no tiene un cambio mejor.
- **Despegue:** al empezar hay una cuenta regresiva (3, 2, 1) y un dato real del viaje: unos 3 días a la Luna con Apolo y casi 7 meses a Marte con Perseverance. Se puede saltar.
- **Bitácora del cadete:** al final aparece un cuestionario de hasta 3 preguntas sobre las tarjetas jugadas en esa misión (más una de tormentas). Cada pregunta sale del dato real que el niño acaba de leer. Al contestar se ve cuál era la correcta, y acertar todas da la insignia 🧠 Sabelotodo espacial.
- **7 insignias coleccionables**, guardadas solo en ese equipo. Las que faltan dicen cómo ganarlas, y los tests comprueban que todas se pueden conseguir.
- **Simulador de señal:** en las tarjetas de comunicación el niño envía un mensaje y lo ve viajar a la velocidad de la luz: 1.3 s en tiempo real a la Luna, y acelerado (1 s = 1 min) a Marte, usando la distancia calculada para el día de hoy.
- **Récords Luna vs Marte:** al terminar se ven partidas, victorias, mejor medalla y menor radiación en cada sitio, para que el niño quiera probar el otro.
- **✂️ Misión en papel** (desde la guía para maestros): reglas, tabla de llamaradas, hoja de registro y todas las tarjetas recortables, para jugar sin computadoras. Ocupa 4 hojas. Los números salen del mismo motor, y un test juega 160 misiones solo con las reglas impresas y comprueba que dan exactamente lo mismo que el juego, día por día. Ese test encontró y corrigió un error de redondeo del juego (15 × 10 ÷ 100 = 1.5 daba 1 en vez de 2).
- **Guía para maestros y familias:** es imprimible e incluye objetivos, preguntas para conversar, una actividad sin pantalla ("Teléfono espacial") y un reto de matemáticas con la distancia a Marte de hoy.
- **Funciona sin internet:** después de abrirlo una vez, un *service worker* guarda el juego en el navegador, incluido el Modo Experto. Con cada visita con internet se actualiza y borra los archivos de versiones viejas. Los datos en vivo nunca se guardan: si no hay red, el juego lo dice.
- **Sonidos** cortos generados en el navegador (sin archivos), con volumen bajo y botón 🔊/🔇.
- **Compartir:** el botón 📣 comparte (o copia) el resultado y el enlace. No incluye el nombre ni otros datos personales. El enlace muestra una imagen de vista previa (`public/og.png`).
- **A prueba de errores:**
  - Una partida guardada dañada o de una versión vieja se descarta (`isValidSave`, con tests) en vez de romper el juego.
  - Si algo falla al dibujar, aparece "¡Uy! Perdimos la señal" con un botón para empezar de nuevo, y los récords no se pierden.
- **Accesibilidad verificada:** pasé la auditoría automática **axe-core** (WCAG 2.1 A/AA y buenas prácticas) por cada pantalla: inicio, tarjeta con tutorial, reporte, fuentes, final con cuestionario e insignias, diploma y guía. Dio **0 fallas**.
- **Teclado:** **A**/**1** elige la opción A y **B**/**2** la opción B. `Esc` cierra ventanas.
- **Carga rápida:** el Modo Cadete descarga unos 280 KB. El Modo Experto (Three.js, alrededor de 1 MB) solo se descarga si alguien lo abre.

## Datos de la NASA usados

| Dato | Cómo se usa | En vivo o guardado |
|---|---|---|
| **DONKI — Solar Flares (FLR)** | La llamarada más fuerte de los últimos 30 días se convierte en la primera tormenta. Su clase (M, X…) decide cuánto daño hace. | **En vivo** (`api.nasa.gov/DONKI/FLR`). Si no responde en 6 s, se pasa a NOAA SWPC. |
| **NOAA SWPC — GOES X-ray flux (24 h)** | La gráfica "¿Cómo está el Sol ahora?" y la clase de llamarada de cada momento. | **En vivo** (`xrays-1-day.json`). Si falla, el panel no aparece. |
| **NOAA SWPC — GOES X-ray flares** (respaldo) | Si DONKI falla, la llamarada más fuerte de los últimos 7 días medida por los satélites GOES. Si fue pequeña, el juego dice que el Sol estuvo tranquilo. | **En vivo** (`services.swpc.noaa.gov`). Si tampoco responde, el juego lo dice y usa datos guardados. |
| 6 llamaradas clase X reales (2017 y 2024) | El resto de las tormentas. | Guardado |
| Curiosity RAD (Marte 0.64 mSv/día) · Chang'e 4 LND (Luna 1.37 mSv/día) | La radiación diaria de fondo, reducida por el escudo, y su equivalente en radiografías. | Guardado |
| ISS ECLSS (98 % del agua recuperada) · Phoenix (percloratos) · InSight (polvo en los paneles) · Perseverance · Orbital Debris Program Office (escudos Whipple) | Las tarjetas nuevas de agua, polvo salado, paneles con polvo, viaje en rover y piedritas espaciales. | Guardado |
| Sismos lunares de Apolo (hasta 5.5, más de 10 min) · LRO (estudia la Luna desde 2009) · Ingenuity (primer vuelo con motor en otro planeta, 72 vuelos) | Tarjetas de sismo lunar, mapas desde la órbita y helicóptero. | Guardado |
| OSDR · Veggie · Human Research Program | El costo de los experimentos, de las plantas y del ejercicio (pérdida ósea de 1–1.5 % al mes). | Guardado |
| **JPL — elementos orbitales aproximados** | La distancia Tierra–Marte de hoy y el retraso del mensaje. Error menor al 5 % (probado contra los acercamientos de 2003, 2020 y 2025). | **Calculado** con la fecha de hoy. No es un dato en vivo, y el juego lo dice. |
| MOXIE · Opportunity · LCROSS · Artemis · DSN | Las tarjetas de oxígeno marciano, tormenta de polvo, hielo lunar, noche lunar y retraso de las comunicaciones (1.3 s a la Luna, de 3 a 22 min a Marte según dónde esté). | Guardado |

Dentro del juego, el botón **"¿De dónde salen los datos?"** muestra esta misma lista con sus enlaces.

## Código

- `npm test`: pruebas del motor, los datos, los códigos, las insignias, el cuestionario, etc.
- `npm run build && npm run smoke`: abre Chrome sin ventana y juega una misión completa (inicio, 10 días, final, cuestionario, diploma, guía, código de misión y modo sin internet). Falla si algo no aparece o si hay errores en la consola.

- `src/cadet/engine.ts` — Motor puro y determinista (con semilla).
- `src/cadet/data.ts` — Datos curados con sus fuentes.
- `src/cadet/orbit.ts` — Distancia Tierra–Marte (ecuación de Kepler).
- `src/cadet/records.ts` — Récords locales.
- `src/cadet/CadetGame.tsx` — Pantallas y estado del juego.
- `src/cadet/widgets.tsx`, `BaseScene.tsx`, `SunPanel.tsx`, `DoseChart.tsx`, `LaunchOverlay.tsx`, `TeacherGuide.tsx` — Piezas visuales.
- `src/cadet/strings.ts` — Todos los textos en español e inglés.
- `src/cadet/storage.ts` y `speech.ts` — Guardado en el navegador y lectura en voz alta.
- `src/cadet/quiz.ts`, `badges.ts`, `records.ts`, `missionCode.ts`, `spaceweather.ts` — Cuestionario, insignias, récords, códigos de misión y clima espacial (lógica pura, con tests).
- `tests/cadet_engine.test.ts` — Tests. Comprueban, entre otras cosas, que ninguna opción es gratis, que siempre existe una forma de ganar (búsqueda completa) y que ignorar todas las tormentas siempre termina mal.

El Modo Experto también se auditó con axe en 8 pantallas: inicio, quiz, logros, datos NASA, gabinete, expansión, vista 2D y siguiente día. Se corrigieron 16 botones de cerrar sin nombre, 2 controles deslizantes sin etiqueta, textos con poco contraste y un hook de React condicional en la ventana del rover. Ahora da 0 fallas.

El juego completo anterior sigue disponible como **Modo Experto** (botón arriba, o `?modo=experto`).
