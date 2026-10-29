# 🌍 EarthTrend Detective: NASA Environmental Trend & Climate Analytics

> **Prototipo científico y estadístico interactivo para el reto de detección, descomposición estacional y validación de significancia de tendencias en variables geofísicas de la Tierra.**
> Desarrollado bajo estándares de la NASA para la comunidad científica, educativa y de ciencia ciudadana.

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)
![Streamlit](https://img.shields.io/badge/Streamlit-1.35%2B-FF4B4B?style=for-the-badge&logo=streamlit)
![Plotly](https://img.shields.io/badge/Plotly-Interactive_Graphs-3F4F75?style=for-the-badge&logo=plotly)
![NASA POWER](https://img.shields.io/badge/NASA-POWER_API_In_Vivo-0B3D91?style=for-the-badge&logo=nasa)
![SciPy](https://img.shields.io/badge/SciPy-Mann--Kendall_%26_OLS-8CAAE6?style=for-the-badge&logo=scipy)

---

## 🌟 Resumen del Sistema

**EarthTrend Detective** es una estación de trabajo analítica full-stack que permite a estudiantes, investigadores y tomadores de decisiones investigar qué está cambiando en la Tierra, a qué ritmo y si las alteraciones observadas son estadísticamente significativas o mero ruido de la variabilidad climática natural.

El sistema combina:
1. **Conexión en vivo con la API abierta de NASA POWER** (`https://power.larc.nasa.gov/api/temporal/monthly/point`), sin necesidad de API Key.
2. **Motor de Respaldo Físico Hiperrealista (Fallback):** Generador climatológico basado en física de reanálisis (MERRA-2, GLDAS, GPM, MODIS y OMI) para asegurar un funcionamiento al 100% incluso en entornos offline o ante fallos de conectividad.
3. **Desestacionalización Rigurosa:** Cálculo de anomalías climatológicas restando el promedio multianual de cada mes, revelando la verdadera tendencia secular que el ciclo verano/invierno suele ocultar.
4. **Validación Estadística Dual:**
   - **Regresión OLS** con pendiente anual y decenal, estadístico $t$ e **Intervalo de Confianza al 95%** (banda de predicción hiperbólica).
   - **Test No Paramétrico de Mann-Kendall** con estadístico $Z$, $\tau$ de Kendall, varianza con corrección de empates y pendiente de Sen (*Sen's Slope*).
5. **Informe Automático del Detective:** Narrativa pedagógica generada dinámicamente que traduce los números a un diagnóstico comprensible para estudiantes de preparatoria y universidad.

---

## 🏗️ Arquitectura de Archivos

```
kind-hawking/
├── requirements.txt      # Dependencias exactas (Streamlit, Plotly, Folium, SciPy, Statsmodels, etc.)
├── data_engine.py       # Cliente NASA POWER API + generador físico sintético de reanálisis
├── stats_engine.py      # Motor matemático (anomalías, OLS, Mann-Kendall, CI 95%, diagnósticos)
├── app.py               # Interfaz de usuario Streamlit con tema espacial NASA y mapa Folium
└── README.md            # Documentación completa y guía de ejecución
```

---

## 🔬 Catálogo de Variables y Glosario Científico

| Código | Variable Ambiental | Instrumento / Modelo de Origen | Unidad | Relevancia en el Sistema Tierra |
| :--- | :--- | :--- | :--- | :--- |
| **`T2M`** | Temperatura Superficial del Aire a 2m | **Reanálisis MERRA-2** (GMAO / NASA) | °C | Pulso térmico fundamental del calentamiento global antropogénico y estrés térmico biológico. |
| **`PRECTOTCORR`** | Precipitación Total Corregida | **Misión Satelital GPM & MERRA-2** | mm/día | Regula el agua dulce, recarga de acuíferos y balance hidrológico. Muestra la intensificación de sequías e inundaciones. |
| **`GWETROOT`** | Humedad del Suelo en Zona Radicular | **Modelo GLDAS** (NASA GSFC) | Fracción (0 a 1) | Indicador crítico de sequía agrícola, absorción radicular de la vegetación y riesgo de megaincendios forestales. |
| **`MODIS_NDVI`** | Índice de Vegetación (NDVI) | **Sensor MODIS** (Satélites Terra y Aqua) | Índice (-0.1 a 1) | Mide el vigor fotosintético y densidad de clorofila. Detecta deforestación, degradación del dosel y reverdecimiento. |
| **`EVPTRNS`** | Evapotranspiración / Flujo de Vapor | **GLDAS & Sonda AIRS** (Satélite Aqua) | mm/día | Puente de vapor de agua y calor latente entre biosfera y atmósfera; motor de los 'ríos voladores' continentales. |
| **`TO3`** | Columna Total de Ozono Atmosférico | **Instrumento OMI** (Satélite Aura) / MERRA-2 | Unidades Dobson (DU) | Escudo planetario contra la radiación UV-B solar. Monitorea la recuperación de la estratósfera post-Montreal. |

---

## 🕵️ Casos de Demostración Preconfigurados ("Modo Detective")

La aplicación incluye un selector rápido de tres escenarios paradigmáticos con hipótesis científicas precargadas:

### Caso A: Mismo Forzamiento, Tendencias Opuestas
- **Región:** Desierto de Chihuahua / Norte de México (Lat: 28.63, Lon: -106.08) vs. Zona Monzónica Tropical (Sudeste Asiático).
- **Enigma:** El calentamiento global intensifica el ciclo hidrológico de forma asimétrica: las regiones áridas subtropicales se vuelven aún más secas ($\Delta\text{GWETROOT} < 0$), mientras que zonas tropicales experimentan eventos pluviométricos extremos.

### Caso B: Deforestación y Clima en la Amazonía
- **Región:** Rondônia / Cuenca Sur de la Amazonía (Lat: -10.85, Lon: -61.95).
- **Enigma:** En el 'Arco de Deforestación', la pérdida de cobertura selvática reduce el reciclaje de humedad radicular y el verdor biológico ($\text{NDVI}$ y $\text{GWETROOT}$ con pendientes negativas estadísticamente significativas con $p < 0.001$).

### Caso C: Isla de Calor Urbana y Atmósfera
- **Región:** Megaciudad del Valle de México / CDMX (Lat: 19.43, Lon: -99.13).
- **Enigma:** La acelerada urbanización y sustitución de cubierta vegetal por asfalto/concreto genera una tasa de calentamiento local de más de $+0.35$ a $+0.45\text{ °C}$ por década, superando con creces la tasa media planetaria.

---

## 📊 Metodología Científica y Motor Estadístico

### 1. Desestacionalización (Anomalías Climatológicas)
Para cada mes $m \in \{1, \dots, 12\}$, se calcula el promedio histórico multianual $\bar{y}_m$:
$$\bar{y}_m = \frac{1}{K} \sum_{k=1}^K y_{m, k}$$
La anomalía climática de cada observación $t$ se obtiene sustrayendo su climatología:
$$y_{\text{anom}}(t) = y(t) - \bar{y}_{\text{mes}(t)}$$
Esto elimina la oscilación de 12 meses provocada por la inclinación orbital terrestre, permitiendo evaluar la pendiente real secular.

### 2. Regresión Lineal por Mínimos Cuadrados Ordinarios (OLS)
Ajuste de la recta:
$$\hat{y}(t) = \beta_0 + \beta_1 t$$
- **Tasa Anual:** $\beta_1$ en unidades / año.
- **Tasa por Década:** $10 \times \beta_1$ en unidades / década.
- **Estadístico $t$ de Student:**
  $$t = \frac{\beta_1}{SE(\beta_1)}, \quad df = n - 2$$

### 3. Banda de Intervalo de Confianza al 95%
Para cada punto temporal $t_0$, la incertidumbre de la recta media se calcula como:
$$SE(\hat{y}(t_0)) = s_e \sqrt{\frac{1}{n} + \frac{(t_0 - \bar{t})^2}{\sum_{i=1}^n (t_i - \bar{t})^2}}$$
$$\text{IC}_{95\%} = \hat{y}(t_0) \pm t_{0.975, n-2} \cdot SE(\hat{y}(t_0))$$

### 4. Test No Paramétrico de Mann-Kendall
Prueba de tendencia monótona independiente de supuestos de normalidad:
$$S = \sum_{k=1}^{n-1} \sum_{j=k+1}^n \text{sgn}(x_j - x_k)$$
$$Z = \begin{cases} \frac{S-1}{\sqrt{\text{Var}(S)}} & S > 0 \\ 0 & S = 0 \\ \frac{S+1}{\sqrt{\text{Var}(S)}} & S < 0 \end{cases}$$
$$p = 2 \times [1 - \Phi(|Z|)]$$
- **Veredicto:** Si $p < 0.05$ (o $p < 0.001$), se rechaza formalmente la hipótesis nula de ausencia de tendencia forzada.

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- Python 3.10 o superior instalado.
- Conexión a Internet (opcional; el sistema incluye generador de respaldo automático).

### 1. Clonar el Repositorio o Entrar al Directorio
```bash
cd kind-hawking
```

### 2. Crear y Activar un Entorno Virtual (Recomendado)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar Dependencias
```bash
pip install -r requirements.txt
```

### 4. Ejecutar la Aplicación Streamlit
```bash
streamlit run app.py
```

La interfaz se abrirá automáticamente en tu navegador web en:
`http://localhost:8501`

---

## 🧪 Verificación Automática del Sistema

Puedes verificar en cualquier momento la integridad de los motores matemáticos y de datos ejecutando:
```bash
python -c "import data_engine as de, stats_engine as se; df, _ = de.fetch_nasa_power_data('T2M', 19.43, -99.13, 2000, 2024); anom, _ = se.calculate_climatology_and_anomalies(df); ols = se.compute_linear_trend(anom, 'anomaly'); print('Rate/decade:', ols['slope_per_decade'], 'p-value:', ols['p_value_ols'])"
```

---

## 🛡️ Atribución y Licencia

- **Datos y Modelos:** NASA Langley Research Center POWER Project, GMAO MERRA-2, NASA/JAXA GPM Mission, NASA GSFC GLDAS y NASA MODIS Science Team.
- **Licencia:** Open Source bajo MIT License para fines educativos, científicos y de divulgación.
