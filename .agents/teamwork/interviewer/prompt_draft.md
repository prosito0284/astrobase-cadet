Actúa como un equipo de QA de seguridad y arquitectura de software. Auditar toda la lógica de la aplicación Astrobase Cadet para encontrar y parchear cualquier exploit o bug que permita ganar, avanzar o acumular puntos o recursos más rápido de lo planeado.

Working directory: c:\Users\crist\Documents\antigravity\kind-hawking
Integrity mode: development

## Requirements

### R1. Auditoría y Detección de Vulnerabilidades de Progreso Rápido
Analizar toda la lógica de la aplicación en el directorio `src/` (incluyendo `src/App.tsx`, modales y minijuegos clave como `BotanicalLabModal.tsx`, `RoverMissionModal.tsx`, `NasaQuizModal.tsx`, `WiringMiniGameModal.tsx`, `CommMiniGameModal.tsx`, `IceMineModal.tsx`, `PopulationExpansionModal.tsx`, `MissionReportModal.tsx`, y datos en `src/data/`) en busca de:
- Condiciones de carrera (race conditions), spam de clics o eventos duplicados que sumen recompensas múltiples veces.
- Manipulación de estado en el cliente, variables expuestas en consola o falta de validación de límites.
- Errores en temporizadores (cooldowns), deltas de tiempo mal calculados o multiplicadores que escalen sin tope.
- Saltos de flujo (posibilidad de reclamar premios o avanzar fases sin cumplir las condiciones previas).

### R2. Implementación de Parches y Validaciones Estrictas
Implementar directamente en el código las correcciones necesarias asegurando que todas las validaciones de estado, cooldowns, precondiciones de avance y límites de recursos sean estrictas e imposibles de evadir mediante spam de clics o llamadas repetidas.

### R3. Rendimiento, Limpieza de Código y Balance
Aplicar mejoras de rendimiento, limpieza de código y balance en las funciones y componentes afectados por las correcciones.

### R4. Informe Detallado de Seguridad
Generar y entregar un reporte exhaustivo guardado en `AUDIT_SECURITY_REPORT.md` en la raíz del proyecto que documente:
- Lista detallada de todos los exploits y bugs detectados.
- Mecanismo o vector mediante el cual podían ser aprovechados.
- Solución técnica aplicada en cada archivo (especificando archivos modificados y lógica corregida).
- Mejoras de rendimiento, limpieza y balance implementadas.

## Acceptance Criteria

### Mitigación de Exploits y Lógica de Juego
- [ ] El spam de clics o eventos concurrentes en minijuegos, expediciones y reclamos de recursos (como cultivos, rover, quiz, cableado, minería criogénica y antena) no genera recompensas duplicadas ni acelera el progreso.
- [ ] Todos los cooldowns, temporizadores y transiciones de fase requieren que se cumplan estrictamente las condiciones previas antes de otorgar puntos, recursos o permitir avanzar.
- [ ] Los acumuladores, multiplicadores y recursos cuentan con topes máximos y validación de límites para evitar desbordamientos o incrementos no autorizados.

### Calidad e Integridad de Código
- [ ] `npm run build` compila limpiamente sin errores de TypeScript o Vite.
- [ ] `npm run lint` pasa sin advertencias ni errores en los archivos modificados.
- [ ] Las correcciones y mejoras aplicadas preservan el funcionamiento normal y la jugabilidad de la simulación STEM.

### Documentación y Verificación
- [ ] Existe el archivo `AUDIT_SECURITY_REPORT.md` en la raíz del proyecto conteniendo el análisis detallado de cada vulnerabilidad, el vector de ataque/aprovechamiento, la solución técnica aplicada por archivo y las mejoras de rendimiento/balance.
- [ ] Se incluyen y ejecutan scripts o pruebas automatizadas de verificación que demuestran que las vulnerabilidades detectadas han quedado resueltas y los límites se aplican correctamente.
