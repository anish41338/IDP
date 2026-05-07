# Clinical Body Assessment Tool (IDP)

A full-stack clinical assessment application with real-time pose estimation, AI-assisted analysis, patient management, and PDF report export.

Real-time analysis includes MediaPipe pose tracking, REBA/RULA scoring, and a per-user **postural anomaly detector** (scikit-learn IsolationForest fit on the user's first 60 seconds, then scoring every subsequent frame against that personal baseline).

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy (SQLite), MediaPipe, scikit-learn, LiteLLM, ReportLab
- **Frontend**: React 18, Vite, TailwindCSS, Recharts, Framer Motion

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- A webcam (for pose/video features)
- An API key for at least one LLM provider (Groq recommended)

---

## Setup

### 1. Clone / open the project

```
D:\ML\IDP\
├── backend\
└── frontend\
```

---

### 2. Backend setup

```bash
cd backend
```

**Create and activate a virtual environment:**

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Configure environment variables:**

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and fill in your API key(s):

```env
DATABASE_URL=sqlite:///./clinical_assessment.db
LLM_MODEL=groq/llama-3.1-70b-versatile
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=your_openai_key_here        # optional
ANTHROPIC_API_KEY=your_anthropic_key_here  # optional
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Anomaly detection (all optional — sensible defaults are used if omitted)
BASELINE_DURATION_SEC=60     # length of the calibration window
ANOMALY_THRESHOLD=-0.1       # IsolationForest score_samples cutoff
SMOOTHING_WINDOW=15          # frames of EMA over the score
CONTAMINATION=0.05           # IsolationForest contamination
# BASELINE_DIR=./baselines   # where pickled per-patient baselines live
```

> Only one LLM provider key is required. The default model uses Groq.

---

### 3. Frontend setup

```bash
cd frontend
npm install
```

---

## Running the App

Both the backend and frontend must be running simultaneously.

### Start the backend

```bash
cd backend
venv\Scripts\activate   # if not already active
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`
API docs (Swagger UI): `http://localhost:8000/docs`
Health check: `http://localhost:8000/health`

### Start the frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173`

> The Vite dev server proxies `/api` and `/ws` requests to the backend at `localhost:8000` automatically — no manual CORS configuration needed during development.

---

## Project Structure

```
backend/
├── main.py                  # FastAPI app entry point
├── config.py                # Env var loading
├── requirements.txt
├── .env.example
├── database/
│   ├── db.py                # DB init, session, lightweight ALTER migrations
│   └── models.py            # SQLAlchemy models (incl. anomaly_summary on sessions)
├── routers/
│   ├── patients.py          # Patient CRUD endpoints
│   ├── sessions.py          # Session endpoints (incl. /sessions/{id}/anomalies)
│   ├── reports.py           # Report endpoints
│   ├── chat.py              # AI chat endpoints
│   └── export.py            # Export endpoints
├── services/
│   ├── pose_service.py      # MediaPipe pose + per-frame orchestrator
│   ├── joint_angles.py      # 14-angle joint kinematics
│   ├── reba.py / rula.py    # Published lookup-table scoring
│   ├── kalman_filter.py     # 3D landmark smoother
│   ├── anomaly_detector.py  # IsolationForest per-user posture baseline
│   ├── measurements.py      # Body measurements
│   ├── analytics.py         # Analytics processing
│   ├── calibration.py       # Camera calibration
│   ├── llm_service.py       # LiteLLM integration
│   └── pdf_service.py       # ReportLab PDF generation
├── baselines/               # Pickled per-patient anomaly baselines (.pkl)
└── websocket/
    └── video_stream.py      # WebSocket video stream

frontend/
├── src/
│   ├── components/measurement/
│   │   ├── MeasurementPanel.jsx
│   │   ├── AnomalyGauge.jsx     # Calibration progress + live anomaly score
│   │   └── ...
│   ├── hooks/useVideoStream.js  # Sends {height_cm, patient_id} config
│   └── pages/LiveMonitor.jsx
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Postural anomaly detection

In addition to the rule-based REBA/RULA scoring, the live monitor learns the *user's own* typical posture during the first `BASELINE_DURATION_SEC` seconds of a session and then flags any frame whose joint-angle pattern deviates from that personal baseline. This catches subtle ergonomic issues that population-norm rules miss.

- **Algorithm:** scikit-learn `IsolationForest` on a 19-feature vector built from `services/joint_angles.py` outputs (14 angles + 5 bilateral L−R deltas), standardized via `StandardScaler`.
- **Output (per frame, in `measurements.anomaly`):**
  `{score, is_anomalous, severity, top_features, calibrating, calibration_progress}`
  where severity is `NORMAL | MILD | MODERATE | SEVERE` and `top_features` lists the 3 angles pulling the score down most (per-feature ablation).
- **UI:** [`AnomalyGauge`](frontend/src/components/measurement/AnomalyGauge.jsx) renders the calibration progress bar during the first 60 s, then a live severity gauge with contributor chips.
- **Persistence:** when the WebSocket client sends `patient_id` in its config message, the fitted scaler+model are pickled to `backend/baselines/patient_<id>.pkl` and re-loaded automatically next time. Aggregated severity counts ride on `MeasurementSession.anomaly_summary` and are exposed via `GET /api/sessions/{id}/anomalies`.
- **Optional dependency:** if `scikit-learn` is missing the detector silently disables itself; the rest of the pipeline is unaffected.

---

## Common Issues

**MediaPipe installation fails on Windows:**
```bash
pip install mediapipe==0.10.14 --no-cache-dir
```

**Port already in use:**
```bash
# Change backend port
uvicorn main:app --reload --port 8001

# Update ALLOWED_ORIGINS in .env and vite.config.js proxy target accordingly
```

**Database reset** (deletes all data):
```bash
cd backend
rm clinical_assessment.db
# Restart the backend — it will recreate the DB automatically on startup
```
