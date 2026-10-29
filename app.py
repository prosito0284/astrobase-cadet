"""
app.py - Interfaz Principal de EarthTrend Detective
===================================================
Aplicación interactiva de detección de tendencias climáticas basada en datos
satelitales y reanálisis de la NASA.
Desarrollada con Streamlit, Plotly, Folium, SciPy y Statsmodels.
"""

from __future__ import annotations
import math
import re
from typing import Dict, Any, Tuple, Optional
import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import folium
from folium import plugins
from streamlit_folium import st_folium

import data_engine as de
import stats_engine as se

# =====================================================================
# CONFIGURACIÓN DE PÁGINA STREAMLIT
# =====================================================================
st.set_page_config(
    page_title="EarthTrend Detective | NASA Climate Analytics",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded",
)

# =====================================================================
# ESTILOS CSS PERSONALIZADOS (TEMA ESPACIAL / CIENTÍFICO NASA)
# =====================================================================
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

    .stApp {
        background: radial-gradient(circle at 15% 10%, #0d1a36 0%, #070c17 45%, #04070d 100%);
        color: #E2E8F0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Encabezado Principal */
    .hero-container {
        background: linear-gradient(135deg, rgba(13, 27, 62, 0.75) 0%, rgba(6, 14, 30, 0.85) 100%);
        border: 1px solid rgba(0, 210, 255, 0.25);
        border-radius: 14px;
        padding: 20px 26px;
        margin-bottom: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 24px rgba(0, 210, 255, 0.08);
    }
    .hero-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 2.0rem;
        font-weight: 800;
        letter-spacing: 1.5px;
        background: linear-gradient(90deg, #FFFFFF 0%, #00D2FF 60%, #00FF87 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .hero-subtitle {
        color: #94A3B8;
        font-size: 0.95rem;
        margin-top: 6px;
        font-weight: 400;
    }
    .nasa-tag {
        display: inline-block;
        background: rgba(255, 75, 75, 0.2);
        color: #FF6B6B;
        border: 1px solid rgba(255, 75, 75, 0.5);
        border-radius: 6px;
        padding: 3px 9px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 1px;
    }

    /* Tarjetas de Métricas y KPIs */
    .metric-card {
        background: rgba(14, 23, 42, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 14px 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(10px);
        height: 100%;
    }
    .metric-title {
        color: #94A3B8;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 4px;
    }
    .metric-value {
        font-family: 'Orbitron', monospace;
        font-size: 1.45rem;
        font-weight: 700;
        color: #F8FAFC;
    }
    .metric-sub {
        font-size: 0.78rem;
        color: #64748B;
        margin-top: 3px;
    }

    /* Badges */
    .badge-pill {
        display: inline-block;
        border-radius: 9999px;
        padding: 4px 12px;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    /* Paneles de Diagnóstico e Informe */
    .report-card {
        background: linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(9, 14, 28, 0.95) 100%);
        border: 1px solid rgba(0, 210, 255, 0.2);
        border-left: 4px solid #00D2FF;
        border-radius: 12px;
        padding: 20px 24px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        margin-top: 14px;
        line-height: 1.65;
    }
    .report-header {
        font-family: 'Orbitron', sans-serif;
        color: #00D2FF;
        font-size: 1.1rem;
        margin-bottom: 12px;
    }

    /* Glosario Card */
    .glossary-card {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 10px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# =====================================================================
# INICIALIZACIÓN DE ESTADO DE SESIÓN
# =====================================================================
case_studies = de.get_case_studies()
var_catalog = de.VARIABLES_CATALOG

if "active_mode" not in st.session_state:
    st.session_state.active_mode = "detective"

if "selected_case" not in st.session_state:
    st.session_state.selected_case = "caso_a"

if "current_lat" not in st.session_state:
    st.session_state.current_lat = 28.63

if "current_lon" not in st.session_state:
    st.session_state.current_lon = -106.08

if "current_var" not in st.session_state:
    st.session_state.current_var = "GWETROOT"

if "region_name" not in st.session_state:
    st.session_state.region_name = "Desierto de Chihuahua (Norte de México)"


def apply_case(case_key: str):
    """Aplica de forma atómica los parámetros de un caso de estudio."""
    if case_key in case_studies:
        c = case_studies[case_key]
        st.session_state.selected_case = case_key
        st.session_state.current_lat = float(c["lat"])
        st.session_state.current_lon = float(c["lon"])
        st.session_state.current_var = c["default_var"]
        st.session_state.region_name = c["region_name"]


def apply_coords(lat: float, lon: float, name: str):
    """Aplica coordenadas de forma segura."""
    st.session_state.current_lat = float(lat)
    st.session_state.current_lon = float(lon)
    st.session_state.region_name = str(name)


# =====================================================================
# ENCABEZADO PRINCIPAL (HERO SECTION)
# =====================================================================
st.markdown(
    """
    <div class="hero-container">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div class="hero-title">
                <span>🌍 EarthTrend Detective</span>
            </div>
            <div>
                <span class="nasa-tag">NASA DATA RETRIEVAL & STATS ENGINE</span>
            </div>
        </div>
        <div class="hero-subtitle">
            Detección cuantitativa de tendencias, descomposición estacional de anomalías y validación de significancia
            estadística sobre variables geofísicas del Sistema Tierra.
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)


# =====================================================================
# BARRA LATERAL: CONFIGURACIÓN, VARIABLES Y GLOSARIO
# =====================================================================
with st.sidebar:
    st.markdown("### 🛰️ Modo de Investigación")
    mode_selection = st.radio(
        "Elige tu enfoque de análisis:",
        options=["Detective Guiado (Casos NASA)", "Explorador Libre (Global)"],
        index=0 if st.session_state.active_mode == "detective" else 1,
    )
    st.session_state.active_mode = "detective" if "Detective" in mode_selection else "explorer"

    st.markdown("---")

    # MODO DETECTIVE GUIADO
    if st.session_state.active_mode == "detective":
        st.markdown("### 📂 Casos de Demostración")
        case_options = {
            "caso_a": "Caso A: Desiertos vs Trópicos (Tendencias Opuestas)",
            "caso_b": "Caso B: Amazonía (Deforestación y Humedad)",
            "caso_c": "Caso C: Megaciudad (Isla de Calor Urbana)",
        }
        current_case_idx = list(case_options.keys()).index(st.session_state.selected_case) if st.session_state.selected_case in case_options else 0
        selected_case_key = st.selectbox(
            "Selecciona un Caso Científico:",
            options=list(case_options.keys()),
            format_func=lambda k: case_options[k],
            index=current_case_idx,
            key="case_selectbox",
        )
        if selected_case_key != st.session_state.selected_case:
            apply_case(selected_case_key)
            st.rerun()

    # CATÁLOGO Y SELECTOR DE VARIABLE
    st.markdown("### 📊 Variable Ambiental (NASA)")
    var_keys = list(var_catalog.keys())
    default_var_idx = var_keys.index(st.session_state.current_var) if st.session_state.current_var in var_keys else 0
    selected_var_key = st.selectbox(
        "Variable a examinar:",
        options=var_keys,
        format_func=lambda k: f"{var_catalog[k]['name']} ({var_catalog[k]['unit']})",
        index=default_var_idx,
        key="var_selectbox",
    )
    st.session_state.current_var = selected_var_key
    var_meta = var_catalog[selected_var_key]

    # PARÁMETROS TEMPORALES
    st.markdown("### ⏳ Ventana Temporal & Filtros")
    year_range = st.slider(
        "Rango de Años:",
        min_value=1990,
        max_value=2024,
        value=(1995, 2024),
        step=1,
    )

    resolution = st.radio(
        "Resolución Temporal:",
        options=["Mensual (Alta precisión)", "Anual (Tendencia agregada)"],
        index=0,
        horizontal=True,
    )
    is_monthly = "Mensual" in resolution

    st.markdown("---")
    st.markdown("### ⚙️ Interruptor Clave del Reto")
    remove_seasonality = st.checkbox(
        "Eliminar ciclo estacional (Calcular Anomalías)",
        value=True,
        help="Resta el promedio histórico de cada mes para desvelar la tendencia lineal real.",
    )

    show_rolling = st.checkbox(
        "Mostrar Media Móvil (12 meses / 5 años)",
        value=True,
    )

    show_ci = st.checkbox(
        "Mostrar Banda de Confianza al 95%",
        value=True,
    )

    st.markdown("---")
    with st.expander("📖 Glosario de Variables e Instrumentos"):
        for v_code, v_data in var_catalog.items():
            st.markdown(
                f"""
                <div class="glossary-card">
                    <strong style="color:{v_data['color']}">{v_data['name']} (`{v_code}`)</strong><br/>
                    <small><b>Instrumento/Modelo:</b> {v_data['instrument']}</small><br/>
                    <small><b>Unidad:</b> {v_data['unit']}</small><br/>
                    <small><b>Qué es:</b> {v_data['description']}</small><br/>
                    <small><b>Por qué importa:</b> {v_data['importance']}</small>
                </div>
                """,
                unsafe_allow_html=True,
            )


# =====================================================================
# MODOS: PANEL SUPERIOR CON CASO DE ESTUDIO O GUÍA
# =====================================================================
active_case = case_studies.get(st.session_state.selected_case, case_studies["caso_a"])

if st.session_state.active_mode == "detective":
    st.markdown(
        f"""
        <div style="background: rgba(14, 27, 56, 0.65); border: 1px solid rgba(0, 210, 255, 0.3); border-radius: 10px; padding: 14px 18px; margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap:wrap; gap:8px;">
                <span style="font-family:'Orbitron', sans-serif; font-size:1.1rem; color:#00D2FF; font-weight:700;">
                    {active_case['title']}
                </span>
                <span class="badge-pill" style="background:rgba(0, 210, 255, 0.2); border:1px solid #00D2FF; color:#00D2FF;">
                    {active_case['badge']}
                </span>
            </div>
            <div style="color: #CBD5E1; margin-top: 6px; font-size: 0.9rem;">
                <b>Hipótesis del Detective:</b> {active_case['hypothesis']}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
else:
    st.markdown(
        """
        <div style="background: rgba(14, 27, 56, 0.5); border: 1px solid rgba(0, 255, 135, 0.3); border-radius: 10px; padding: 12px 18px; margin-bottom: 18px;">
            <span style="font-family:'Orbitron', sans-serif; font-size:1.0rem; color:#00FF87;">
                🌐 Modo Explorador Libre: Haz clic en el mapa satelital o ingresa coordenadas para cualquier región del planeta.
            </span>
        </div>
        """,
        unsafe_allow_html=True,
    )


# =====================================================================
# GEOGRAFÍA: MAPA SATELITAL INTERACTIVO (ESRI WORLD IMAGERY)
# =====================================================================
col_map, col_inputs = st.columns([1.65, 1.0])

with col_inputs:
    st.markdown("#### 📍 Coordenadas de Muestreo")
    
    new_lat = st.number_input(
        "Latitud (°N / °S):",
        min_value=-89.0,
        max_value=89.0,
        value=float(st.session_state.current_lat),
        step=0.25,
        format="%.4f",
        key="num_lat_input",
    )
    new_lon = st.number_input(
        "Longitud (°E / °W):",
        min_value=-179.0,
        max_value=179.0,
        value=float(st.session_state.current_lon),
        step=0.25,
        format="%.4f",
        key="num_lon_input",
    )
    new_region_name = st.text_input(
        "Etiqueta de la Región:",
        value=st.session_state.region_name,
        key="txt_region_name",
    )

    if (
        abs(new_lat - st.session_state.current_lat) > 1e-4
        or abs(new_lon - st.session_state.current_lon) > 1e-4
        or new_region_name != st.session_state.region_name
    ):
        apply_coords(new_lat, new_lon, new_region_name)

    st.markdown("##### 📌 Regiones Emblemáticas:")
    preset_cols = st.columns(3)
    with preset_cols[0]:
        if st.button("🏜️ Chihuahua"):
            apply_coords(28.63, -106.08, "Desierto de Chihuahua")
            st.rerun()
    with preset_cols[1]:
        if st.button("🌳 Amazonía"):
            apply_coords(-10.85, -61.95, "Rondônia (Amazonía)")
            st.rerun()
    with preset_cols[2]:
        if st.button("🏙️ CDMX"):
            apply_coords(19.43, -99.13, "Valle de México")
            st.rerun()

with col_map:
    st.markdown("#### 🛰️ Vista Satelital Terrestre")
    
    center_lat = float(st.session_state.current_lat)
    center_lon = float(st.session_state.current_lon)

    # Creamos el mapa con Folium usando ESRI World Imagery (Satelital de alta resolución)
    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=3,
        tiles=None,  # Evita cargar CartoDB por defecto
        control_scale=True,
    )

    # 1. Capa Satelital Principal: Esri World Imagery (NASA / USGS / Maxar)
    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr="Esri World Imagery, NASA, USGS",
        name="🛰️ Satélite de Alta Resolución (Esri/NASA)",
        overlay=False,
        control=True,
    ).add_to(m)

    # 2. Capa de Nombres y Fronteras (Etiquetas sobre satélite)
    folium.TileLayer(
        tiles="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attr="Esri Reference",
        name="🏷️ Fronteras y Etiquetas",
        overlay=True,
        control=True,
    ).add_to(m)

    # 3. Capa Alternativa: OpenStreetMap (Calles y Geografía)
    folium.TileLayer(
        tiles="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attr="OpenStreetMap contributors",
        name="🗺️ OpenStreetMap",
        overlay=False,
        control=True,
    ).add_to(m)

    # Control de Capas
    folium.LayerControl(position="topright", collapsed=True).add_to(m)

    # Marcador pulsante en la coordenada activa
    folium.CircleMarker(
        location=[center_lat, center_lon],
        radius=8,
        popup=f"<b>{st.session_state.region_name}</b><br>Lat: {center_lat:.2f}°, Lon: {center_lon:.2f}°",
        color="#00D2FF",
        weight=3,
        fill=True,
        fill_color="#FF4D4D",
        fill_opacity=0.9,
    ).add_to(m)

    # Renderizado interactivo con captura de clics
    try:
        map_output = st_folium(
            m,
            height=260,
            width="100%",
            returned_objects=["last_clicked"],
            key="nasa_satellite_map",
        )
        if map_output and map_output.get("last_clicked"):
            c_lat = round(map_output["last_clicked"]["lat"], 4)
            c_lon = round(map_output["last_clicked"]["lng"], 4)
            if abs(c_lat - st.session_state.current_lat) > 0.08 or abs(c_lon - st.session_state.current_lon) > 0.08:
                apply_coords(c_lat, c_lon, f"Punto ({c_lat:.2f}°, {c_lon:.2f}°)")
                st.rerun()
    except Exception:
        # Fallback de representación HTML en caso de incompatibilidad de iframe
        st.components.v1.html(m._repr_html_(), height=260)


# =====================================================================
# EXTRACCIÓN Y PROCESAMIENTO DE DATOS
# =====================================================================
with st.spinner("Descargando telemetría satelital NASA POWER..."):
    df_raw, data_source_msg = de.fetch_nasa_power_data(
        param_key=st.session_state.current_var,
        lat=st.session_state.current_lat,
        lon=st.session_state.current_lon,
        start_year=year_range[0],
        end_year=year_range[1],
        timeout=5.0,
    )

# Desestacionalización / Anomalías
df_processed, df_climatology = se.calculate_climatology_and_anomalies(df_raw, value_col="value")

# Agregación según resolución
if not is_monthly:
    agg_method = "sum" if var_meta.get("aggregation") == "sum" else "mean"
    df_analysis = se.aggregate_annual_series(df_processed, value_col="value", agg_func=agg_method)
    time_series_x = df_analysis["year"].values
else:
    df_analysis = df_processed
    time_series_x = df_analysis["date"].values

# Columna objetivo a analizar
target_value_col = "anomaly" if remove_seasonality else "value"

# Inicialización segura de variables estadísticas
ols_results = {
    "valid": False,
    "slope": 0.0,
    "slope_per_decade": 0.0,
    "intercept": 0.0,
    "r_squared": 0.0,
    "r_value": 0.0,
    "p_value_ols": 1.0,
    "stderr_slope": 0.0,
    "t_stat": 0.0,
    "df_resid": 0,
    "delta_years": max(year_range[1] - year_range[0], 1),
    "total_change_absolute": 0.0,
    "percent_change": 0.0,
    "y_pred": np.zeros(len(df_analysis)),
    "ci_lower": np.zeros(len(df_analysis)),
    "ci_upper": np.zeros(len(df_analysis)),
}
mk_results = {
    "trend": "no trend",
    "h": False,
    "p": 1.0,
    "z": 0.0,
    "tau": 0.0,
    "s": 0.0,
    "var_s": 0.0,
    "sen_slope": 0.0,
    "method": "insufficient_data",
}
verdict_info = {
    "direction": "Sin tendencia clara ➖",
    "direction_class": "trend-neutral",
    "significance_level": "Sin datos suficientes",
    "badge_color": "#888888",
    "badge_text": "SIN DATOS SUFICIENTES",
    "is_significant": False,
}
stats_valid = False

# Ejecución robusta de cálculos
if len(df_analysis) >= 2:
    try:
        ols_res_calc = se.compute_linear_trend(
            df_analysis,
            value_col=target_value_col,
            time_col="decimal_year",
            confidence_level=0.95,
        )
        if ols_res_calc.get("valid", True):
            ols_results = ols_res_calc
            mk_results = se.compute_mann_kendall_test(
                df_analysis[target_value_col].values,
                alpha=0.05,
            )
            verdict_info = se.evaluate_trend_significance(ols_results, mk_results, alpha=0.05)
            stats_valid = True
    except Exception as e:
        stats_valid = False


# =====================================================================
# BANNER DE ESTADO DE LA FUENTE DE DATOS
# =====================================================================
st.markdown(
    f"""
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; background:rgba(9, 14, 28, 0.7); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 14px; margin-top:12px; margin-bottom:16px; font-size:0.83rem; color:#94A3B8;">
        <span>📡 <b>Fuente Activa:</b> {data_source_msg}</span>
        <span><b>Muestras:</b> {len(df_analysis)} registros | <b>Periodo:</b> {year_range[0]} - {year_range[1]}</span>
    </div>
    """,
    unsafe_allow_html=True,
)


# =====================================================================
# TARJETAS DE MÉTRICAS CLAVE (KPIS DEL DETECTIVE)
# =====================================================================
kpi_cols = st.columns(5)

slope_dec = ols_results["slope_per_decade"]
slope_yr = ols_results["slope"]
sign_dec = "+" if slope_dec >= 0 else ""
sign_yr = "+" if slope_yr >= 0 else ""
tot_change = ols_results["total_change_absolute"]
pct_change = ols_results["percent_change"]
sign_tot = "+" if tot_change >= 0 else ""

with kpi_cols[0]:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-title">Tasa por Década</div>
            <div class="metric-value" style="color:{var_meta['color']}">{sign_dec}{slope_dec:.3f}</div>
            <div class="metric-sub">{var_meta['unit']} / década</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with kpi_cols[1]:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-title">Tasa Anual (Pendiente)</div>
            <div class="metric-value">{sign_yr}{slope_yr:.4f}</div>
            <div class="metric-sub">{var_meta['unit']} / año</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with kpi_cols[2]:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-title">Cambio en Periodo</div>
            <div class="metric-value">{sign_tot}{tot_change:.2f} {var_meta['unit']}</div>
            <div class="metric-sub">{sign_tot}{pct_change:.1f}% vs media histórica</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with kpi_cols[3]:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-title">Dirección de Tendencia</div>
            <div class="metric-value" style="font-size:1.15rem; padding-top:4px;">{verdict_info['direction']}</div>
            <div class="metric-sub">R² = {ols_results['r_squared']:.3f} | Pearson r = {ols_results['r_value']:.2f}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with kpi_cols[4]:
    p_disp = ols_results['p_value_ols']
    p_text = f"p = {p_disp:.2e}" if p_disp < 0.001 else f"p = {p_disp:.4f}"
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-title">Significancia Científica</div>
            <div style="margin-top:4px;">
                <span class="badge-pill" style="background:{verdict_info['badge_color']}22; border:1px solid {verdict_info['badge_color']}; color:{verdict_info['badge_color']};">
                    {verdict_info['badge_text']}
                </span>
            </div>
            <div class="metric-sub">{p_text} (t={ols_results['t_stat']:.2f})</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# =====================================================================
# VISUALIZACIÓN INTERACTIVA PRINCIPAL (PLOTLY)
# =====================================================================
st.markdown("<br/>", unsafe_allow_html=True)

fig = go.Figure()

val_label = f"Anomalía de {var_meta['name']}" if remove_seasonality else var_meta["name"]
y_title = f"{val_label} ({var_meta['unit']})"

# Capa 1: Serie Temporal Observada
obs_name = "Anomalía Observada" if remove_seasonality else "Serie Observada"
fig.add_trace(
    go.Scatter(
        x=time_series_x,
        y=df_analysis[target_value_col],
        mode="lines+markers",
        name=obs_name,
        line=dict(color="rgba(148, 163, 184, 0.45)", width=1.4),
        marker=dict(size=3.5, color=var_meta["color"], opacity=0.75),
        hovertemplate="<b>Fecha:</b> %{x}<br><b>Valor:</b> %{y:.3f} " + var_meta["unit"] + "<extra></extra>",
    )
)

# Capa 2: Media Móvil (Opcional)
if show_rolling:
    rolling_col = "rolling_12m_anomaly" if (is_monthly and remove_seasonality) else ("rolling_12m" if is_monthly else "rolling_5y")
    rolling_label = "Media Móvil 12 Meses" if is_monthly else "Media Móvil 5 Años"
    if rolling_col in df_analysis.columns:
        fig.add_trace(
            go.Scatter(
                x=time_series_x,
                y=df_analysis[rolling_col],
                mode="lines",
                name=rolling_label,
                line=dict(color="#00D2FF", width=2.6),
                hovertemplate="<b>" + rolling_label + ":</b> %{y:.3f} " + var_meta["unit"] + "<extra></extra>",
            )
        )

# Capa 3 y 4: Banda de Confianza al 95% y Línea de Tendencia OLS
if stats_valid:
    if show_ci:
        fig.add_trace(
            go.Scatter(
                x=time_series_x,
                y=ols_results["ci_upper"],
                mode="lines",
                line=dict(width=0),
                showlegend=False,
                hoverinfo="skip",
            )
        )
        fig.add_trace(
            go.Scatter(
                x=time_series_x,
                y=ols_results["ci_lower"],
                mode="lines",
                line=dict(width=0),
                fill="tonexty",
                fillcolor="rgba(255, 184, 0, 0.16)",
                name="Intervalo de Confianza 95%",
                hovertemplate="<b>Banda CI 95%:</b> [%{y:.3f} a superior]<extra></extra>",
            )
        )

    trend_color = "#FFB800" if verdict_info["is_significant"] else "#94A3B8"
    fig.add_trace(
        go.Scatter(
            x=time_series_x,
            y=ols_results["y_pred"],
            mode="lines",
            name=f"Tendencia Lineal OLS ({sign_dec}{slope_dec:.3f} {var_meta['unit']}/década)",
            line=dict(color=trend_color, width=3.0, dash="solid"),
            hovertemplate="<b>Tendencia OLS:</b> %{y:.3f} " + var_meta["unit"] + "<extra></extra>",
        )
    )

# Línea base cero si se grafican anomalías
if remove_seasonality:
    fig.add_hline(
        y=0,
        line_dash="dot",
        line_color="rgba(255, 255, 255, 0.35)",
        annotation_text="Línea Base Climatológica (0)",
        annotation_position="bottom right",
    )

fig.update_layout(
    title=dict(
        text=f"<b>Trayectoria Temporal y Tendencia Secular: {var_meta['name']}</b><br><span style='font-size:12px; color:#94A3B8;'>Región: {st.session_state.region_name} | Coords: ({st.session_state.current_lat:.2f}°, {st.session_state.current_lon:.2f}°)</span>",
        font=dict(size=17, color="#F8FAFC", family="Inter"),
        x=0.01,
        y=0.96,
    ),
    template="plotly_dark",
    paper_bgcolor="rgba(13, 21, 39, 0.8)",
    plot_bgcolor="rgba(8, 14, 27, 0.9)",
    margin=dict(l=60, r=30, t=80, b=50),
    height=480,
    legend=dict(
        orientation="h",
        yanchor="bottom",
        y=1.02,
        xanchor="right",
        x=1.0,
        bgcolor="rgba(14, 23, 42, 0.7)",
        bordercolor="rgba(255, 255, 255, 0.1)",
        borderwidth=1,
    ),
    xaxis=dict(
        title="Año de Observación",
        showgrid=True,
        gridcolor="rgba(255, 255, 255, 0.06)",
        zeroline=False,
    ),
    yaxis=dict(
        title=y_title,
        showgrid=True,
        gridcolor="rgba(255, 255, 255, 0.06)",
        zeroline=False,
    ),
    hovermode="x unified",
)

st.plotly_chart(fig)


# =====================================================================
# PANELES SECUNDARIOS Y ANÁLISIS COMPLEMENTARIOS EN PESTAÑAS
# =====================================================================
tab_report, tab_diagnostics, tab_cycle, tab_compare = st.tabs([
    "🕵️ Informe del Detective",
    "🔬 Diagnóstico Estadístico Detallado",
    "🌀 Ciclo Estacional Anual",
    "⚖️ Comparativa con Región de Control",
])

# PESTAÑA 1: INFORME DEL DETECTIVE
with tab_report:
    if stats_valid:
        report_text = se.generate_detective_report(
            var_meta=var_meta,
            region_name=st.session_state.region_name,
            ols_res=ols_results,
            mk_res=mk_results,
            verdict=verdict_info,
            is_deseasonalized=remove_seasonality,
            resolution=resolution,
            year_range=year_range,
        )
        st.markdown(
            f"""
            <div class="report-card">
                <div class="report-header">
                    <span>🔍 Conclusiones del Detective de Datos Climáticos</span>
                </div>
                {report_text}
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.info("Amplía el rango de años para calcular el informe estadístico con significancia.")

# PESTAÑA 2: DIAGNÓSTICO ESTADÍSTICO DETALLADO
with tab_diagnostics:
    col_d1, col_d2 = st.columns(2)
    with col_d1:
        st.markdown("#### 📐 Regresión Lineal (Mínimos Cuadrados)")
        diag_df1 = pd.DataFrame([
            {"Parámetro": "Pendiente Anual (β1)", "Valor": f"{ols_results['slope']:.6f} {var_meta['unit']}/año"},
            {"Parámetro": "Tasa por Década", "Valor": f"{ols_results['slope_per_decade']:.4f} {var_meta['unit']}/década"},
            {"Parámetro": "Intercepto (β0)", "Valor": f"{ols_results['intercept']:.4f}"},
            {"Parámetro": "Error Estándar de la Pendiente", "Valor": f"{ols_results['stderr_slope']:.6f}"},
            {"Parámetro": "Estadístico t de Student", "Valor": f"{ols_results['t_stat']:.4f}"},
            {"Parámetro": "Grados de Libertad (n - 2)", "Valor": f"{ols_results['df_resid']}"},
            {"Parámetro": "p-value (Regresión)", "Valor": f"{ols_results['p_value_ols']:.3e}"},
            {"Parámetro": "Coeficiente R² (Varianza explicada)", "Valor": f"{ols_results['r_squared']:.4f} ({ols_results['r_squared']*100:.2f}%)"},
            {"Parámetro": "Correlación de Pearson (r)", "Valor": f"{ols_results['r_value']:.4f}"},
        ])
        st.dataframe(diag_df1, hide_index=True)

    with col_d2:
        st.markdown("#### 🧪 Test No Paramétrico de Mann-Kendall")
        diag_df2 = pd.DataFrame([
            {"Parámetro": "Tendencia Detectada", "Valor": f"{mk_results['trend'].upper()}"},
            {"Parámetro": "Rechazo de Hipótesis Nula (h)", "Valor": "SÍ (Existe tendencia)" if mk_results['h'] else "NO (Tendencia no significativa)"},
            {"Parámetro": "p-value (Mann-Kendall)", "Valor": f"{mk_results['p']:.3e}"},
            {"Parámetro": "Estadístico Normalizado (Z)", "Valor": f"{mk_results['z']:.4f}"},
            {"Parámetro": "Tau de Kendall (τ)", "Valor": f"{mk_results['tau']:.4f}"},
            {"Parámetro": "Estadístico S", "Valor": f"{mk_results['s']:.1f}"},
            {"Parámetro": "Varianza Var(S)", "Valor": f"{mk_results['var_s']:.2f}"},
            {"Parámetro": "Pendiente de Sen (Sen's Slope)", "Valor": f"{mk_results['sen_slope']:.6f}"},
            {"Parámetro": "Método de Cálculo", "Valor": f"{mk_results['method']}"},
        ])
        st.dataframe(diag_df2, hide_index=True)

    st.markdown("##### 📥 Exportar Datos de la Investigación")
    clean_region = re.sub(r"[^a-zA-Z0-9_\-]", "_", st.session_state.region_name)[:20]
    safe_filename = f"EarthTrend_{st.session_state.current_var}_{clean_region}_{year_range[0]}_{year_range[1]}.csv"
    csv_bytes = df_analysis.to_csv(index=False).encode("utf-8")
    st.download_button(
        label="Descargar Serie Temporal Procesada (CSV)",
        data=csv_bytes,
        file_name=safe_filename,
        mime="text/csv",
    )

# PESTAÑA 3: CICLO ESTACIONAL ANUAL Y CLIMATOLOGÍA
with tab_cycle:
    st.markdown("#### 🌀 Ciclo Estacional Climatológico (Promedio Multianual 12 Meses)")
    st.markdown(
        "Muestra el ritmo de respiración anual de la variable en esta coordenada antes de ser sustraído para calcular anomalías."
    )
    fig_cycle = px.bar(
        df_climatology,
        x="month_name",
        y="mean_clim",
        error_y="std_clim",
        labels={"month_name": "Mes del Año", "mean_clim": f"Promedio Histórico ({var_meta['unit']})"},
        title=f"Climatología Mensual con Desviación Estándar (±1σ): {var_meta['name']}",
        template="plotly_dark",
    )
    fig_cycle.update_traces(marker_color=var_meta["color"], opacity=0.85)
    fig_cycle.update_layout(
        paper_bgcolor="rgba(13, 21, 39, 0.8)",
        plot_bgcolor="rgba(8, 14, 27, 0.9)",
        height=380,
    )
    st.plotly_chart(fig_cycle)

# PESTAÑA 4: COMPARATIVA CON REGIÓN DE CONTROL
with tab_compare:
    if st.session_state.active_mode == "detective":
        comp_info = active_case.get("compare_region", {})
        comp_name = comp_info.get("name", "Región de Control")
        comp_var = comp_info.get("var", st.session_state.current_var)
        comp_meta = var_catalog.get(comp_var, var_meta)

        st.markdown(f"#### ⚖️ Comparativa Científica: {st.session_state.region_name} vs {comp_name}")
        st.markdown(
            f"Compara la respuesta en **{comp_name}** ({comp_meta['name']}) contra la región de estudio."
        )

        with st.spinner("Cargando datos de la región de control..."):
            df_ctrl_raw, _ = de.fetch_nasa_power_data(
                param_key=comp_var,
                lat=float(comp_info.get("lat", 0.0)),
                lon=float(comp_info.get("lon", 0.0)),
                start_year=year_range[0],
                end_year=year_range[1],
            )
            df_ctrl_proc, _ = se.calculate_climatology_and_anomalies(df_ctrl_raw)
            ols_ctrl = se.compute_linear_trend(df_ctrl_proc, value_col="anomaly")

        fig_comp = go.Figure()
        fig_comp.add_trace(
            go.Scatter(
                x=df_processed["date"],
                y=df_processed["anomaly"],
                mode="lines",
                name=f"Estudio: {st.session_state.region_name} ({sign_dec}{slope_dec:.3f}/década)",
                line=dict(color=var_meta["color"], width=1.8),
            )
        )
        ctrl_slope_dec = ols_ctrl.get("slope_per_decade", 0.0)
        ctrl_sign = "+" if ctrl_slope_dec >= 0 else ""
        fig_comp.add_trace(
            go.Scatter(
                x=df_ctrl_proc["date"],
                y=df_ctrl_proc["anomaly"],
                mode="lines",
                name=f"Control: {comp_name} ({ctrl_sign}{ctrl_slope_dec:.3f}/década)",
                line=dict(color="#00FF87", width=1.8),
            )
        )
        fig_comp.update_layout(
            title="Comparativa de Anomalías Desestacionalizadas",
            template="plotly_dark",
            paper_bgcolor="rgba(13, 21, 39, 0.8)",
            plot_bgcolor="rgba(8, 14, 27, 0.9)",
            height=400,
            xaxis=dict(title="Año"),
            yaxis=dict(title="Anomalía"),
        )
        st.plotly_chart(fig_comp)
    else:
        st.info("Activa el 'Modo Detective Guiado' en la barra lateral para ver la comparativa con la región de control preconfigurada.")
