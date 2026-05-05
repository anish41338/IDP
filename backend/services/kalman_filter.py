import numpy as np
from filterpy.kalman import KalmanFilter
from typing import Dict, Tuple


class LandmarkKalmanFilter:
    """Per-landmark Kalman filter using a 6D constant-velocity motion model.

    State: [x, y, z, vx, vy, vz] in MediaPipe world coordinates (meters).
    Measurement: [x, y, z] from pose_world_landmarks.
    """

    NUM_LANDMARKS = 33
    DT = 1.0 / 30.0  # assume ~30 fps

    def __init__(self):
        self._filters: Dict[int, KalmanFilter] = {
            i: self._make_filter() for i in range(self.NUM_LANDMARKS)
        }
        self._initialized = [False] * self.NUM_LANDMARKS

    def _make_filter(self) -> KalmanFilter:
        kf = KalmanFilter(dim_x=6, dim_z=3)
        dt = self.DT

        # State transition: constant velocity
        kf.F = np.array([
            [1, 0, 0, dt, 0,  0 ],
            [0, 1, 0, 0,  dt, 0 ],
            [0, 0, 1, 0,  0,  dt],
            [0, 0, 0, 1,  0,  0 ],
            [0, 0, 0, 0,  1,  0 ],
            [0, 0, 0, 0,  0,  1 ],
        ], dtype=float)

        # Measurement matrix: observe position only
        kf.H = np.array([
            [1, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0],
        ], dtype=float)

        # Process noise (tune Q for responsiveness vs. smoothness)
        q = 1e-3
        kf.Q = np.eye(6) * q
        kf.Q[3:, 3:] *= 10  # velocity components noisier

        # Measurement noise (MediaPipe world coords are fairly accurate)
        kf.R = np.eye(3) * 1e-4

        # Initial covariance
        kf.P = np.eye(6) * 1.0

        return kf

    def update(self, world_landmarks, visibilities: list) -> Dict[int, Tuple[float, float, float]]:
        """Run one filter step for all 33 landmarks.

        Args:
            world_landmarks: mediapipe NormalizedLandmarkList (pose_world_landmarks)
            visibilities: list of float visibility scores, one per landmark

        Returns:
            Dict mapping landmark index → smoothed (x, y, z) in world meters
        """
        smoothed: Dict[int, Tuple[float, float, float]] = {}

        for i in range(self.NUM_LANDMARKS):
            lm = world_landmarks.landmark[i]
            vis = visibilities[i] if i < len(visibilities) else 0.0
            kf = self._filters[i]
            measurement = np.array([[lm.x], [lm.y], [lm.z]])

            if not self._initialized[i]:
                kf.x = np.array([[lm.x], [lm.y], [lm.z], [0.0], [0.0], [0.0]])
                self._initialized[i] = True

            kf.predict()

            if vis >= 0.5:
                kf.update(measurement)

            smoothed[i] = (float(kf.x[0]), float(kf.x[1]), float(kf.x[2]))

        return smoothed

    def reset(self) -> None:
        self._filters = {i: self._make_filter() for i in range(self.NUM_LANDMARKS)}
        self._initialized = [False] * self.NUM_LANDMARKS
