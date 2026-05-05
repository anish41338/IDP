"""Clinical analytics: norm comparison, z-scores, longitudinal trend analysis."""

import math
from typing import Dict, List, Optional

# ─── Reference norms (mean, std) from WHO/NHANES/published anthropometry ────────
# Linear measurements in cm, angles in degrees.
# Format: key → {gender → {age_band → (mean, std)}}

NORMS_STATS: Dict[str, Dict[str, Dict[str, tuple]]] = {
    "height_cm": {
        "male":   {"18-30": (177.0, 7.0), "31-50": (176.0, 7.0), "51+": (173.0, 7.5)},
        "female": {"18-30": (163.0, 6.5), "31-50": (162.5, 6.5), "51+": (160.0, 7.0)},
    },
    "shoulder_width_cm": {
        "male":   {"18-30": (47.0, 3.0), "31-50": (46.5, 3.0), "51+": (45.0, 3.5)},
        "female": {"18-30": (40.5, 2.8), "31-50": (40.0, 2.8), "51+": (38.5, 3.0)},
    },
    "arm_span_cm": {
        "male":   {"18-30": (178.5, 8.0), "31-50": (177.0, 8.0), "51+": (174.0, 8.5)},
        "female": {"18-30": (163.5, 7.5), "31-50": (162.5, 7.5), "51+": (160.0, 8.0)},
    },
    "torso_length_cm": {
        "male":   {"18-30": (52.0, 3.5), "31-50": (51.5, 3.5), "51+": (50.5, 4.0)},
        "female": {"18-30": (47.5, 3.0), "31-50": (47.0, 3.0), "51+": (46.0, 3.5)},
    },
    "inseam_estimate_cm": {
        "male":   {"18-30": (80.0, 4.5), "31-50": (79.5, 4.5), "51+": (78.0, 5.0)},
        "female": {"18-30": (75.0, 4.0), "31-50": (74.5, 4.0), "51+": (73.0, 4.5)},
    },
    "ape_index": {
        "male":   {"18-30": (1.005, 0.035), "31-50": (1.005, 0.035), "51+": (1.005, 0.035)},
        "female": {"18-30": (1.003, 0.032), "31-50": (1.003, 0.032), "51+": (1.003, 0.032)},
    },
    "cormic_index": {
        "male":   {"18-30": (0.295, 0.018), "31-50": (0.293, 0.018), "51+": (0.292, 0.020)},
        "female": {"18-30": (0.292, 0.017), "31-50": (0.290, 0.017), "51+": (0.288, 0.019)},
    },
    "symmetry_score": {
        "male":   {"18-30": (97.5, 2.0), "31-50": (97.0, 2.5), "51+": (96.0, 3.0)},
        "female": {"18-30": (97.5, 2.0), "31-50": (97.0, 2.5), "51+": (96.0, 3.0)},
    },
    "shoulder_hip_ratio": {
        "male":   {"18-30": (1.35, 0.08), "31-50": (1.33, 0.09), "51+": (1.30, 0.10)},
        "female": {"18-30": (1.18, 0.08), "31-50": (1.16, 0.09), "51+": (1.14, 0.10)},
    },
}

# Simple range-based norms kept for backward compat with compare_to_norms
NORMS: Dict[str, Dict[str, Dict[str, tuple]]] = {
    "male": {
        "18-30": {"height_cm": (170, 185), "shoulder_width_cm": (42, 52)},
        "31-50": {"height_cm": (168, 183), "shoulder_width_cm": (41, 51)},
        "51+":   {"height_cm": (165, 181), "shoulder_width_cm": (40, 50)},
    },
    "female": {
        "18-30": {"height_cm": (158, 173), "shoulder_width_cm": (36, 45)},
        "31-50": {"height_cm": (157, 172), "shoulder_width_cm": (35, 44)},
        "51+":   {"height_cm": (155, 170), "shoulder_width_cm": (34, 43)},
    },
}


def _get_age_band(age: int) -> str:
    if age <= 30:
        return "18-30"
    elif age <= 50:
        return "31-50"
    return "51+"


def compute_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)


def bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "Underweight"
    elif bmi < 25:
        return "Normal"
    elif bmi < 30:
        return "Overweight"
    return "Obese"


def symmetry_interpretation(score: float) -> str:
    if score >= 95:
        return "Excellent symmetry"
    elif score >= 90:
        return "Good symmetry"
    elif score >= 80:
        return "Mild asymmetry — monitor"
    return "Significant asymmetry — clinical review recommended"


def compare_to_norms(measurements: Dict, age: int, gender: str) -> Dict:
    """Range-based norm comparison + per-metric z-scores."""
    gender_key = gender.lower() if gender else "male"
    if gender_key not in NORMS:
        gender_key = "male"
    age_band = _get_age_band(age)
    norms = NORMS[gender_key][age_band]
    result: Dict = {}

    for key, (low, high) in norms.items():
        value = measurements.get(key)
        if value is None or not isinstance(value, (int, float)):
            continue
        if low <= value <= high:
            status = "normal"
        elif value < low:
            status = "below_normal"
        else:
            status = "above_normal"
        result[key] = {
            "status": status,
            "value": value,
            "norm_range": [low, high],
        }

    # Add z-scores for all metrics that have stats norms
    z_scores = compute_z_scores(measurements, age, gender)
    for key, z_data in z_scores.items():
        if key in result:
            result[key].update(z_data)
        else:
            result[key] = z_data

    symmetry = measurements.get("symmetry_score")
    if symmetry is not None and "symmetry_score" not in result:
        result["symmetry_score"] = {
            "status": "normal" if symmetry >= 90 else "below_normal",
            "value": symmetry,
            "interpretation": symmetry_interpretation(symmetry),
        }

    return result


def compute_z_scores(measurements: Dict, age: int, gender: str) -> Dict:
    """Compute z-scores for all measurement keys present in NORMS_STATS."""
    gender_key = gender.lower() if gender else "male"
    if gender_key not in ("male", "female"):
        gender_key = "male"
    age_band = _get_age_band(age)
    result: Dict = {}

    for key, gender_map in NORMS_STATS.items():
        value = measurements.get(key)
        if value is None or not isinstance(value, (int, float)):
            continue
        gmap = gender_map.get(gender_key, gender_map.get("male", {}))
        if age_band not in gmap:
            continue
        mean, std = gmap[age_band]
        z = round((value - mean) / std, 2) if std > 0 else 0.0
        percentile = round(_z_to_percentile(z) * 100, 1)
        result[key] = {
            "value": value,
            "z_score": z,
            "percentile": percentile,
            "norm_mean": mean,
            "norm_std": std,
            "status": "normal" if abs(z) <= 1.5 else ("above_normal" if z > 0 else "below_normal"),
        }

    return result


def _z_to_percentile(z: float) -> float:
    """Approximate normal CDF using Abramowitz & Stegun."""
    t = 1.0 / (1.0 + 0.2316419 * abs(z))
    poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
    p = 1.0 - (1.0 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * z * z) * poly
    return p if z >= 0 else 1.0 - p


def compute_progress_delta(current: Dict, previous: Dict) -> Dict:
    delta = {}
    for key in current:
        curr_val = current.get(key)
        prev_val = previous.get(key)
        if isinstance(curr_val, (int, float)) and isinstance(prev_val, (int, float)) and prev_val != 0:
            pct = round(((curr_val - prev_val) / abs(prev_val)) * 100, 2)
            delta[key] = {
                "current": curr_val,
                "previous": prev_val,
                "change_pct": pct,
            }
    return delta


def compute_longitudinal_trends(sessions: List[Dict]) -> Dict:
    """Mann-Kendall trend test on multi-session measurement series.

    Args:
        sessions: List of session dicts ordered oldest→newest,
                  each with a 'measurements' key.

    Returns:
        Dict mapping metric → {trend, s_statistic, n, values}
    """
    if len(sessions) < 3:
        return {}

    # Collect all numeric scalar measurement keys
    all_keys: set = set()
    for s in sessions:
        m = s.get("measurements") or {}
        all_keys.update(k for k, v in m.items() if isinstance(v, (int, float)))

    results: Dict = {}
    for key in all_keys:
        series = []
        for s in sessions:
            m = s.get("measurements") or {}
            v = m.get(key)
            if isinstance(v, (int, float)):
                series.append(v)

        if len(series) < 3:
            continue

        n = len(series)
        # Mann-Kendall S statistic
        s_stat = 0
        for i in range(n - 1):
            for j in range(i + 1, n):
                diff = series[j] - series[i]
                if diff > 0:
                    s_stat += 1
                elif diff < 0:
                    s_stat -= 1

        # Variance under H0 (no ties assumed for simplicity)
        var_s = n * (n - 1) * (2 * n + 5) / 18.0
        if var_s > 0:
            z_mk = (s_stat - 1) / math.sqrt(var_s) if s_stat > 0 else (
                (s_stat + 1) / math.sqrt(var_s) if s_stat < 0 else 0.0
            )
            p_approx = round(2 * (1 - _z_to_percentile(abs(z_mk))), 4)
        else:
            z_mk = 0.0
            p_approx = 1.0

        if s_stat > 0:
            trend = "improving" if key in ("symmetry_score", "depth_confidence") else "increasing"
        elif s_stat < 0:
            trend = "worsening" if key in ("symmetry_score", "depth_confidence") else "decreasing"
        else:
            trend = "stable"

        # For REBA: higher = worse
        if key in ("reba", "reba_final_score"):
            trend = "worsening" if s_stat > 0 else ("improving" if s_stat < 0 else "stable")

        results[key] = {
            "trend": trend,
            "s_statistic": s_stat,
            "z_statistic": round(z_mk, 3),
            "p_value": p_approx,
            "significant": p_approx < 0.05,
            "n": n,
            "values": series,
        }

    return results
