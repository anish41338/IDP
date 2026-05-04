import cv2
import mediapipe as mp
import numpy as np
import base64
from typing import Tuple, Dict, List, Optional
from services.measurements import compute_all_measurements

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles


class PoseService:
    def __init__(self):
        self.pose = mp_pose.Pose(
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def process_frame(
        self, frame_bytes: bytes, real_height_cm: float
    ) -> Tuple[str, Optional[Dict], List[str], bool]:
        """
        Process a JPEG frame and return annotated frame + measurements.
        Returns: (base64_jpeg, measurements, alerts, landmarks_detected)
        """
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return "", None, [], False

        h, w = frame.shape[:2]
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_frame)

        annotated = frame.copy()
        measurements = None
        alerts = []
        detected = False

        if results.pose_landmarks:
            detected = True
            mp_drawing.draw_landmarks(
                annotated,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style(),
            )
            landmarks = results.pose_landmarks.landmark
            try:
                measurements = compute_all_measurements(landmarks, w, h, real_height_cm)
                alerts = self._generate_posture_alerts(measurements)
            except Exception:
                measurements = None

        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 70]
        _, buffer = cv2.imencode(".jpg", annotated, encode_params)
        b64_frame = base64.b64encode(buffer.tobytes()).decode("utf-8")

        return b64_frame, measurements, alerts, detected

    def _generate_posture_alerts(self, measurements: Dict) -> List[str]:
        alerts = []
        angle = abs(measurements.get("posture_angle_deg", 0))
        if angle > 5:
            alerts.append(f"Shoulder drop detected: {angle:.1f}° tilt")
        symmetry = measurements.get("symmetry_score", 100)
        if symmetry < 90:
            alerts.append(f"Asymmetry detected: symmetry score {symmetry:.1f}%")
        return alerts


# Module-level singleton — never instantiate per-request
pose_service = PoseService()
