import cv2
import mediapipe as mp
import numpy as np
import base64
import time
from collections import deque
from typing import Dict, List, Optional, Tuple

# Minimum seconds between the same alert being re-issued
_ALERT_COOLDOWN = 8.0

from services.kalman_filter import LandmarkKalmanFilter
from services.measurements import compute_all_measurements
from services.joint_angles import compute_joint_angles
from services.reba import compute_reba
from services.rula import compute_rula

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Ring buffer: 30 s at 10 fps
_BUFFER_SIZE = 300

# REBA segment-to-landmark index mapping for heatmap colouring
_SEGMENT_LANDMARKS = {
    "trunk": [11, 12, 23, 24],
    "neck": [0, 11, 12],
    "left_upper_arm": [11, 13],
    "right_upper_arm": [12, 14],
    "left_lower_arm": [13, 15],
    "right_lower_arm": [14, 16],
    "left_thigh": [23, 25],
    "right_thigh": [24, 26],
    "left_shank": [25, 27],
    "right_shank": [26, 28],
}

# REBA colour thresholds: BGR
_RISK_COLORS = {
    "negligible": (34, 197, 94),    # green
    "low":        (74, 222, 128),   # light green
    "medium":     (251, 191, 36),   # amber
    "high":       (249, 115, 22),   # orange
    "very_high":  (239, 68, 68),    # red
}


def _reba_score_to_risk(score: int) -> str:
    if score <= 1:
        return "negligible"
    if score <= 3:
        return "low"
    if score <= 7:
        return "medium"
    if score <= 10:
        return "high"
    return "very_high"


class PoseService:
    def __init__(self):
        self.pose = mp_pose.Pose(
            model_complexity=1,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._kalman = LandmarkKalmanFilter()

        # Temporal buffers — (timestamp, value) pairs
        self._hip_x_buf: deque = deque(maxlen=_BUFFER_SIZE)   # postural sway
        self._hip_z_buf: deque = deque(maxlen=_BUFFER_SIZE)
        self._trunk_buf: deque = deque(maxlen=_BUFFER_SIZE)    # fatigue: trunk flexion
        self._neck_buf: deque = deque(maxlen=_BUFFER_SIZE)     # fatigue: neck flexion
        self._sym_buf: deque = deque(maxlen=_BUFFER_SIZE)      # symmetry time series
        self._reba_buf: deque = deque(maxlen=_BUFFER_SIZE)     # REBA time series

        # Alert cooldown: maps alert key → last_fired timestamp
        self._alert_last: Dict[str, float] = {}

    def process_frame(
        self, frame_bytes: bytes, real_height_cm: float
    ) -> Tuple[str, Optional[Dict], List[str], bool]:
        """Process a JPEG frame and return annotated frame + measurements.

        Returns:
            (base64_jpeg, measurements_dict, alerts, landmarks_detected)
        """
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return "", None, [], False

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_frame)

        annotated = frame.copy()
        measurements = None
        alerts = []
        detected = False

        if results.pose_landmarks and results.pose_world_landmarks:
            detected = True

            # Visibility scores drive Kalman update/predict decisions
            visibilities = [lm.visibility for lm in results.pose_landmarks.landmark]

            # Kalman-smooth the 3D world landmarks
            smoothed_lm = self._kalman.update(results.pose_world_landmarks, visibilities)

            try:
                # Pass per-landmark visibility for optional gating inside measurement engine
                measurements = compute_all_measurements(smoothed_lm, real_height_cm, visibilities)
                angles = compute_joint_angles(smoothed_lm)
                reba = compute_reba(angles)
                rula = compute_rula(angles)

                # ── Feed temporal buffers ────────────────────────────────────────
                now = time.monotonic()
                hip_lx, _, hip_lz = smoothed_lm[23]
                hip_rx, _, hip_rz = smoothed_lm[24]
                hip_mx = (hip_lx + hip_rx) / 2
                hip_mz = (hip_lz + hip_rz) / 2
                self._hip_x_buf.append((now, hip_mx))
                self._hip_z_buf.append((now, hip_mz))
                self._trunk_buf.append((now, angles.get("trunk_flexion", 0.0)))
                self._neck_buf.append((now, angles.get("neck_flexion", 0.0)))
                self._sym_buf.append((now, measurements.get("symmetry_score", 100.0)))
                self._reba_buf.append((now, reba.get("final_score", 0)))

                # ── Temporal statistics (last 30 s window) ───────────────────────
                temporal = self._compute_temporal_stats()

                # ── Heatmap overlay on annotated frame ───────────────────────────
                annotated = self._draw_heatmap(annotated, results.pose_landmarks, reba, frame.shape)

                # Draw skeleton on top of heatmap
                mp_drawing.draw_landmarks(
                    annotated,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style(),
                )

                measurements["joint_angles"] = angles
                measurements["reba"] = reba
                measurements["rula"] = rula
                measurements["temporal"] = temporal

                alerts = self._generate_alerts(measurements, reba, temporal)
            except Exception as exc:
                # Still draw skeleton even on measurement failure
                mp_drawing.draw_landmarks(
                    annotated,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style(),
                )
                alerts = [f"Measurement error: {exc}"]
                measurements = None
        else:
            pass  # no landmarks — annotated stays as-is

        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 70]
        _, buffer = cv2.imencode(".jpg", annotated, encode_params)
        b64_frame = base64.b64encode(buffer.tobytes()).decode("utf-8")

        return b64_frame, measurements, alerts, detected

    def _compute_temporal_stats(self) -> Dict:
        """Compute 30-second temporal statistics from ring buffers."""

        def _stats(buf: deque) -> Dict:
            vals = [v for _, v in buf]
            if len(vals) < 2:
                return {}
            arr = np.array(vals, dtype=float)
            return {
                "mean": round(float(np.mean(arr)), 2),
                "std": round(float(np.std(arr)), 2),
                "min": round(float(np.min(arr)), 2),
                "max": round(float(np.max(arr)), 2),
            }

        trunk_s = _stats(self._trunk_buf)
        neck_s = _stats(self._neck_buf)

        # Postural sway index: RMS displacement of hip midpoint from its mean
        sway_index: Optional[float] = None
        if len(self._hip_x_buf) >= 10:
            xs = np.array([v for _, v in self._hip_x_buf])
            zs = np.array([v for _, v in self._hip_z_buf])
            sway_index = round(float(np.sqrt(np.mean((xs - xs.mean())**2 + (zs - zs.mean())**2))), 4)

        # Fatigue index: linear regression slope of trunk flexion (deg/s), normalised to 0-1
        fatigue_index: Optional[float] = None
        if len(self._trunk_buf) >= 30:
            times = np.array([t for t, _ in self._trunk_buf])
            vals = np.array([v for _, v in self._trunk_buf])
            t_rel = times - times[0]
            if t_rel[-1] > 0:
                slope = float(np.polyfit(t_rel, vals, 1)[0])  # deg/s
                # Positive slope = increasing forward lean = fatigue signal
                # Clamp: 0 deg/min = 0.0, 5+ deg/min = 1.0
                fatigue_index = round(min(max(slope * 60 / 5.0, 0.0), 1.0), 3)

        # Mann-Kendall trend for symmetry (simplified S-statistic sign)
        sym_trend: Optional[str] = None
        if len(self._sym_buf) >= 20:
            sym_vals = np.array([v for _, v in self._sym_buf])
            n = len(sym_vals)
            s = sum(
                np.sign(sym_vals[j] - sym_vals[i])
                for i in range(n - 1)
                for j in range(i + 1, n)
            )
            sym_trend = "improving" if s > 0 else "worsening" if s < 0 else "stable"

        return {
            "trunk_flexion": trunk_s,
            "neck_flexion": neck_s,
            "symmetry": _stats(self._sym_buf),
            "reba_score": _stats(self._reba_buf),
            "postural_sway_index": sway_index,
            "fatigue_index": fatigue_index,
            "symmetry_trend": sym_trend,
            "sample_count": len(self._trunk_buf),
        }

    def _draw_heatmap(
        self,
        frame: np.ndarray,
        pose_landmarks,
        reba: Dict,
        shape: Tuple,
    ) -> np.ndarray:
        """Draw semi-transparent segment heatmap based on REBA risk."""
        h, w = shape[:2]
        overlay = frame.copy()
        risk = reba.get("risk_level", "negligible")
        color_bgr = _RISK_COLORS.get(risk, _RISK_COLORS["negligible"])

        lm = pose_landmarks.landmark

        def px(idx):
            l = lm[idx]
            return int(l.x * w), int(l.y * h)

        # Draw thick coloured segments for each body part
        connections = [
            (11, 12), (11, 13), (13, 15),
            (12, 14), (14, 16),
            (11, 23), (12, 24),
            (23, 24),
            (23, 25), (25, 27),
            (24, 26), (26, 28),
            (0, 11), (0, 12),
        ]
        for a, b in connections:
            cv2.line(overlay, px(a), px(b), color_bgr, thickness=8, lineType=cv2.LINE_AA)

        # Blend with original frame
        cv2.addWeighted(overlay, 0.35, frame, 0.65, 0, frame)
        return frame

    def _generate_alerts(self, measurements: Dict, reba: Dict, temporal: Dict) -> List[str]:
        """Generate alerts with per-key cooldown to prevent spam."""
        now = time.monotonic()
        alerts: List[str] = []

        def _try_alert(key: str, msg: str) -> None:
            last = self._alert_last.get(key, 0.0)
            if now - last >= _ALERT_COOLDOWN:
                self._alert_last[key] = now
                alerts.append(msg)

        # Shoulder tilt alert (2D posture angle)
        angle = abs(measurements.get("posture_angle_deg", 0) or 0)
        if angle > 3:
            _try_alert("posture_angle", f"Shoulder tilt: {angle:.1f}° — keep shoulders level")

        # Symmetry alert
        symmetry = measurements.get("symmetry_score") or 100
        if symmetry < 93:
            _try_alert("symmetry", f"Body asymmetry detected: {symmetry:.1f}% symmetry")

        # REBA risk alerts — fire from score 3+ (low risk)
        reba_score = reba.get("final_score", 0)
        risk = reba.get("risk_level", "")
        if reba_score >= 8:
            _try_alert("reba_high", f"High ergonomic risk: REBA {reba_score} ({risk.replace('_',' ')}) — immediate action needed")
        elif reba_score >= 4:
            _try_alert("reba_med", f"Moderate ergonomic risk: REBA {reba_score} ({risk}) — review posture")
        elif reba_score >= 3:
            _try_alert("reba_low", f"Low ergonomic risk: REBA {reba_score} — minor posture issue detected")

        # Joint angle alerts from joint_angles sub-dict
        joint_angles = measurements.get("joint_angles", {}) or {}

        trunk = joint_angles.get("trunk_flexion", 0) or 0
        if trunk > 20:
            _try_alert("trunk_flex", f"Forward trunk lean: {trunk:.0f}° — straighten your back")
        elif trunk > 10:
            _try_alert("trunk_flex_mild", f"Mild trunk lean: {trunk:.0f}° — sit up straight")

        neck = joint_angles.get("neck_flexion", 0) or 0
        if neck > 30:
            _try_alert("neck_flex", f"Neck forward flexion: {neck:.0f}° — raise your screen")
        elif neck > 20:
            _try_alert("neck_flex_mild", f"Neck tilt: {neck:.0f}° — check monitor height")

        upper_arm_l = joint_angles.get("upper_arm_flexion_left", 0) or 0
        upper_arm_r = joint_angles.get("upper_arm_flexion_right", 0) or 0
        if upper_arm_l > 45 or upper_arm_r > 45:
            side = "left" if upper_arm_l > upper_arm_r else "right"
            val = max(upper_arm_l, upper_arm_r)
            _try_alert("upper_arm", f"Arm raised: {side} upper arm at {val:.0f}° — lower your elbow")

        # Bilateral LSI alerts — clinical threshold >10%
        for seg in ("lsi_arm", "lsi_upper_arm", "lsi_forearm"):
            val = measurements.get(seg)
            if val is not None and val > 10:
                label = seg.replace("lsi_", "").replace("_", " ")
                _try_alert(f"lsi_{seg}", f"Bilateral asymmetry ({label}): {val:.1f}% — review recommended")

        # Fatigue alert
        fatigue = temporal.get("fatigue_index")
        if fatigue is not None and fatigue >= 0.5:
            _try_alert("fatigue", f"Fatigue signal: forward lean increasing (index {fatigue:.2f})")

        # Depth confidence warning
        conf = measurements.get("depth_confidence", 1.0)
        if conf is not None and conf < 0.4:
            _try_alert("depth_conf", f"Low confidence ({conf:.2f}) — face camera directly")

        return alerts

    def reset_tracking(self) -> None:
        """Reset Kalman filter, temporal buffers, and alert cooldowns — call between sessions."""
        self._kalman.reset()
        self._hip_x_buf.clear()
        self._hip_z_buf.clear()
        self._trunk_buf.clear()
        self._neck_buf.clear()
        self._sym_buf.clear()
        self._reba_buf.clear()
        self._alert_last.clear()


# Module-level singleton — never instantiate per-request
pose_service = PoseService()
