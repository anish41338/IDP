import math
from typing import Dict
from services.calibration import landmark_to_pixel, pixel_distance, compute_calibration_ratio


def compute_all_measurements(landmarks, w: int, h: int, real_height_cm: float) -> Dict:
    """Compute all body measurements from MediaPipe pose landmarks."""
    ratio = compute_calibration_ratio(real_height_cm, landmarks, w, h)

    def dist_cm(idx1: int, idx2: int) -> float:
        p1 = landmark_to_pixel(landmarks[idx1], w, h)
        p2 = landmark_to_pixel(landmarks[idx2], w, h)
        return pixel_distance(p1, p2) * ratio

    # Key landmarks: shoulders (11,12), elbows (13,14), wrists (15,16)
    # hips (23,24), knees (25,26), ankles (27,28), nose (0)
    left_shoulder = landmark_to_pixel(landmarks[11], w, h)
    right_shoulder = landmark_to_pixel(landmarks[12], w, h)

    shoulder_width_cm = dist_cm(11, 12)
    arm_length_left = dist_cm(11, 13) + dist_cm(13, 15)
    arm_length_right = dist_cm(12, 14) + dist_cm(14, 16)

    # Torso: midpoint of shoulders to midpoint of hips
    left_hip = landmark_to_pixel(landmarks[23], w, h)
    right_hip = landmark_to_pixel(landmarks[24], w, h)
    shoulder_mid = ((left_shoulder[0] + right_shoulder[0]) / 2,
                    (left_shoulder[1] + right_shoulder[1]) / 2)
    hip_mid = ((left_hip[0] + right_hip[0]) / 2, (left_hip[1] + right_hip[1]) / 2)
    torso_length = pixel_distance(shoulder_mid, hip_mid) * ratio

    # Inseam: hip midpoint to ankle midpoint
    left_ankle = landmark_to_pixel(landmarks[27], w, h)
    right_ankle = landmark_to_pixel(landmarks[28], w, h)
    ankle_mid = ((left_ankle[0] + right_ankle[0]) / 2, (left_ankle[1] + right_ankle[1]) / 2)
    inseam_estimate = pixel_distance(hip_mid, ankle_mid) * ratio

    # Shoulder heights from top of image
    left_shoulder_height = left_shoulder[1] * ratio
    right_shoulder_height = right_shoulder[1] * ratio

    # Posture angle: angle of shoulder line relative to horizontal
    dy = right_shoulder[1] - left_shoulder[1]
    dx = right_shoulder[0] - left_shoulder[0]
    posture_angle_deg = math.degrees(math.atan2(dy, dx))

    # Symmetry score based on arm length difference
    max_arm = max(arm_length_left, arm_length_right)
    if max_arm > 0:
        symmetry_score = 100.0 * (1 - abs(arm_length_left - arm_length_right) / max_arm)
    else:
        symmetry_score = 100.0

    return {
        "height_cm": round(real_height_cm, 1),
        "shoulder_width_cm": round(shoulder_width_cm, 1),
        "arm_length_left_cm": round(arm_length_left, 1),
        "arm_length_right_cm": round(arm_length_right, 1),
        "torso_length_cm": round(torso_length, 1),
        "inseam_estimate_cm": round(inseam_estimate, 1),
        "left_shoulder_height_cm": round(left_shoulder_height, 1),
        "right_shoulder_height_cm": round(right_shoulder_height, 1),
        "posture_angle_deg": round(posture_angle_deg, 2),
        "symmetry_score": round(symmetry_score, 1),
    }
