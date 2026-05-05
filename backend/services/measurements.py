"""3D anthropometric measurement engine.

Uses MediaPipe POSE_WORLD_LANDMARKS (metric, hip-centred coordinate system)
after per-landmark Kalman filtering. All distances are true 3D Euclidean
distances, not projected 2D pixel distances.
"""

import math
from typing import Dict, Optional, Tuple

WorldLandmarks = Dict[int, Tuple[float, float, float]]

# MediaPipe landmark indices
NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_ELBOW, RIGHT_ELBOW = 13, 14
LEFT_WRIST, RIGHT_WRIST = 15, 16
LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28


def _dist3(lm: WorldLandmarks, a: int, b: int) -> float:
    """3D Euclidean distance between two landmarks (world metres)."""
    ax, ay, az = lm[a]
    bx, by, bz = lm[b]
    return math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2)


def _midpoint(lm: WorldLandmarks, a: int, b: int) -> Tuple[float, float, float]:
    ax, ay, az = lm[a]
    bx, by, bz = lm[b]
    return ((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)


def _dist3_pts(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> float:
    return math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2)


def _compute_scale(lm: WorldLandmarks, real_height_cm: float) -> float:
    """Derive a world-metres-to-cm scalar anchored on the user's stated height.

    MediaPipe world Y-axis: positive = downward.
    Height span = Y(ankles) - Y(nose)  [both values, ankle is more positive].
    """
    nose_y = lm[NOSE][1]
    ankle_y = max(lm[LEFT_ANKLE][1], lm[RIGHT_ANKLE][1])
    world_height_m = abs(ankle_y - nose_y)
    if world_height_m < 0.01:
        return real_height_cm  # degenerate fallback
    return real_height_cm / world_height_m


def compute_all_measurements(
    world_lm: WorldLandmarks,
    real_height_cm: float,
    visibilities: list = None,
) -> Dict:
    """Compute full anthropometric profile from 3D Kalman-smoothed world landmarks.

    Args:
        world_lm: Dict[landmark_index → (x, y, z)] in MediaPipe world metres.
        real_height_cm: User's stated height used as calibration anchor.

    Returns:
        Dict of measurements — all linear dims in cm, angles in degrees.
    """
    scale = _compute_scale(world_lm, real_height_cm)

    def cm(metres: float) -> float:
        return round(metres * scale, 1)

    # Visibility helper — returns True only if ALL given landmarks are visible enough
    def _vis_ok(*idxs: int, threshold: float = 0.5) -> bool:
        if visibilities is None:
            return True
        return all(visibilities[i] >= threshold for i in idxs if i < len(visibilities))

    shoulder_width_cm = cm(_dist3(world_lm, LEFT_SHOULDER, RIGHT_SHOULDER))

    arm_length_left = cm(
        _dist3(world_lm, LEFT_SHOULDER, LEFT_ELBOW)
        + _dist3(world_lm, LEFT_ELBOW, LEFT_WRIST)
    )
    arm_length_right = cm(
        _dist3(world_lm, RIGHT_SHOULDER, RIGHT_ELBOW)
        + _dist3(world_lm, RIGHT_ELBOW, RIGHT_WRIST)
    )

    # Arm span: kinematic chain left wrist → right wrist
    arm_span_cm = cm(
        _dist3(world_lm, LEFT_WRIST, LEFT_ELBOW)
        + _dist3(world_lm, LEFT_ELBOW, LEFT_SHOULDER)
        + _dist3(world_lm, LEFT_SHOULDER, RIGHT_SHOULDER)
        + _dist3(world_lm, RIGHT_SHOULDER, RIGHT_ELBOW)
        + _dist3(world_lm, RIGHT_ELBOW, RIGHT_WRIST)
    )

    shoulder_mid = _midpoint(world_lm, LEFT_SHOULDER, RIGHT_SHOULDER)
    hip_mid = _midpoint(world_lm, LEFT_HIP, RIGHT_HIP)
    ankle_mid = _midpoint(world_lm, LEFT_ANKLE, RIGHT_ANKLE)

    torso_length_cm = cm(_dist3_pts(shoulder_mid, hip_mid))
    inseam_estimate_cm = (
        cm(_dist3_pts(hip_mid, ankle_mid))
        if _vis_ok(LEFT_ANKLE, RIGHT_ANKLE)
        else None
    )

    upper_arm_left_cm = cm(_dist3(world_lm, LEFT_SHOULDER, LEFT_ELBOW))
    upper_arm_right_cm = cm(_dist3(world_lm, RIGHT_SHOULDER, RIGHT_ELBOW))
    forearm_left_cm = cm(_dist3(world_lm, LEFT_ELBOW, LEFT_WRIST))
    forearm_right_cm = cm(_dist3(world_lm, RIGHT_ELBOW, RIGHT_WRIST))
    # Leg measurements only when landmarks are clearly visible (not sitting/occluded)
    thigh_left_cm = cm(_dist3(world_lm, LEFT_HIP, LEFT_KNEE)) if _vis_ok(LEFT_HIP, LEFT_KNEE) else None
    thigh_right_cm = cm(_dist3(world_lm, RIGHT_HIP, RIGHT_KNEE)) if _vis_ok(RIGHT_HIP, RIGHT_KNEE) else None
    shank_left_cm = cm(_dist3(world_lm, LEFT_KNEE, LEFT_ANKLE)) if _vis_ok(LEFT_KNEE, LEFT_ANKLE) else None
    shank_right_cm = cm(_dist3(world_lm, RIGHT_KNEE, RIGHT_ANKLE)) if _vis_ok(RIGHT_KNEE, RIGHT_ANKLE) else None

    # Posture angle: shoulder line tilt in frontal plane
    lsx, lsy, _ = world_lm[LEFT_SHOULDER]
    rsx, rsy, _ = world_lm[RIGHT_SHOULDER]
    posture_angle_deg = round(math.degrees(math.atan2(rsy - lsy, rsx - lsx)), 2)

    max_arm = max(arm_length_left, arm_length_right)
    symmetry_score = (
        round(100.0 * (1 - abs(arm_length_left - arm_length_right) / max_arm), 1)
        if max_arm > 0
        else 100.0
    )

    ape_index: Optional[float] = (
        round(arm_span_cm / real_height_cm, 3) if real_height_cm > 0 else None
    )

    # Cormic index: torso / total height proxy (clinical proportion index)
    cormic_index: Optional[float] = (
        round(torso_length_cm / real_height_cm, 3) if real_height_cm > 0 else None
    )

    # Bilateral LSI per paired segment: 2*|L-R|/(L+R)*100 — clinical threshold >10%
    def lsi(left: Optional[float], right: Optional[float]) -> Optional[float]:
        if left is None or right is None:
            return None
        denom = left + right
        if denom < 0.1:
            return None
        return round(200.0 * abs(left - right) / denom, 1)

    lsi_arm = lsi(arm_length_left, arm_length_right)
    lsi_upper_arm = lsi(upper_arm_left_cm, upper_arm_right_cm)
    lsi_forearm = lsi(forearm_left_cm, forearm_right_cm)
    lsi_thigh = lsi(thigh_left_cm, thigh_right_cm)
    lsi_shank = lsi(shank_left_cm, shank_right_cm)

    # Shoulder-to-hip width ratio (ergonomic proportion)
    hip_width_cm = cm(_dist3(world_lm, LEFT_HIP, RIGHT_HIP))
    shoulder_hip_ratio: Optional[float] = (
        round(shoulder_width_cm / hip_width_cm, 3) if hip_width_cm > 0 else None
    )

    # Depth confidence: consistency check between Z-spread and known shoulder width
    # If body is rotated, Z-spread collapses relative to expected width
    lm_lsx, _, lm_lsz = world_lm[LEFT_SHOULDER]
    lm_rsx, _, lm_rsz = world_lm[RIGHT_SHOULDER]
    shoulder_z_spread_m = abs(lm_lsz - lm_rsz)
    shoulder_world_dist_m = _dist3(world_lm, LEFT_SHOULDER, RIGHT_SHOULDER)
    depth_confidence: float = round(
        1.0 - min(shoulder_z_spread_m / (shoulder_world_dist_m + 1e-6), 1.0), 3
    ) if shoulder_world_dist_m > 0.01 else 1.0

    return {
        "height_cm": round(real_height_cm, 1),
        "shoulder_width_cm": shoulder_width_cm,
        "arm_length_left_cm": arm_length_left,
        "arm_length_right_cm": arm_length_right,
        "arm_span_cm": arm_span_cm,
        "torso_length_cm": torso_length_cm,
        "inseam_estimate_cm": inseam_estimate_cm,
        "upper_arm_left_cm": upper_arm_left_cm,
        "upper_arm_right_cm": upper_arm_right_cm,
        "forearm_left_cm": forearm_left_cm,
        "forearm_right_cm": forearm_right_cm,
        "thigh_left_cm": thigh_left_cm,
        "thigh_right_cm": thigh_right_cm,
        "shank_left_cm": shank_left_cm,
        "shank_right_cm": shank_right_cm,
        "hip_width_cm": hip_width_cm,
        "posture_angle_deg": posture_angle_deg,
        "symmetry_score": symmetry_score,
        "ape_index": ape_index,
        "cormic_index": cormic_index,
        "shoulder_hip_ratio": shoulder_hip_ratio,
        "depth_confidence": depth_confidence,
        # Bilateral LSI per segment (%)
        "lsi_arm": lsi_arm,
        "lsi_upper_arm": lsi_upper_arm,
        "lsi_forearm": lsi_forearm,
        "lsi_thigh": lsi_thigh,
        "lsi_shank": lsi_shank,
        # Kept for backward-compat; not meaningful in world coords
        "left_shoulder_height_cm": None,
        "right_shoulder_height_cm": None,
    }
