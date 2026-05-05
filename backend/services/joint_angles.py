import math
import numpy as np
from typing import Dict, Tuple

WorldLandmarks = Dict[int, Tuple[float, float, float]]

# MediaPipe landmark indices
NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_ELBOW, RIGHT_ELBOW = 13, 14
LEFT_WRIST, RIGHT_WRIST = 15, 16
LEFT_PINKY, RIGHT_PINKY = 17, 18
LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28

VERTICAL = np.array([0.0, -1.0, 0.0])  # MediaPipe world: Y+ is down, so up is -Y


def _vec(lm: WorldLandmarks, a: int, b: int) -> np.ndarray:
    """Vector from landmark a to landmark b."""
    ax, ay, az = lm[a]
    bx, by, bz = lm[b]
    return np.array([bx - ax, by - ay, bz - az])


def _midpoint(lm: WorldLandmarks, a: int, b: int) -> Tuple[float, float, float]:
    ax, ay, az = lm[a]
    bx, by, bz = lm[b]
    return ((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)


def _mid_idx(lm: WorldLandmarks, a: int, b: int) -> int:
    """Return a synthetic key for midpoint; not used for lookups — use _midpoint directly."""
    return -1


def _angle_between(v1: np.ndarray, v2: np.ndarray) -> float:
    """Angle in degrees between two 3D vectors."""
    n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)
    if n1 < 1e-9 or n2 < 1e-9:
        return 0.0
    cos_a = np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0)
    return math.degrees(math.acos(cos_a))


def _three_point_angle(lm: WorldLandmarks, a: int, vertex: int, b: int) -> float:
    """Angle at `vertex` formed by landmarks a-vertex-b."""
    v1 = _vec(lm, vertex, a)
    v2 = _vec(lm, vertex, b)
    return _angle_between(v1, v2)


def _angle_from_vertical(lm: WorldLandmarks, a: int, b: int) -> float:
    """Angle of vector a→b relative to the upward vertical axis."""
    v = _vec(lm, a, b)
    return _angle_between(v, VERTICAL)


def _lateral_angle(lm: WorldLandmarks, a: int, b: int) -> float:
    """Lateral (X-axis) tilt of segment a→b, in degrees."""
    ax, ay, az = lm[a]
    bx, by, bz = lm[b]
    dx = bx - ax
    dy = by - ay
    return math.degrees(math.atan2(abs(dx), abs(dy) + 1e-9))


def compute_joint_angles(lm: WorldLandmarks) -> Dict[str, float]:
    """Compute all joint angles required for REBA and RULA scoring.

    Args:
        lm: Dict mapping MediaPipe landmark index → (x, y, z) world coords in meters.

    Returns:
        Flat dict of angle names → degrees.
    """
    # --- Spine / Trunk ---
    shoulder_mid = _midpoint(lm, LEFT_SHOULDER, RIGHT_SHOULDER)
    hip_mid = _midpoint(lm, LEFT_HIP, RIGHT_HIP)

    # Trunk flexion: angle of hip→shoulder segment from vertical
    trunk_vec = np.array([
        shoulder_mid[0] - hip_mid[0],
        shoulder_mid[1] - hip_mid[1],
        shoulder_mid[2] - hip_mid[2],
    ])
    trunk_flexion = _angle_between(trunk_vec, VERTICAL)

    # Trunk lateral bend: lateral component
    trunk_lateral = abs(math.degrees(math.atan2(
        abs(shoulder_mid[0] - hip_mid[0]),
        abs(shoulder_mid[1] - hip_mid[1]) + 1e-9
    )))

    # Trunk twist: rotation around Y-axis — compare shoulder and hip X-Z orientation
    shoulder_vec_xz = np.array([
        lm[RIGHT_SHOULDER][0] - lm[LEFT_SHOULDER][0],
        0.0,
        lm[RIGHT_SHOULDER][2] - lm[LEFT_SHOULDER][2],
    ])
    hip_vec_xz = np.array([
        lm[RIGHT_HIP][0] - lm[LEFT_HIP][0],
        0.0,
        lm[RIGHT_HIP][2] - lm[LEFT_HIP][2],
    ])
    trunk_twist = _angle_between(shoulder_vec_xz, hip_vec_xz)

    # --- Neck ---
    # Neck flexion: angle of shoulder_mid→nose from vertical
    neck_vec = np.array([
        lm[NOSE][0] - shoulder_mid[0],
        lm[NOSE][1] - shoulder_mid[1],
        lm[NOSE][2] - shoulder_mid[2],
    ])
    neck_flexion = _angle_between(neck_vec, VERTICAL)

    # --- Legs ---
    knee_flexion_left = _three_point_angle(lm, LEFT_HIP, LEFT_KNEE, LEFT_ANKLE)
    knee_flexion_right = _three_point_angle(lm, RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE)

    # --- Upper Arms ---
    # Upper arm flexion relative to trunk (not global vertical).
    # Measure angle between trunk vector and upper-arm vector at the shoulder.
    # trunk_vec points hip→shoulder. upper_arm_vec points shoulder→elbow.
    # 0° = arm hanging straight down along the trunk, 90° = arm horizontal.
    trunk_unit = trunk_vec / (np.linalg.norm(trunk_vec) + 1e-9)

    ua_vec_l = np.array(_vec(lm, LEFT_SHOULDER, LEFT_ELBOW))
    ua_vec_r = np.array(_vec(lm, RIGHT_SHOULDER, RIGHT_ELBOW))
    # Flip trunk_unit: trunk points hip→shoulder (upward), arm points shoulder→elbow (downward when at rest)
    # Angle between -trunk_unit (downward body axis) and upper arm vector
    down_trunk = -trunk_unit
    upper_arm_flexion_left = _angle_between(down_trunk, ua_vec_l)
    upper_arm_flexion_right = _angle_between(down_trunk, ua_vec_r)

    # Upper arm abduction: lateral deviation of upper arm from body midplane
    upper_arm_abduction_left = _lateral_angle(lm, LEFT_SHOULDER, LEFT_ELBOW)
    upper_arm_abduction_right = _lateral_angle(lm, RIGHT_SHOULDER, RIGHT_ELBOW)

    # --- Lower Arms ---
    lower_arm_flexion_left = _three_point_angle(lm, LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST)
    lower_arm_flexion_right = _three_point_angle(lm, RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST)

    # --- Wrists ---
    wrist_flexion_left = _three_point_angle(lm, LEFT_ELBOW, LEFT_WRIST, LEFT_PINKY)
    wrist_flexion_right = _three_point_angle(lm, RIGHT_ELBOW, RIGHT_WRIST, RIGHT_PINKY)

    return {
        "trunk_flexion": round(trunk_flexion, 1),
        "trunk_lateral_bend": round(trunk_lateral, 1),
        "trunk_twist": round(trunk_twist, 1),
        "neck_flexion": round(neck_flexion, 1),
        "knee_flexion_left": round(knee_flexion_left, 1),
        "knee_flexion_right": round(knee_flexion_right, 1),
        "upper_arm_flexion_left": round(upper_arm_flexion_left, 1),
        "upper_arm_flexion_right": round(upper_arm_flexion_right, 1),
        "upper_arm_abduction_left": round(upper_arm_abduction_left, 1),
        "upper_arm_abduction_right": round(upper_arm_abduction_right, 1),
        "lower_arm_flexion_left": round(lower_arm_flexion_left, 1),
        "lower_arm_flexion_right": round(lower_arm_flexion_right, 1),
        "wrist_flexion_left": round(wrist_flexion_left, 1),
        "wrist_flexion_right": round(wrist_flexion_right, 1),
    }
