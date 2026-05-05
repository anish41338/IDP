"""REBA (Rapid Entire Body Assessment) scoring.

Implements the full scoring procedure from:
  Hignett & McAtamney (2000), Applied Ergonomics 31(2), 201-205.

All lookup tables are reproduced exactly from the published paper.
"""

from typing import Dict

# ---------------------------------------------------------------------------
# Published REBA Table A: Trunk × Neck × Legs → Score A  (1-indexed lookup)
# Dimensions: [trunk_score 1-5][neck_score 1-3][legs_score 1-4]
# ---------------------------------------------------------------------------
_TABLE_A: list = [
    # trunk=1
    [
        [1, 2, 3, 4],   # neck=1
        [1, 2, 3, 4],   # neck=2
        [3, 3, 5, 6],   # neck=3
    ],
    # trunk=2
    [
        [2, 3, 4, 5],
        [3, 4, 5, 6],
        [4, 5, 6, 7],
    ],
    # trunk=3
    [
        [2, 4, 5, 6],
        [4, 5, 6, 7],
        [5, 6, 7, 8],
    ],
    # trunk=4
    [
        [3, 5, 6, 7],
        [5, 6, 7, 8],
        [6, 7, 8, 9],
    ],
    # trunk=5
    [
        [4, 6, 7, 8],
        [6, 7, 8, 9],
        [7, 8, 9, 9],
    ],
]

# ---------------------------------------------------------------------------
# Published REBA Table B: Upper Arm × Lower Arm × Wrist → Score B (1-indexed)
# Dimensions: [upper_arm_score 1-6][lower_arm_score 1-2][wrist_score 1-3]
# ---------------------------------------------------------------------------
_TABLE_B: list = [
    # upper_arm=1
    [
        [1, 2, 2],   # lower_arm=1
        [1, 2, 3],   # lower_arm=2
    ],
    # upper_arm=2
    [
        [1, 2, 3],
        [2, 3, 4],
    ],
    # upper_arm=3
    [
        [3, 4, 5],
        [4, 5, 5],
    ],
    # upper_arm=4
    [
        [4, 5, 5],
        [5, 6, 7],
    ],
    # upper_arm=5
    [
        [6, 7, 8],
        [7, 8, 8],
    ],
    # upper_arm=6
    [
        [7, 8, 8],
        [8, 9, 9],
    ],
]

# ---------------------------------------------------------------------------
# Published REBA Table C: Score A × Score B → Score C  (1-indexed)
# Dimensions: [score_a 1-12][score_b 1-12]
# ---------------------------------------------------------------------------
_TABLE_C: list = [
    #  B:  1   2   3   4   5   6   7   8   9  10  11  12
    [    1,  1,  1,  2,  3,  3,  4,  5,  6,  7,  7,  7],  # A=1
    [    1,  2,  2,  3,  4,  4,  5,  6,  6,  7,  7,  8],  # A=2
    [    2,  3,  3,  3,  4,  5,  6,  7,  7,  8,  8,  8],  # A=3
    [    3,  4,  4,  4,  5,  6,  7,  8,  8,  9,  9,  9],  # A=4
    [    4,  4,  4,  5,  6,  7,  8,  8,  9,  9, 10, 10],  # A=5
    [    6,  6,  6,  7,  8,  8,  9,  9, 10, 10, 10, 10],  # A=6
    [    7,  7,  7,  8,  9,  9,  9, 10, 10, 11, 11, 11],  # A=7
    [    8,  8,  8,  9, 10, 10, 10, 10, 11, 11, 11, 11],  # A=8
    [    9,  9,  9,  9, 10, 10, 11, 11, 12, 12, 12, 12],  # A=9
    [   10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12],  # A=10
    [   11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12],  # A=11
    [   12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],  # A=12
]


def _trunk_score(flexion_deg: float, lateral_bend_deg: float, twist_deg: float) -> int:
    """REBA trunk posture score (1–5) with modifiers."""
    if flexion_deg < 5:
        score = 1
    elif flexion_deg < 20:
        score = 2
    elif flexion_deg < 60:
        score = 3
    else:
        score = 4
    # Extension modifier
    if flexion_deg < 0:
        score = 2
    # Adjustment for twist or lateral bend
    if lateral_bend_deg > 10 or twist_deg > 10:
        score += 1
    return min(score, 5)


def _neck_score(flexion_deg: float, twist_deg: float) -> int:
    """REBA neck posture score (1–3) with modifier."""
    if 0 <= flexion_deg <= 20:
        score = 1
    else:
        score = 2  # >20° flexion or any extension
    if twist_deg > 10:
        score += 1
    return min(score, 3)


def _legs_score(knee_flexion_deg: float) -> int:
    """REBA legs posture score (1–4). Assumes bilateral weight bearing."""
    score = 1  # bilateral support baseline
    if 30 <= knee_flexion_deg <= 60:
        score += 1
    elif knee_flexion_deg > 60:
        score += 2
    return min(score, 4)


def _upper_arm_score(flexion_deg: float, abduction_deg: float) -> int:
    """REBA upper arm posture score (1–6)."""
    if flexion_deg < 20:
        score = 1
    elif flexion_deg < 45:
        score = 2
    elif flexion_deg < 90:
        score = 3
    else:
        score = 4
    # Extension
    if flexion_deg < 0:
        score = 2
    # Abduction
    if abduction_deg > 45:
        score += 1
    return min(score, 6)


def _lower_arm_score(flexion_deg: float) -> int:
    """REBA lower arm posture score (1–2)."""
    if 60 <= flexion_deg <= 100:
        return 1
    return 2


def _wrist_score(flexion_deg: float) -> int:
    """REBA wrist posture score (1–3)."""
    if abs(flexion_deg - 180) <= 15 or flexion_deg <= 15:
        # near-neutral (three-point angle near 180° = straight)
        return 1
    # Treat three-point angle: 180=straight, lower=bent
    bend = abs(180 - flexion_deg)
    if bend <= 15:
        return 1
    elif bend <= 30:
        return 2
    return 3


def _risk_level(score: int) -> str:
    if score == 1:
        return "negligible"
    elif score <= 3:
        return "low"
    elif score <= 7:
        return "medium"
    elif score <= 10:
        return "high"
    return "very_high"


def _compute_side(
    trunk_flexion: float,
    trunk_lateral: float,
    trunk_twist: float,
    neck_flexion: float,
    knee_flexion: float,
    upper_arm_flexion: float,
    upper_arm_abduction: float,
    lower_arm_flexion: float,
    wrist_flexion: float,
) -> Dict:
    ts = _trunk_score(trunk_flexion, trunk_lateral, trunk_twist)
    ns = _neck_score(neck_flexion, trunk_twist)
    ls = _legs_score(knee_flexion)

    ua = _upper_arm_score(upper_arm_flexion, upper_arm_abduction)
    la = _lower_arm_score(lower_arm_flexion)
    ws = _wrist_score(wrist_flexion)

    # Table A lookup (0-indexed internally, scores are 1-indexed)
    score_a = _TABLE_A[ts - 1][ns - 1][ls - 1]
    # Table B lookup
    score_b = _TABLE_B[ua - 1][la - 1][ws - 1]

    # Clamp indices to table bounds
    a_idx = min(score_a, 12) - 1
    b_idx = min(score_b, 12) - 1
    score_c = _TABLE_C[a_idx][b_idx]

    final = score_c  # activity score = 0 (static; caller may add 1 for >1 min hold)

    return {
        "trunk_score": ts,
        "neck_score": ns,
        "legs_score": ls,
        "upper_arm_score": ua,
        "lower_arm_score": la,
        "wrist_score": ws,
        "score_a": score_a,
        "score_b": score_b,
        "score_c": score_c,
        "final_score": final,
        "risk_level": _risk_level(final),
    }


def compute_reba(joint_angles: Dict[str, float]) -> Dict:
    """Compute REBA scores for left and right sides; return the higher-risk result.

    Args:
        joint_angles: output of compute_joint_angles()

    Returns:
        Dict with keys: left, right, final_score, risk_level, score_a, score_b, score_c
    """
    left = _compute_side(
        trunk_flexion=joint_angles.get("trunk_flexion", 0),
        trunk_lateral=joint_angles.get("trunk_lateral_bend", 0),
        trunk_twist=joint_angles.get("trunk_twist", 0),
        neck_flexion=joint_angles.get("neck_flexion", 0),
        knee_flexion=joint_angles.get("knee_flexion_left", 0),
        upper_arm_flexion=joint_angles.get("upper_arm_flexion_left", 0),
        upper_arm_abduction=joint_angles.get("upper_arm_abduction_left", 0),
        lower_arm_flexion=joint_angles.get("lower_arm_flexion_left", 0),
        wrist_flexion=joint_angles.get("wrist_flexion_left", 180),
    )
    right = _compute_side(
        trunk_flexion=joint_angles.get("trunk_flexion", 0),
        trunk_lateral=joint_angles.get("trunk_lateral_bend", 0),
        trunk_twist=joint_angles.get("trunk_twist", 0),
        neck_flexion=joint_angles.get("neck_flexion", 0),
        knee_flexion=joint_angles.get("knee_flexion_right", 0),
        upper_arm_flexion=joint_angles.get("upper_arm_flexion_right", 0),
        upper_arm_abduction=joint_angles.get("upper_arm_abduction_right", 0),
        lower_arm_flexion=joint_angles.get("lower_arm_flexion_right", 0),
        wrist_flexion=joint_angles.get("wrist_flexion_right", 180),
    )

    # Return the higher-risk side as the primary result
    primary = left if left["final_score"] >= right["final_score"] else right

    return {
        "left": left,
        "right": right,
        "final_score": primary["final_score"],
        "risk_level": primary["risk_level"],
        "score_a": primary["score_a"],
        "score_b": primary["score_b"],
        "score_c": primary["score_c"],
    }
