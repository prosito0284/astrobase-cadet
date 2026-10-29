# 🚀 ASTROBASE CADET: Simulador de Misiones para Jóvenes Astronautas
> **NASA Deep Space Mission Simulator for Young Astronauts (Ages 7–12)**  
> *Desarrollado con orgullo por el equipo:* **🌲 Troncos Intergalácticos**  
> *Para el Desafío: Simulador de misiones para astronautas jóvenes (NASA Space Apps Challenge)*

![Equipo](https://img.shields.io/badge/Equipo-Troncos_Intergal%C3%A1cticos-emerald?style=for-the-badge&logo=spacex)
![NASA STEM Sim](https://img.shields.io/badge/NASA_Open_Data-DONKI_%7C_OSDR_%7C_Artemis_%7C_MEDA-blue?style=for-the-badge&logo=nasa)
![Target Audience](https://img.shields.io/badge/Edades-7_a_12_a%C3%B1os_(STEM)-emerald?style=for-the-badge)
![Zero Install](https://img.shields.io/badge/Plataforma-Navegador_Web_(100%25_Offline)-purple?style=for-the-badge)

---

## 🌟 Resumen del Proyecto

**ASTROBASE CADET** es un simulador interactivo de supervivencia y gestión de bases espaciales diseñado específicamente para estudiantes de **7 a 12 años**, así como para docentes y familias. 

A diferencia de los juegos infantiles abstractos o excesivamente simplificados, ASTROBASE CADET pone a los jóvenes al mando de una base real en el **Polo Sur Lunar (Artemis III)** o en el **Cráter Jezero de Marte (Misión Ares)**, enfrentándolos a los mismos dilemas de ingeniería que los directores de vuelo de la NASA resuelven a diario:

- **Soporte Vital (ECLSS):** Electrólisis de agua y reciclaje de oxígeno vs acumulación de dióxido de carbono ($CO_2$).
- **Administración de Energía:** Paneles solares fotovoltaicos enfrentados a los **14 días de gélida noche lunar (-180 °C)** y a las **tormentas globales de polvo marciano** medidas por el rover Perseverance.
- **Protección contra la Radiación:** Alertas de fulguraciones solares clase X y eyecciones de masa coronal (CME) basadas en la base de datos **DONKI de la NASA**, que exigen decidir entre gastar batería en escudos electromagnéticos o blindar con regolito y agua rica en hidrógeno.
- **Producción de Alimentos:** Invernadero hidropónico espacial basado en los experimentos **OSDR OSD-379 (VEGGIE)** de la NASA (lechuga Outredgeous y mostaza Mizuna) para equilibrar calorías, salud psicológica y reciclaje de nutrientes.
- **Retrasos en las Comunicaciones (Velocidad de la Luz):** En la Luna la señal tarda **1.3 segundos**, pero en Marte la señal tarda entre **4 y 22 minutos** por viaje. Los cadetes aprenden por qué una tripulación marciana debe operar con **autonomía** sin poder esperar a que Houston responda en una emergencia.

---

## 🎯 ¿Cómo Resuelve los Requisitos del Desafío?

### 1. Público Objetivo y Accesibilidad (7 a 12 años)
- **Lenguaje claro y libre de tecnicismos intimidantes:** Todo concepto complejo (ej. regolito, $CO_2$, dosis de radiación en milisieverts, opacidad de polvo Tau) se explica con analogías claras dentro del juego.
- **Asistente de Vuelo Capcom NOVA:** Guía tutorial interactiva paso a paso diseñada para niños.
- **3 Niveles de Dificultad Dinámicos:**
  - 🚀 **Modo Cadete (7–9 años):** Asistencia guiada, avisos preventivos y consumo de soporte vital moderado.
  - 🛰️ **Modo Comandante (10–12 años):** Simulación balanceada donde cada decisión tiene consecuencias inmediatas y medibles.
  - 🔬 **Modo Científico NASA (Avanzado / Aulas STEM):** Acceso a telemetría cruda, curvas de radiación y calculadora interactiva de fotosíntesis y blindaje.
- **Zero Install, Zero Signup:** Corre directamente en cualquier navegador moderno en computadoras, tabletas o teléfonos.

### 2. Uso Auténtico de Datos Abiertos de la NASA
En lugar de inventar estadísticas o números arbitrarios, el juego integra datos reales documentados y verificables:

| Base de Datos NASA | Identificador Real | Aplicación en el Juego |
| :--- | :--- | :--- |
| **DONKI** *(Space Weather Database)* | `DONKI: CME-2024-05-10T07:24:00` | Evento de tormenta solar clase X con velocidad CME de 1.240 km/s y flujo de protones >100 MeV. Obliga a activar el refugio de tormenta. |
| **DONKI** *(SEP Flux Events)* | `DONKI: SEP-2023-07-18` | Partículas energéticas solares que penetran cascos no blindados; enseña la eficacia del agua y regolito como absorbedores de protones. |
| **OSDR** *(Open Science Data Repository)* | `OSDR Accession: OSD-379 / OSD-120` | Experimento VEGGIE en la ISS (mostaza Mizuna y lechuga bajo luces LED rojo/azul). Modela la tasa de fotosíntesis (1 m² absorbe 22g de CO2/día). |
| **OSDR** *(Human Research / Twins Study)* | `OSDR OSD-174 & NASA Twins Study` | Pérdida de 1.2% de densidad ósea mensual en baja gravedad (0.16g en Luna, 0.38g en Marte) y requerimiento de ejercicio vigoroso diario. |
| **Artemis III / LRO Diviner** | `LRO Diviner Lunar South Pole Data` | Temperaturas extremas en el cráter Shackleton (40 Kelvin / -246 °C) y depósitos de hielo al 5.5% en peso para In-Situ Resource Utilization (ISRU). |
| **Perseverance Mars 2020 (MEDA)** | `Mars 2020 MEDA Environmental Station` | Presión atmosférica marciana real de 610 Pa y eventos de polvo atmosférico (Tau = 2.1) que reducen la radiación solar incidente en más del 75%. |

### 3. Compromisos de Ingeniería Reales (Sin "Opciones Gratuitas")
Ninguna decisión es completamente segura ni gratuita:
- Si ahorras energía apagando los lechos de zeolita o la calefacción, la tripulación se congela o sube el $CO_2$.
- Si enciendes el escudo de regolito electromagnético contra una CME de DONKI, agotas las baterías de reserva que necesitas para sobrevivir a la noche polar.
- Si esperas instrucciones de Houston en Marte ante una fuga de electrólisis, la señal tarda 20 minutos de viaje ida y vuelta y la tripulación consume oxígeno de reserva mientras espera.
- Si mandas al rover a limpiar los paneles solares durante una tormenta de polvo marciana, desgastas el vehículo y arriesgas la salud de los tripulantes exteriores.

---

## 🛠️ Tecnologías y Arquitectura

- **Framework:** React 19 + TypeScript (Strict Type Safety).
- **Herramienta de Construcción:** Vite 8 (Ultra-rápido, compila en menos de 1 segundo).
- **Estilos:** Tailwind CSS v4 (Interfaz espacial moderna, responsiva, con modo de alto contraste para niños).
- **Motor de Audio:** Web Audio API Sintetizado (Efectos de sonido 100% integrados sin descargas de audio externas que puedan fallar).
- **Iconografía:** Lucide React.
- **Celebraciones & Logros:** Canvas Confetti.
- **Certificación Oficial:** Generador de Informe de Misión y Certificado Imprimible / Exportable a PDF.

---

## 🚀 Cómo Ejecutar el Proyecto Localmente

### Requisitos Previos
- Node.js versión 18 o superior (`v20+` recomendado).
- Gestor de paquetes `npm`.

### Pasos de Instalación

1. Clona o abre el repositorio en tu computadora:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd kind-hawking
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
   Abre en tu navegador la dirección indicada (usualmente `http://localhost:5173`).

4. Para compilar la versión de producción optimizada:
   ```bash
   npm run build
   npm run preview
   ```

---

## 👩‍🏫 Guía para Docentes y Salón de Clases (Alineación STEM / NGSS)

ASTROBASE CADET se diseñó para apoyar los estándares de educación científica **Next Generation Science Standards (NGSS)**:
- **MS-ESS1-3 (Earth’s Place in the Universe):** Comprender los ciclos día/noche en otros cuerpos celestes (Luna = 28 días terrestres, Marte = 24.6 horas).
- **MS-PS3-3 (Energy):** Minimizar y maximizar la transferencia térmica en ambientes extremos (-180 °C a +120 °C).
- **MS-LS1-5 (From Molecules to Organisms):** Fotosíntesis vegetal en ambientes cerrados y reciclaje de oxígeno por transpiración vegetal.
- **MS-ETS1-2 (Engineering Design):** Evaluar soluciones de ingeniería basadas en restricciones y recursos limitados.

---

## 📜 Licencia y Créditos
- Desarrollado como solución al desafío de educación espacial para astronautas jóvenes.
- Datos científicos abiertos cortesía de la **NASA** (*Goddard Space Flight Center, Ames Research Center, Jet Propulsion Laboratory*).
- Software distribuido bajo la licencia MIT.
