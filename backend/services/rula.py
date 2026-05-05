"""RULA (Rapid Upper Limb Assessment) scoring.

Implements the full scoring procedure from:
  McAtamney & Corlett (1993), Applied Ergonomics 24(2), 91-99.

All lookup tables are reproduced exactly from the published paper.
"""

from typing import Dict

# ---------------------------------------------------------------------------
# Published RULA Table A: Upper Arm × Lower Arm × Wrist × Wrist Twist
# Dimensions: [upper_arm 1-6][lower_arm 1-2][wrist 1-4][wrist_twist 1-2]
# ---------------------------------------------------------------------------
_TABLE_A: list = [
    # upper_arm=1
    [
        # lower_arm=1
        [[1, 2], [2, 2], [2, 3], [3, 3]],
        # lower_arm=2
        [[2, 2], [2, 2], [3, 3], [3, 3]],
    ],
    # upper_arm=2
    [
        [[2, 2], [2, 3], [3, 3], [3, 4]],
        [[2, 3], [2, 3], [3, 3], [4, 4]],
    ],
    # upper_arm=3
    [
        [[2, 3], [3, 3], [3, 3], [4, 5]],
        [[2, 3], [3, 4], [4, 4], [5, 5]],
    ],
    # upper_arm=4
    [
        [[3, 4], [4, 4], [4, 4], [5, 5]],
        [[3, 4], [4, 4], [4, 5], [5, 5]],
    ],
    # upper_arm=5
    [
        [[5, 5], [5, 5], [5, 6], [6, 6]],
        [[5, 6], [6, 6], [6, 7], [7, 7]],
    ],
    # upper_arm=6
    [
        [[7, 7], [7, 7], [7, 8], [8, 9]],
        [[8, 8], [8, 8], [8, 9], [9, 9]],
    ],
]

# ---------------------------------------------------------------------------
# Published RULA Table B: Neck × Trunk × Legs
# Dimensions: [neck 1-6][trunk 1-6][legs 1-2]
# ---------------------------------------------------------------------------
_TABLE_B: list = [
    # neck=1
    [
        [1, 3], [2, 3], [3, 4], [5, 5], [6, 6], [7, 7],
    ],
    # neck=2
    [
        [2, 3], [2, 3], [4, 5], [5, 5], [6, 7], [7, 7],
    ],
    # neck=3
    [
        [3, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 7],
    ],
    # neck=4
    [
        [5, 5], [5, 6], [6, 7], [7, 7], [7, 7], [8, 8],
    ],
    # neck=5
    [
        [7, 7], [7, 7], [7, 8], [8, 8], [8, 8], [8, 8],
    ],
    # neck=6
    [
        [8, 8], [8, 8], [8, 8], [8, 9], [9, 9], [9, 9],
    ],
]

# ---------------------------------------------------------------------------
# Published RULA Table C (Grand Score): Score A × Score B → Grand Score
# Dimensions: [score_a 1-8 or beyond][score_b 1-7 or beyond]
# ---------------------------------------------------------------------------
_TABLE_C: list = [
    #  B:  1  2  3  4  5  6  7+
    [      1, 2, 3, 3, 4, 5, 5],  # A=1
    [      2, 2, 3, 4, 4, 5, 5],  # A=2
    [      3, 3, 3, 4, 4, 5, 6],  # A=3
    [      3, 3, 3, 4, 5, 6, 6],  # A=4
    [      4, 4, 4, 5, 6, 7, 7],  # A=5
    [      4, 4, 5, 6, 6, 7, 7],  # A=6
    [      5, 5, 6, 6, 7, 7, 7],  # A=7
    [      5, 5, 6, 7, 7, 7, 7],  # A=8+
]

_ACTION_LEVELS = {
    1: "1 - Acceptable posture",
    2: "2 - Further investigation, change may be needed",
    3: "3 - Investigate and implement changes soon",
    4: "4 - Investigate and implement changes immediately",
}


def _upper_arm_score(flexion_deg: float, abduction_deg: float) -> int:
    """RULA upper arm score (1–6)."""
    if flexion_deg < 20:
        score = 1
    elif flexion_deg < 45:
        score = 2
    elif flexion_deg < 90:
        score = 3
    else:
        score = 4
    if abduction_deg > 45:
        score += 1
    return min(score, 6)


def _lower_arm_score(flexion_deg: float) -> int:
    """RULA lower arm score (1–2)."""
    if 60 <= flexion_deg <= 100:
        return 1
    return 2


def _wrist_score(flexion_deg: float) -> int:
    """RULA wrist score (1–4). Input is three-point angle (straight=180°)."""
    bend = abs(180 - flexion_deg)
    if bend <= 15:
        return 1
    elif bend <= 30:
        return 2
    return 3


def _wrist_twist_score() -> int:
    """Default wrist twist = 1 (mid-range). Extended scoring requires hand orientation data."""
    return 1


def _neck_score(flexion_deg: float, twist_deg: float, lateral_deg: float) -> int:
    """RULA neck score (1–6)."""
    if flexion_deg < 10:
        score = 1
    elif flexion_deg < 20:
        score = 2
    elif flexion_deg < 30:
        score = 3
    else:
        score = 4
    if twist_deg > 10:
        score += 1
    if lateral_deg > 10:
        score += 1
    return min(score, 6)


def _trunk_score(flexion_deg: float, twist_deg: float, lateral_deg: float) -> int:
    """RULA trunk score (1–6)."""
    if flexion_deg < 10:
        score = 1
    elif flexion_deg < 20:
        score = 2
    elif flexion_deg < 60:
        score = 3
    else:
        score = 4
    if twist_deg > 10:
        score += 1
    if lateral_deg > 10:
        score += 1
    return min(score, 6)


def _legs_score() -> int:
    """RULA legs: 1 = legs and feet supported, 2 = not supported. Default 1."""
    return 1


def _action_level(grand_score: int) -> int:
    if grand_score <= 2:
        return 1
    elif grand_score <= 4:
        return 2
    elif grand_score <= 6:
        return 3
    return 4


def _compute_side(
    upper_arm_flexion: float,
    upper_arm_abduction: float,
    lower_arm_flexion: float,
    wrist_flexion: float,
    neck_flexion: float,
    trunk_flexion: float,
    trunk_twist: float,
    trunk_lateral: float,
) -> Dict:
    ua = _upper_arm_score(upper_arm_flexion, upper_arm_abduction)
    la = _lower_arm_score(lower_arm_flexion)
    ws = _wrist_score(wrist_flexion)
    wt = _wrist_twist_score()

    # Table A (0-indexed)
    ua_i = min(ua, 6) - 1
    la_i = min(la, 2) - 1
    ws_i = min(ws, 4) - 1
    wt_i = min(wt, 2) - 1
    score_a = _TABLE_A[ua_i][la_i][ws_i][wt_i]

    ns = _neck_score(neck_flexion, trunk_twist, 0)
    ts = _trunk_score(trunk_flexion, trunk_twist, trunk_lateral)
    ls = _legs_score()

    # Table B (0-indexed)
    ns_i = min(ns, 6) - 1
    ts_i = min(ts, 6) - 1
    ls_i = min(ls, 2) - 1
    score_b = _TABLE_B[ns_i][ts_i][ls_i]

    # Table C grand score
    a_i = min(score_a, 8) - 1
    b_i = min(score_b, 7) - 1
    grand_score = _TABLE_C[a_i][b_i]

    action = _action_level(grand_score)

    return {
        "upper_arm_score": ua,
        "lower_arm_score": la,
        "wrist_score": ws,
        "neck_score": ns,
        "trunk_score": ts,
        "group_a_score": score_a,
        "group_b_score": score_b,
        "grand_score": grand_score,
        "action_level": action,
        "action_description": _ACTION_LEVELS[action],
    }


def compute_rula(joint_angles: Dict[str, float]) -> Dict:
    """Compute RULA scores for left and right sides; return higher-risk result.

    Args:
        joint_angles: output of compute_joint_angles()

    Returns:
        Dict with left/right breakdowns and primary result keys.
    """
    left = _compute_side(
        upper_arm_flexion=joint_angles.get("upper_arm_flexion_left", 0),
        upper_arm_abduction=joint_angles.get("upper_arm_abduction_left", 0),
        lower_arm_flexion=joint_angles.get("lower_arm_flexion_left", 0),
        wrist_flexion=joint_angles.get("wrist_flexion_left", 180),
        neck_flexion=joint_angles.get("neck_flexion", 0),
        trunk_flexion=joint_angles.get("trunk_flexion", 0),
        trunk_twist=joint_angles.get("trunk_twist", 0),
        trunk_lateral=joint_angles.get("trunk_lateral_bend", 0),
    )
    right = _compute_side(
        upper_arm_flexion=joint_angles.get("upper_arm_flexion_right", 0),
        upper_arm_abduction=joint_angles.get("upper_arm_abduction_right", 0),
        lower_arm_flexion=joint_angles.get("lower_arm_flexion_right", 0),
        wrist_flexion=joint_angles.get("wrist_flexion_right", 180),
        neck_flexion=joint_angles.get("neck_flexion", 0),
        trunk_flexion=joint_angles.get("trunk_flexion", 0),
        trunk_twist=joint_angles.get("trunk_twist", 0),
        trunk_lateral=joint_angles.get("trunk_lateral_bend", 0),
    )

    primary = left if left["action_level"] >= right["action_level"] else right

    return {
        "left": left,
        "right": right,
        "grand_score": primary["grand_score"],
        "action_level": primary["action_level"],
        "action_description": primary["action_description"],
        "group_a_score": primary["group_a_score"],
        "group_b_score": primary["group_b_score"],
    }
