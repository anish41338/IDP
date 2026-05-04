import math
from typing import Tuple


def pixel_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Euclidean distance between two (x, y) pixel coordinate tuples."""
    return math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2)


def landmark_to_pixel(landmark, w: int, h: int) -> Tuple[float, float]:
    """Convert normalized (0-1) MediaPipe landmark coords to pixel coords."""
    return (landmark.x * w, landmark.y * h)


def compute_calibration_ratio(real_height_cm: float, landmarks, w: int, h: int) -> float:
    """
    Compute pixel-to-cm ratio using the person's real height.
    Uses nose (landmark 0) and midpoint of ankles (landmarks 27, 28).
    Returns: real_height_cm / pixel_height
    """
    nose = landmark_to_pixel(landmarks[0], w, h)
    left_ankle = landmark_to_pixel(landmarks[27], w, h)
    right_ankle = landmark_to_pixel(landmarks[28], w, h)
    ankle_mid = ((left_ankle[0] + right_ankle[0]) / 2, (left_ankle[1] + right_ankle[1]) / 2)
    pixel_height = pixel_distance(nose, ankle_mid)
    if pixel_height < 1:
        return 1.0
    return real_height_cm / pixel_height
