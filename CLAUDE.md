# CLAUDE.md

Notes for AI assistants working on this codebase.

## Layout

```
backend/
  main.py              FastAPI app — wires routers + websocket on startup, init_db()
  config.py            Plain os.getenv + python-dotenv (NOT Pydantic BaseSettings)
  database/
    db.py              SQLAlchemy engine, Base, get_db, init_db (incl. lightweight ALTER migrations)
    models.py          Patient, MeasurementSession, Report, ChatMessage
  routers/             Thin REST routers — patients, sessions, reports, chat, export
  services/            Business logic, all module-level singletons where stateful
    pose_service.py    Per-frame orchestrator: MediaPipe + Kalman + measurements + REBA/RULA
                       + anomaly + alerts. Singleton: pose_service = PoseService()
    joint_angles.py    Pure functions over MediaPipe world landmarks → 14 angle dict
    measurements.py    Body geometry + symmetry from world landmarks
    reba.py / rula.py  Published lookup-table scoring on joint angles
    kalman_filter.py   3D landmark smoother
    anomaly_detector.py  Per-user IsolationForest baseline + scoring
    analytics.py / pdf_service.py / llm_service.py / calibration.py
  websocket/
    video_stream.py    Thin WS handler; receives JPEG bytes, defers to pose_service.process_frame
  baselines/           Pickled per-patient anomaly baselines (.pkl). Created on demand.
frontend/              Vite + React UI; talks to backend via /api and /ws/video
```

## Per-frame data flow

1. Client opens `/ws/video` and sends a JSON config message:
   `{type: "config", height_cm, patient_id?}`. `patient_id` is optional;
   when present it lets the anomaly detector load a saved baseline.
2. Each video frame arrives as binary JPEG bytes.
3. `video_stream.video_stream` hands the frame off to a thread executor
   running `pose_service.process_frame(frame_bytes, height_cm)`.
4. `PoseService.process_frame`:
   - decodes JPEG → BGR
   - runs MediaPipe Pose
   - Kalman-smooths world landmarks
   - computes `measurements`, `joint_angles`, `reba`, `rula`, `temporal`
   - calls `PosturalAnomalyDetector.update(angles)` → attaches
     `measurements["anomaly"]`
   - draws REBA-coloured heatmap + skeleton, JPEG-encodes annotated frame
   - generates alerts (cooldown-gated)
5. Response is a single JSON object:
   `{frame, measurements, posture_alerts, landmarks_detected}` —
   anomaly data lives inside `measurements.anomaly`.

## Postural anomaly detection

`services/anomaly_detector.py` provides `PosturalAnomalyDetector`, a per-session
IsolationForest fit on the user's own first `BASELINE_DURATION_SEC` of frames.
After calibration each frame's joint-angle feature vector is standardized,
scored, smoothed across `SMOOTHING_WINDOW` frames, and bucketed into
`NORMAL / MILD / MODERATE / SEVERE`. The top 3 contributing features are
identified by per-feature ablation against the baseline mean.

Per-frame output (Pydantic `AnomalyResult`):
`{score, is_anomalous, severity, top_features, calibrating, calibration_progress}`.

The detector is intentionally optional: if scikit-learn is missing the
import in `pose_service.py` falls back to `None` and `measurements["anomaly"]`
is simply absent — the rest of the pipeline keeps working.

Configuration knobs in `config.py`: `BASELINE_DURATION_SEC`,
`ANOMALY_THRESHOLD`, `SMOOTHING_WINDOW`, `CONTAMINATION`, `BASELINE_DIR`.

Persistence: when `patient_id` is supplied via the WS config message, the
fitted scaler+model are pickled to `backend/baselines/patient_<id>.pkl`
once calibration completes, and re-loaded automatically on the next
session for the same patient.

Aggregated session stats (`severity_counts`, baseline means/stds) are
exposed via `pose_service.get_anomaly_summary()` and persisted on
`MeasurementSession.anomaly_summary` when the client saves a session.
`GET /api/sessions/{id}/anomalies` returns that summary.

## Conventions

- Services that hold state are **module-level singletons** (e.g.
  `pose_service = PoseService()` at the bottom of the module). Do not
  instantiate per-request.
- `joint_angles.compute_joint_angles` returns a flat dict of 14 angle
  names → degrees. There is no neck lateral-bend / rotation, no wrist
  deviation; the anomaly feature vector adds bilateral L–R deltas to
  cover asymmetry without inventing missing angles.
- Alerts use a per-key cooldown (`_ALERT_COOLDOWN`) to prevent spam.
  New alert sources should plug into `_generate_alerts` and call
  `_try_alert(key, msg)`.
- DB schema changes: add the column to `models.py` AND extend
  `_apply_lightweight_migrations` in `db.py` so existing dev DBs keep
  working without manual migration.
- Pydantic models for request/response live inline at the top of each
  router file (see `routers/sessions.py`).
- Anything in the per-frame hot path must stay defensive — wrap new
  computations in `try/except` so a single frame's failure cannot
  poison the websocket loop.
