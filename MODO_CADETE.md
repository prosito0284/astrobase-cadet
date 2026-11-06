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
- Hay **16 tarjetas** (11 para la Luna y 12 para Marte). Cada partida usa 6, en un orden distinto cada vez. Perder no castiga: da una pista y permite volver a intentar.
- Bilingüe (ES/EN), con lectura en voz alta y un glosario de palabras difíciles. No necesita cuenta ni descarga.
- Debajo de las barras se ve lo que pasa **cada día, pase lo que pase**: el aire que se respira y la energía que dan los paneles menos la que gastan las máquinas. Así el niño puede planear.
- Un **doble toque** rápido en "Siguiente día" no elige sin querer la opción que aparece debajo del dedo.
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
- **Bitácora del cadete:** al final aparece un cuestionario de hasta 3 preguntas sobre las tarjetas jugadas en esa misión (más una de tormentas). Cada pregunta sale del dato real que el niño acaba de leer. Al contestar se ve cuál era la correcta, y acertar todas da la insignia 🧠 Sabelotodo espacial.
- **7 insignias coleccionables**, guardadas solo en ese equipo. Las que faltan dicen cómo ganarlas, y los tests comprueban que todas se pueden conseguir.
- **Simulador de señal:** en las tarjetas de comunicación el niño envía un mensaje y lo ve viajar a la velocidad de la luz: 1.3 s en tiempo real a la Luna, y acelerado (1 s = 1 min) a Marte, usando la distancia calculada para el día de hoy.
- **Récords Luna vs Marte:** al terminar se ven partidas, victorias, mejor medalla y menor radiación en cada sitio, para que el niño quiera probar el otro.
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
| OSDR · Veggie · Human Research Program | El costo de los experimentos, de las plantas y del ejercicio (pérdida ósea de 1–1.5 % al mes). | Guardado |
| **JPL — elementos orbitales aproximados** | La distancia Tierra–Marte de hoy y el retraso del mensaje. Error menor al 5 % (probado contra los acercamientos de 2003, 2020 y 2025). | **Calculado** con la fecha de hoy. No es un dato en vivo, y el juego lo dice. |
| MOXIE · Opportunity · LCROSS · Artemis · DSN | Las tarjetas de oxígeno marciano, tormenta de polvo, hielo lunar, noche lunar y retraso de las comunicaciones (1.3 s a la Luna, de 3 a 22 min a Marte según dónde esté). | Guardado |

Dentro del juego, el botón **"¿De dónde salen los datos?"** muestra esta misma lista con sus enlaces.

## Código

- `src/cadet/engine.ts` — Motor puro y determinista (con semilla).
- `src/cadet/data.ts` — Datos curados con sus fuentes.
- `src/cadet/orbit.ts` — Distancia Tierra–Marte (ecuación de Kepler).
- `src/cadet/records.ts` — Récords locales.
- `src/cadet/CadetGame.tsx` y `src/cadet/TeacherGuide.tsx` — Interfaz.
- `tests/cadet_engine.test.ts` — Tests. Comprueban, entre otras cosas, que ninguna opción es gratis, que siempre existe una forma de ganar (búsqueda completa) y que ignorar todas las tormentas siempre termina mal.

El juego completo anterior sigue disponible como **Modo Experto** (botón arriba, o `?modo=experto`).
