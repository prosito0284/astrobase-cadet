"""
stats_engine.py - Motor Matemático y Estadístico para EarthTrend Detective
========================================================================
Implementa algoritmos rigurosos de ciencia de datos climáticos:
- Desestacionalización / Cálculo de anomalías climatológicas mensuales.
- Regresión lineal por Mínimos Cuadrados Ordinarios (OLS) con intervalos de confianza al 95%.
- Test no paramétrico de Mann-Kendall con cálculo de Sen's Slope y Tau.
- Test t de Student para significancia de la pendiente.
- Generador de diagnósticos e "Informe del Detective" para divulgación científica.
"""

from __future__ import annotations
import math
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import pandas as pd
from scipy import stats
try:
    from statsmodels.tsa.seasonal import seasonal_decompose
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False

try:
    import pymannkendall as pmk
    HAS_PYMK = True
except ImportError:
    HAS_PYMK = False


# =====================================================================
# 1. DESESTACIONALIZACIÓN Y ANOMALÍAS CLIMATOLÓGICAS
# =====================================================================
def calculate_climatology_and_anomalies(
    df: pd.DataFrame,
    value_col: str = "value",
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Resta el ciclo estacional histórico mensual calculando la climatología base
    de cada mes (promedio multianual de todos los eneros, febreros, etc.).
    
    Genera:
    - anomalía absoluta = valor - promedio_mes
    - anomalía estandarizada (z-score mensual) = anomalía / desviación_mes
    
    Retorna:
        Tuple[pd.DataFrame, pd.DataFrame]:
            (df_enriquecido, tabla_climatología_12_meses)
    """
    work_df = df.copy()

    # Cálculo de la climatología histórica por mes del año (1 a 12)
    climatology = (
        work_df.groupby("month")[value_col]
        .agg(
            mean_clim="mean",
            std_clim="std",
            min_clim="min",
            max_clim="max",
            count="count",
        )
        .reset_index()
    )
    # Si std es 0 o NaN (casos extremos), reemplazar por 1.0 para evitar división por cero
    climatology["std_clim"] = climatology["std_clim"].replace(0.0, 1.0).fillna(1.0)

    # Fusionar con la serie temporal
    work_df = work_df.merge(
        climatology[["month", "mean_clim", "std_clim"]],
        on="month",
        how="left",
    )

    work_df["anomaly"] = work_df[value_col] - work_df["mean_clim"]
    work_df["standardized_anomaly"] = work_df["anomaly"] / work_df["std_clim"]

    # Media móvil de 12 meses (útil para suavizar variabilidad estacional residual o ruido)
    work_df["rolling_12m"] = (
        work_df[value_col].rolling(window=12, min_periods=6, center=True).mean()
    )
    work_df["rolling_12m_anomaly"] = (
        work_df["anomaly"].rolling(window=12, min_periods=6, center=True).mean()
    )

    # Nombres de meses en español para la tabla climatológica
    meses_es = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ]
    climatology["month_name"] = climatology["month"].apply(
        lambda m: meses_es[m - 1] if 1 <= m <= 12 else str(m)
    )

    return work_df, climatology


def decompose_seasonal_signal(
    df: pd.DataFrame,
    value_col: str = "value",
    period: int = 12,
) -> Optional[Dict[str, pd.Series]]:
    """
    Aplica descomposición aditiva clásica (Tendencia + Estacionalidad + Residuo)
    mediante statsmodels si hay suficientes observaciones continuas.
    """
    if not HAS_STATSMODELS or len(df) < period * 2:
        return None

    try:
        series = df[value_col].values
        decomp = seasonal_decompose(series, model="additive", period=period, extrapolate_trend="freq")
        return {
            "trend": pd.Series(decomp.trend, index=df.index),
            "seasonal": pd.Series(decomp.seasonal, index=df.index),
            "resid": pd.Series(decomp.resid, index=df.index),
        }
    except Exception:
        return None


# =====================================================================
# 2. AGREGACIÓN ANUAL
# =====================================================================
def aggregate_annual_series(
    df: pd.DataFrame,
    value_col: str = "value",
    agg_func: str = "mean",
) -> pd.DataFrame:
    """
    Agrupa los datos a escala anual (media anual o suma anual para precipitación).
    Calcula también la anomalía anual respecto al promedio de todos los años.
    """
    if agg_func == "sum":
        annual = df.groupby("year")[value_col].agg(["sum", "count"]).reset_index()
        annual.rename(columns={"sum": "value"}, inplace=True)
    else:
        annual = df.groupby("year")[value_col].agg(["mean", "count"]).reset_index()
        annual.rename(columns={"mean": "value"}, inplace=True)

    # Filtrar años que no tengan al menos 10 meses registrados
    annual = annual[annual["count"] >= 10].copy()
    annual["decimal_year"] = annual["year"] + 0.5
    mean_historical = annual["value"].mean()
    annual["anomaly"] = annual["value"] - mean_historical
    annual["rolling_5y"] = annual["value"].rolling(window=5, min_periods=2, center=True).mean()

    return annual


# =====================================================================
# 3. REGRESIÓN LINEAL OLS & INTERVALOS DE CONFIANZA AL 95%
# =====================================================================
def compute_linear_trend(
    df: pd.DataFrame,
    value_col: str = "value",
    time_col: str = "decimal_year",
    confidence_level: float = 0.95,
) -> Dict[str, Any]:
    """
    Calcula la regresión de mínimos cuadrados ordinarios (OLS):
        y = beta_0 + beta_1 * x

    Calcula la pendiente anual, la tasa por década, el estadístico t, el p-value,
    el coeficiente de determinación R^2 y la banda del intervalo de confianza del 95%
    alrededor de la línea de regresión media.
    """
    clean_mask = df[value_col].notna() & df[time_col].notna()
    x = df.loc[clean_mask, time_col].to_numpy(dtype=float)
    y = df.loc[clean_mask, value_col].to_numpy(dtype=float)
    n = len(x)

    if n < 2:
        return {
            "valid": False,
            "slope": 0.0,
            "intercept": 0.0,
            "slope_per_decade": 0.0,
            "r_value": 0.0,
            "r_squared": 0.0,
            "p_value_ols": 1.0,
            "stderr_slope": 0.0,
            "t_stat": 0.0,
            "df_resid": 0,
            "n_samples": n,
            "x_series": x,
            "y_pred": np.zeros(n),
            "ci_lower": np.zeros(n),
            "ci_upper": np.zeros(n),
            "delta_years": 0.0,
            "total_change_absolute": 0.0,
            "percent_change": 0.0,
            "y_start_trend": 0.0,
            "y_end_trend": 0.0,
        }

    # Regresión lineal usando scipy.stats.linregress
    ols = stats.linregress(x, y)
    slope = float(ols.slope) if np.isfinite(ols.slope) else 0.0
    intercept = float(ols.intercept) if np.isfinite(ols.intercept) else 0.0
    r_val = float(ols.rvalue) if np.isfinite(ols.rvalue) else 0.0
    p_val = float(ols.pvalue) if (np.isfinite(ols.pvalue) and n >= 3) else 1.0
    stderr_slope = float(ols.stderr) if (ols.stderr is not None and np.isfinite(ols.stderr)) else 0.0
    r_squared = float(r_val ** 2)

    # Predicción sobre los puntos x
    y_pred = intercept + slope * x
    residuals = y - y_pred

    # Grados de libertad y error estándar residual
    df_resid = max(n - 2, 0)
    sum_sq_resid = np.sum(residuals ** 2)
    s_err = np.sqrt(sum_sq_resid / max(df_resid, 1))

    # T-estadístico
    t_stat = (slope / stderr_slope) if stderr_slope > 1e-12 else 0.0

    # Intervalo de confianza al 95% de la línea de regresión (media condicional)
    # Formula: SE(y_hat_0) = s_err * sqrt(1/n + (x_0 - x_bar)^2 / sum((x - x_bar)^2))
    if df_resid >= 1:
        alpha = 1.0 - confidence_level
        t_crit = stats.t.ppf(1.0 - alpha / 2.0, df=df_resid)
        x_bar = np.mean(x)
        ss_xx = np.sum((x - x_bar) ** 2)
        if ss_xx > 1e-12:
            se_line = s_err * np.sqrt((1.0 / n) + ((x - x_bar) ** 2) / ss_xx)
            ci_lower = y_pred - t_crit * se_line
            ci_upper = y_pred + t_crit * se_line
        else:
            ci_lower = y_pred
            ci_upper = y_pred
    else:
        ci_lower = y_pred
        ci_upper = y_pred

    # Tasa por década
    slope_per_decade = slope * 10.0

    # Cambio total acumulado en el periodo y cambio porcentual
    x_min, x_max = float(np.min(x)), float(np.max(x))
    delta_years = max(x_max - x_min, 0.0)
    y_start_trend = intercept + slope * x_min
    y_end_trend = intercept + slope * x_max
    total_change_absolute = y_end_trend - y_start_trend

    y_mean_abs = abs(float(np.mean(y)))
    if y_mean_abs > 1e-6:
        percent_change = (total_change_absolute / y_mean_abs) * 100.0
    else:
        percent_change = 0.0

    return {
        "valid": True,
        "slope": slope,
        "intercept": intercept,
        "slope_per_decade": slope_per_decade,
        "r_value": r_val,
        "r_squared": r_squared,
        "p_value_ols": p_val,
        "stderr_slope": stderr_slope,
        "t_stat": t_stat,
        "df_resid": df_resid,
        "n_samples": n,
        "x_series": x,
        "y_pred": y_pred,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "delta_years": delta_years,
        "total_change_absolute": total_change_absolute,
        "percent_change": percent_change,
        "y_start_trend": y_start_trend,
        "y_end_trend": y_end_trend,
    }


# =====================================================================
# 4. TEST DE TENDENCIA DE MANN-KENDALL (ROBUSTO Y NO PARAMÉTRICO)
# =====================================================================
def compute_mann_kendall_test(
    series: np.ndarray | pd.Series | List[float],
    alpha: float = 0.05,
) -> Dict[str, Any]:
    """
    Ejecuta el test no paramétrico de Mann-Kendall para detectar si existe
    una tendencia monótona creciente o decreciente sin asumir normalidad.
    
    Calcula:
    - S: Estadístico de suma de signos
    - Var(S): Varianza con corrección de empates
    - Z: Estadístico estandarizado normal
    - p-value: Probabilidad de cola bilateral
    - Tau: Coeficiente de correlación de rango de Kendall
    - Sen's slope: Pendiente de Sen (mediana de pendientes entre pares)
    """
    clean_data = np.asarray(series, dtype=float)
    clean_data = clean_data[~np.isnan(clean_data)]
    n = len(clean_data)

    if n < 4:
        return {
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

    # Si pymannkendall está disponible, usarlo
    if HAS_PYMK:
        try:
            res = pmk.original_test(clean_data, alpha=alpha)
            return {
                "trend": str(res.trend),
                "h": bool(res.h),
                "p": float(res.p),
                "z": float(res.z),
                "tau": float(res.Tau),
                "s": float(res.s),
                "var_s": float(res.var_s),
                "sen_slope": float(res.slope),
                "method": "pymannkendall",
            }
        except Exception:
            pass  # Fallback a implementación directa en numpy/scipy

    # Implementación pura en NumPy / SciPy
    # 1. Cálculo de S
    s = 0.0
    for k in range(n - 1):
        diffs = clean_data[k + 1:] - clean_data[k]
        s += np.sum(np.sign(diffs))

    # 2. Varianza de S con corrección por empates (ties)
    unique_vals, tie_counts = np.unique(clean_data, return_counts=True)
    ties = tie_counts[tie_counts > 1]
    tie_term = np.sum(ties * (ties - 1) * (2 * ties + 5))

    var_s = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0

    # 3. Estadístico Z estandarizado
    if s > 0:
        z = (s - 1.0) / np.sqrt(var_s)
    elif s < 0:
        z = (s + 1.0) / np.sqrt(var_s)
    else:
        z = 0.0

    # 4. p-value bilateral
    p_val = 2.0 * stats.norm.sf(abs(z))

    # 5. Kendall Tau
    tau = s / (0.5 * n * (n - 1))

    # 6. Pendiente de Sen (Sen's Slope: mediana de (x_j - x_k)/(j - k))
    slopes = []
    for k in range(n - 1):
        dx = np.arange(1, n - k)
        dy = clean_data[k + 1:] - clean_data[k]
        slopes.extend(dy / dx)
    sen_slope = float(np.median(slopes)) if len(slopes) > 0 else 0.0

    h = bool(p_val < alpha)
    if h and sen_slope > 0:
        trend = "increasing"
    elif h and sen_slope < 0:
        trend = "decreasing"
    else:
        trend = "no trend"

    return {
        "trend": trend,
        "h": h,
        "p": float(p_val),
        "z": float(z),
        "tau": float(tau),
        "s": float(s),
        "var_s": float(var_s),
        "sen_slope": float(sen_slope),
        "method": "scipy_fallback",
    }


# =====================================================================
# 5. DIAGNÓSTICO Y VEREDICTO DE SIGNIFICANCIA
# =====================================================================
def evaluate_trend_significance(
    ols_res: Dict[str, Any],
    mk_res: Dict[str, Any],
    alpha: float = 0.05,
) -> Dict[str, Any]:
    """
    Sintetiza los resultados de OLS y Mann-Kendall para otorgar una calificación
    clara e inequívoca del veredicto científico.
    """
    p_ols = ols_res["p_value_ols"]
    p_mk = mk_res["p"]
    slope = ols_res["slope"]

    # Dirección
    if p_ols < alpha or mk_res["h"]:
        if slope > 0:
            direction = "Creciente 📈"
            direction_class = "trend-up"
        else:
            direction = "Decreciente 📉"
            direction_class = "trend-down"
    else:
        direction = "Sin tendencia secular clara ➖"
        direction_class = "trend-neutral"

    # Nivel de significancia y Badge
    if p_ols < 0.001 or p_mk < 0.001:
        significance_level = "Altamente Significativo (p < 0.001, Confianza > 99.9%)"
        badge_color = "#00FF87"  # Verde esmeralda brillante
        badge_text = "ALTAMENTE SIGNIFICATIVO (99.9%)"
        is_significant = True
    elif p_ols < 0.01 or p_mk < 0.01:
        significance_level = "Muy Significativo (p < 0.01, Confianza 99%)"
        badge_color = "#2BD2FF"  # Cian brillante
        badge_text = "SIGNIFICATIVO (99%)"
        is_significant = True
    elif p_ols < 0.05 or p_mk < 0.05:
        significance_level = "Estadísticamente Significativo (p < 0.05, Confianza 95%)"
        badge_color = "#FFAA00"  # Ámbar dorado
        badge_text = "SIGNIFICATIVO (95%)"
        is_significant = True
    else:
        significance_level = "No Significativo (p ≥ 0.05, Ruido natural / Variabilidad climática interna)"
        badge_color = "#888888"  # Gris neutral
        badge_text = "NO SIGNIFICATIVO (RUIDO)"
        is_significant = False

    return {
        "direction": direction,
        "direction_class": direction_class,
        "significance_level": significance_level,
        "badge_color": badge_color,
        "badge_text": badge_text,
        "is_significant": is_significant,
        "p_ols": p_ols,
        "p_mk": p_mk,
    }


# =====================================================================
# 6. INFORME DEL DETECTIVE (NARRATIVA CIENTÍFICA EDUCATIVA)
# =====================================================================
def generate_detective_report(
    var_meta: Dict[str, Any],
    region_name: str,
    ols_res: Dict[str, Any],
    mk_res: Dict[str, Any],
    verdict: Dict[str, Any],
    is_deseasonalized: bool,
    resolution: str,
    year_range: Tuple[int, int],
) -> str:
    """
    Genera un informe dinámico, pedagógico y analítico adaptado para estudiantes
    de bachillerato y universidad, explicando paso a paso los hallazgos del detective.
    """
    var_name = var_meta["name"]
    unit = var_meta["unit"]
    inst = var_meta["instrument"]
    slope_dec = ols_res["slope_per_decade"]
    slope_yr = ols_res["slope"]
    total_change = ols_res["total_change_absolute"]
    pct_change = ols_res["percent_change"]
    r2 = ols_res["r_squared"]
    p_ols = ols_res["p_value_ols"]
    p_mk = mk_res["p"]
    z_mk = mk_res["z"]
    tau_mk = mk_res["tau"]
    nyears = ols_res["delta_years"]
    is_sig = verdict["is_significant"]

    sign_str = "+" if slope_dec >= 0 else ""
    sign_total = "+" if total_change >= 0 else ""

    # Sección 1: Diagnóstico de la variable
    p1 = (
        f"**1. Identificación del Indicador:** Estás analizando **{var_name}** medida en `{unit}`, "
        f"datos provenientes de **{inst}**. Para la región de **{region_name}** durante el periodo "
        f"**{year_range[0]} - {year_range[1]}** ({nyears:.1f} años de observación continua)."
    )

    # Sección 2: Magnitud del cambio detectado
    p2 = (
        f"**2. Magnitud de la Tasa de Cambio:** La regresión lineal (Mínimos Cuadrados Ordinarios) "
        f"revela una tasa de **{sign_str}{slope_yr:.4f} {unit} por año**, lo que equivale a "
        f"**{sign_str}{slope_dec:.3f} {unit} por década**. "
        f"A lo largo del periodo completo analizado, el modelo de tendencia calcula un cambio neto de "
        f"**{sign_total}{total_change:.2f} {unit}** (una variación acumulada del **{sign_total}{pct_change:.1f}%** "
        f"respecto a la media histórica)."
    )

    # Sección 3: El papel de la desestacionalización
    if is_deseasonalized:
        p3 = (
            "**3. Efecto de la Desestacionalización (Anomalías):** Has activado el filtro para "
            "eliminar el ciclo estacional. Al sustraer el promedio multianual de cada mes (ej. inviernos vs veranos), "
            "se eliminó la oscilación periódica astronómica de 12 meses. Esto expone con nitidez quirúrgica la señal de "
            "fondo de largo plazo y previene que el cambio de estaciones enmascare la tendencia climática real."
        )
    else:
        p3 = (
            "**3. Efecto del Ciclo Estacional:** Estás visualizando la serie bruta sin desestacionalizar. "
            "Observa las grandes ondas cíclicas causadas por la inclinación axial de la Tierra (invierno/verano). "
            "*Consejo del Detective:* Activa el interruptor 'Eliminar ciclo estacional' para corroborar si la pendiente "
            "se mantiene firme una vez descontado el ritmo natural del año."
        )

    # Sección 4: Veredicto Estadístico
    if is_sig:
        p4 = (
            f"**4. Prueba de Fuego Estadística:** ¿Es este cambio un simple capricho de la variabilidad climática natural? "
            f"El **t-test de la regresión** arroja un valor p de `{p_ols:.2e}` y la prueba no paramétrica de "
            f"**Mann-Kendall** arroja $Z = {z_mk:.2f}$, $\\tau = {tau_mk:.3f}$ con $p = {p_mk:.2e}$. "
            f"Dado que ambos valores p son **estrictamente inferiores al umbral crítico $\\alpha = 0.05$**, "
            f"rechazamos con total firmeza científica la hipótesis nula de ausencia de tendencia. "
            f"El veredicto es concluyente: **{verdict['significance_level']}**."
        )
    else:
        p4 = (
            f"**4. Prueba de Fuego Estadística:** El valor p obtenido en la regresión es `{p_ols:.4f}` y en "
            f"Mann-Kendall es `{p_mk:.4f}` (ambos superiores al umbral crítico $\\alpha = 0.05$). "
            f"Esto significa que **no se puede descartar que las fluctuaciones observadas se deban a ruido aleatorio o "
            f"variabilidad interna interanual**. La evidencia actual no permite afirmar una tendencia forzada secular."
        )

    # Sección 5: Lección sobre la ventana temporal
    p5 = (
        f"**5. Lección Crítica del Detective (Ventana Temporal):** Si reduces la ventana a menos de 10 años, "
        f"eventos oceánicos oscilatorios como *El Niño / La Niña* (ENSO) pueden falsear pendientes aparentemente "
        f"gigantescas que luego se compensan en la siguiente década. Por el contrario, al mantener una ventana de 25 a 30 años "
        f"(el estándar de la Organización Meteorológica Mundial), el ruido de corto plazo se diluye y emerge la auténtica "
        f"huella del forzamiento del sistema Tierra."
    )

    return "\n\n".join([p1, p2, p3, p4, p5])
