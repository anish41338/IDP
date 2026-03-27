from typing import Dict, Optional

NORMS = {
    "male": {
        "18-30": {
            "height_cm": (170, 185),
            "shoulder_width_cm": (42, 52),
            "bmi": (18.5, 24.9),
        },
        "31-50": {
            "height_cm": (168, 183),
            "shoulder_width_cm": (41, 51),
            "bmi": (18.5, 24.9),
        },
        "51+": {
            "height_cm": (165, 181),
            "shoulder_width_cm": (40, 50),
            "bmi": (18.5, 24.9),
        },
    },
    "female": {
        "18-30": {
            "height_cm": (158, 173),
            "shoulder_width_cm": (36, 45),
            "bmi": (18.5, 24.9),
        },
        "31-50": {
            "height_cm": (157, 172),
            "shoulder_width_cm": (35, 44),
            "bmi": (18.5, 24.9),
        },
        "51+": {
            "height_cm": (155, 170),
            "shoulder_width_cm": (34, 43),
            "bmi": (18.5, 24.9),
        },
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
    gender_key = gender.lower() if gender else "male"
    if gender_key not in NORMS:
        gender_key = "male"
    age_band = _get_age_band(age)
    norms = NORMS[gender_key][age_band]
    result = {}

    for key, (low, high) in norms.items():
        value = measurements.get(key)
        if value is None:
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

    symmetry = measurements.get("symmetry_score")
    if symmetry is not None:
        result["symmetry_score"] = {
            "status": "normal" if symmetry >= 90 else "below_normal",
            "value": symmetry,
            "interpretation": symmetry_interpretation(symmetry),
        }

    return result


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
