"""Real-time postural anomaly detection.

Builds a per-session baseline of the user's typical posture during a
calibration window and flags subsequent frames whose joint-angle pattern
deviates from that baseline. Catches subtle ergonomic issues that fixed
REBA/RULA rules miss because they encode population norms, not the user's
own habitual pattern.

Algorithm: scikit-learn IsolationForest fit on the calibration window,
features standardized via StandardScaler, scores smoothed across a short
window. Anomaly contributors identified via per-feature ablation.
"""

import logging
import math
import os
import pickle
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from config import (
    ANOMALY_THRESHOLD,
    BASELINE_DURATION_SEC,
    CONTAMINATION,
    SMOOTHING_WINDOW,
)

logger = logging.getLogger(__name__)


# Ordered feature names. Order is part of the saved-baseline contract —
# do not reorder without invalidating saved baselines.
FEATURE_NAMES: Tuple[str, ...] = (
    "neck_flexion",
    "trunk_flexion",
    "trunk_lateral_bend",
    "trunk_twist",
    "upper_arm_flexion_left",
    "upper_arm_flexion_right",
    "upper_arm_abduction_left",
    "upper_arm_abduction_right",
    "lower_arm_flexion_left",
    "lower_arm_flexion_right",
    "wrist_flexion_left",
    "wrist_flexion_right",
    "knee_flexion_left",
    "knee_flexion_right",
    "delta_upper_arm_flexion",
    "delta_upper_arm_abduction",
    "delta_lower_arm_flexion",
    "delta_wrist_flexion",
    "delta_knee_flexion",
)


class AnomalyResult(BaseModel):
    """Per-frame postural anomaly classification."""

    score: float
    is_anomalous: bool
    severity: str  # NORMAL | MILD | MODERATE | SEVERE
    top_features: List[str]
    calibrating: bool
    calibration_progress: float  # 0.0–1.0


def _angles_to_features(angles: Dict[str, float]) -> np.ndarray:
    """Build the ordered feature vector from a joint-angles dict.

    Args:
        angles: Output of ``services.joint_angles.compute_joint_angles``.

    Returns:
        A 1-D float array of length ``len(FEATURE_NAMES)``. Missing keys
        are filled with NaN so the caller can decide how to handle them.
    """
    g = lambda k: float(angles.get(k, float("nan")))  # noqa: E731

    base = {
        "neck_flexion": g("neck_flexion"),
        "trunk_flexion": g("trunk_flexion"),
        "trunk_lateral_bend": g("trunk_lateral_bend"),
        "trunk_twist": g("trunk_twist"),
        "upper_arm_flexion_left": g("upper_arm_flexion_left"),
        "upper_arm_flexion_right": g("upper_arm_flexion_right"),
        "upper_arm_abduction_left": g("upper_arm_abduction_left"),
        "upper_arm_abduction_right": g("upper_arm_abduction_right"),
        "lower_arm_flexion_left": g("lower_arm_flexion_left"),
        "lower_arm_flexion_right": g("lower_arm_flexion_right"),
        "wrist_flexion_left": g("wrist_flexion_left"),
        "wrist_flexion_right": g("wrist_flexion_right"),
        "knee_flexion_left": g("knee_flexion_left"),
        "knee_flexion_right": g("knee_flexion_right"),
        "delta_upper_arm_flexion": g("upper_arm_flexion_left") - g("upper_arm_flexion_right"),
        "delta_upper_arm_abduction": g("upper_arm_abduction_left") - g("upper_arm_abduction_right"),
        "delta_lower_arm_flexion": g("lower_arm_flexion_left") - g("lower_arm_flexion_right"),
        "delta_wrist_flexion": g("wrist_flexion_left") - g("wrist_flexion_right"),
        "delta_knee_flexion": g("knee_flexion_left") - g("knee_flexion_right"),
    }
    return np.array([base[name] for name in FEATURE_NAMES], dtype=float)


def _severity_from_score(score: float, threshold: float) -> str:
    """Bucket a smoothed anomaly score into a severity label.

    The bands are picked to match IsolationForest's typical
    ``score_samples`` distribution: scores cluster near zero for normal
    points and trend more negative for outliers.
    """
    if score >= threshold:
        return "NORMAL"
    delta = threshold - score
    if delta < 0.1:
        return "MILD"
    if delta < 0.2:
        return "MODERATE"
    return "SEVERE"


class PosturalAnomalyDetector:
    """Per-session anomaly detector built around an IsolationForest.

    Lifecycle:
        1. ``update(angles)`` is called every frame. During the
           calibration window the detector buffers feature vectors and
           returns NORMAL with calibration progress.
        2. When the buffer covers ``baseline_duration_sec`` of wall clock
           the detector fits a ``StandardScaler`` and ``IsolationForest``
           on the buffered features.
        3. Subsequent calls transform the new feature vector, score it,
           smooth the score over the most recent ``smoothing_window``
           frames, threshold for anomaly, and run cheap per-feature
           ablation to surface the top 3 contributors.
    """

    def __init__(
        self,
        baseline_duration_sec: float = BASELINE_DURATION_SEC,
        threshold: float = ANOMALY_THRESHOLD,
        smoothing_window: int = SMOOTHING_WINDOW,
        contamination: float = CONTAMINATION,
        n_estimators: int = 100,
        random_state: int = 42,
    ) -> None:
        self.baseline_duration_sec = float(baseline_duration_sec)
        self.threshold = float(threshold)
        self.smoothing_window = int(smoothing_window)
        self.contamination = float(contamination)
        self.n_estimators = int(n_estimators)
        self.random_state = int(random_state)

        self._scaler: Optional[StandardScaler] = None
        self._model: Optional[IsolationForest] = None
        self._baseline_mean_scaled: Optional[np.ndarray] = None  # zeros after fit

        self._buffer: List[np.ndarray] = []
        self._calib_start: Optional[float] = None

        self._score_buf: Deque[float] = deque(maxlen=self.smoothing_window)
        self._last_result: Optional[AnomalyResult] = None
        self._patient_id: Optional[str] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def set_patient(self, patient_id: Optional[Any], baseline_dir: str) -> None:
        """Associate the detector with a patient and try to load a saved baseline.

        Args:
            patient_id: Optional patient identifier. ``None`` clears the
                association and skips persistence.
            baseline_dir: Directory in which per-patient baselines live.
        """
        self._patient_id = str(patient_id) if patient_id is not None else None
        if self._patient_id is None:
            return
        path = os.path.join(baseline_dir, f"patient_{self._patient_id}.pkl")
        if os.path.exists(path):
            try:
                self.load_baseline(path)
                logger.info("Loaded anomaly baseline for patient %s", self._patient_id)
            except Exception as exc:  # pragma: no cover — best-effort
                logger.warning("Failed to load baseline %s: %s", path, exc)

    def update(self, angles: Dict[str, float]) -> AnomalyResult:
        """Process one frame's joint angles and return a classification.

        Args:
            angles: Dict produced by ``compute_joint_angles``.

        Returns:
            ``AnomalyResult`` describing this frame. During calibration the
            severity is always ``NORMAL``. If the feature vector contains
            NaN, the previous result is returned (or NORMAL if no previous
            result exists yet).
        """
        features = _angles_to_features(angles)

        if not np.all(np.isfinite(features)):
            if self._last_result is not None:
                return self._last_result
            return self._normal_result(calibrating=self._model is None, progress=0.0)

        # Calibration phase
        if self._model is None:
            now = time.monotonic()
            if self._calib_start is None:
                self._calib_start = now
                logger.info("Anomaly calibration started")
            elapsed = now - self._calib_start
            self._buffer.append(features)
            progress = min(elapsed / self.baseline_duration_sec, 1.0)
            # Log progress at each 25% milestone
            milestone = int(progress * 4)
            if milestone > getattr(self, "_logged_milestone", -1):
                logger.info(
                    "Anomaly calibration %d%% (%d frames buffered)",
                    int(progress * 100), len(self._buffer),
                )
                self._logged_milestone = milestone
            if elapsed >= self.baseline_duration_sec and len(self._buffer) >= 10:
                self._fit_baseline()
                # fall through to scoring path below for this frame
            else:
                result = self._normal_result(calibrating=True, progress=progress)
                self._last_result = result
                return result

        # Scoring phase
        assert self._model is not None and self._scaler is not None
        x_scaled = self._scaler.transform(features.reshape(1, -1))
        raw_score = float(self._model.score_samples(x_scaled)[0])
        self._score_buf.append(raw_score)
        smoothed = float(np.mean(self._score_buf))
        severity = _severity_from_score(smoothed, self.threshold)
        is_anomalous = severity != "NORMAL"
        top = self._top_contributors(x_scaled[0], smoothed) if is_anomalous else []

        result = AnomalyResult(
            score=round(smoothed, 4),
            is_anomalous=is_anomalous,
            severity=severity,
            top_features=top,
            calibrating=False,
            calibration_progress=1.0,
        )
        self._last_result = result
        return result

    def reset(self) -> None:
        """Reset detector state — call between sessions."""
        if self._calib_start is not None and not self.is_ready:
            elapsed = time.monotonic() - self._calib_start
            logger.warning(
                "Anomaly calibration aborted at %.1fs / %.1fs (state was reset)",
                elapsed, self.baseline_duration_sec,
            )
        self._scaler = None
        self._model = None
        self._baseline_mean_scaled = None
        self._buffer = []
        self._calib_start = None
        self._score_buf.clear()
        self._last_result = None
        self._patient_id = None
        self._logged_milestone = -1

    def save_baseline(self, path: str) -> None:
        """Pickle the fitted scaler + model to ``path``.

        Raises:
            RuntimeError: If called before the baseline has been fit.
        """
        if self._scaler is None or self._model is None:
            raise RuntimeError("Cannot save baseline before calibration completes")
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "wb") as fh:
            pickle.dump(
                {
                    "feature_names": list(FEATURE_NAMES),
                    "scaler": self._scaler,
                    "model": self._model,
                },
                fh,
            )

    def load_baseline(self, path: str) -> None:
        """Load a pickled scaler + model from ``path``.

        Raises:
            ValueError: If the saved feature schema differs from the
                current ``FEATURE_NAMES`` ordering.
        """
        with open(path, "rb") as fh:
            payload = pickle.load(fh)
        if tuple(payload.get("feature_names", ())) != FEATURE_NAMES:
            raise ValueError("Saved baseline feature schema does not match current FEATURE_NAMES")
        self._scaler = payload["scaler"]
        self._model = payload["model"]
        self._baseline_mean_scaled = np.zeros(len(FEATURE_NAMES), dtype=float)
        self._calib_start = None
        self._buffer = []

    def baseline_summary(self) -> Optional[Dict[str, Any]]:
        """Return a small dict describing the current baseline, or None."""
        if self._scaler is None:
            return None
        return {
            "feature_means": {
                name: round(float(self._scaler.mean_[i]), 3)
                for i, name in enumerate(FEATURE_NAMES)
            },
            "feature_stds": {
                name: round(float(math.sqrt(self._scaler.var_[i])), 3)
                for i, name in enumerate(FEATURE_NAMES)
            },
            "threshold": self.threshold,
            "contamination": self.contamination,
        }

    @property
    def is_ready(self) -> bool:
        """True once the baseline has been fit."""
        return self._model is not None

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    def _normal_result(self, calibrating: bool, progress: float) -> AnomalyResult:
        return AnomalyResult(
            score=0.0,
            is_anomalous=False,
            severity="NORMAL",
            top_features=[],
            calibrating=calibrating,
            calibration_progress=round(progress, 3),
        )

    def _fit_baseline(self) -> None:
        x = np.asarray(self._buffer, dtype=float)
        self._scaler = StandardScaler().fit(x)
        x_scaled = self._scaler.transform(x)
        self._model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
        ).fit(x_scaled)
        self._baseline_mean_scaled = np.zeros(x_scaled.shape[1], dtype=float)
        logger.info(
            "Anomaly baseline fit on %d frames over %.1fs",
            x.shape[0],
            self.baseline_duration_sec,
        )
        # Buffer no longer needed
        self._buffer = []

    def _top_contributors(self, x_scaled: np.ndarray, current_score: float) -> List[str]:
        """Identify the 3 features whose values are pulling the score down most.

        For each feature we replace its scaled value with the baseline
        mean (0 after standardization) and re-score. A large positive
        delta means removing that feature would make the frame look much
        more normal — i.e. that feature is a top contributor.
        """
        if self._model is None or self._baseline_mean_scaled is None:
            return []
        deltas: List[Tuple[str, float]] = []
        for i, name in enumerate(FEATURE_NAMES):
            perturbed = x_scaled.copy()
            perturbed[i] = self._baseline_mean_scaled[i]
            new_score = float(self._model.score_samples(perturbed.reshape(1, -1))[0])
            deltas.append((name, new_score - current_score))
        deltas.sort(key=lambda t: t[1], reverse=True)
        return [name for name, d in deltas[:3] if d > 0]
