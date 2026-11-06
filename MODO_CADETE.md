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
- El orden de las tarjetas cambia en cada partida. Perder no castiga: da una pista y permite volver a intentar.
- Bilingüe (ES/EN), con lectura en voz alta y un glosario de palabras difíciles. No necesita cuenta ni descarga.
- La primera partida empieza con un **tutorial guiado** de 3 pasos. Se puede repetir con el botón **❓ Cómo jugar**.
- Al terminar, el niño puede escribir su nombre e **imprimir un diploma** con su medalla, sus descubrimientos y la radiación recibida. El nombre solo se guarda en ese equipo.
- **Accesibilidad:** las barras y el calendario tienen etiquetas para lectores de pantalla y el foco del teclado se ve claramente. `Esc` cierra las ventanas, y si el sistema pide menos movimiento se quitan las animaciones.
- **Carga rápida:** el Modo Cadete descarga unos 280 KB. El Modo Experto (Three.js, alrededor de 1 MB) solo se descarga si alguien lo abre.

## Datos de la NASA usados

| Dato | Cómo se usa | En vivo o guardado |
|---|---|---|
| **DONKI — Solar Flares (FLR)** | La llamarada más fuerte de los últimos 30 días se convierte en la primera tormenta. Su clase (M, X…) decide cuánto daño hace. | **En vivo** (`api.nasa.gov/DONKI/FLR`). Si no responde en 7 s, el juego lo dice y usa datos guardados. |
| 6 llamaradas clase X reales (2017 y 2024) | El resto de las tormentas. | Guardado |
| Curiosity RAD (Marte 0.64 mSv/día) · Chang'e 4 LND (Luna 1.37 mSv/día) | La radiación diaria de fondo, reducida por el escudo, y su equivalente en radiografías. | Guardado |
| OSDR · Veggie · Human Research Program | El costo de los experimentos, de las plantas y del ejercicio (pérdida ósea de 1–1.5 % al mes). | Guardado |
| MOXIE · Opportunity · LCROSS · Artemis · DSN | Las tarjetas de oxígeno marciano, tormenta de polvo, hielo lunar, noche lunar y retraso de las comunicaciones (1.3 s a la Luna, de 4 a 24 min a Marte). | Guardado |

Dentro del juego, el botón **"¿De dónde salen los datos?"** muestra esta misma lista con sus enlaces.

## Código

- `src/cadet/engine.ts` — Motor puro y determinista (con semilla).
- `src/cadet/data.ts` — Datos curados con sus fuentes.
- `src/cadet/CadetGame.tsx` — Interfaz.
- `tests/cadet_engine.test.ts` — Tests. Comprueban, entre otras cosas, que ninguna opción es gratis, que siempre existe una forma de ganar (búsqueda completa) y que ignorar todas las tormentas siempre termina mal.

El juego completo anterior sigue disponible como **Modo Experto** (botón arriba, o `?modo=experto`).
