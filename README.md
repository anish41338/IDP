# Clinical Body Assessment Tool (IDP)

A full-stack clinical assessment application with real-time pose estimation, AI-assisted analysis, patient management, and PDF report export.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy (SQLite), MediaPipe, LiteLLM, ReportLab
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
├── main.py               # FastAPI app entry point
├── config.py             # Env var loading
├── requirements.txt
├── .env.example
├── database/
│   ├── db.py             # DB init, session
│   └── models.py         # SQLAlchemy models
├── routers/
│   ├── patients.py       # Patient CRUD endpoints
│   ├── sessions.py       # Session endpoints
│   ├── reports.py        # Report endpoints
│   ├── chat.py           # AI chat endpoints
│   └── export.py         # Export endpoints
├── services/
│   ├── pose_service.py   # MediaPipe pose estimation
│   ├── measurements.py   # Body measurements
│   ├── analytics.py      # Analytics processing
│   ├── calibration.py    # Camera calibration
│   ├── llm_service.py    # LiteLLM integration
│   └── pdf_service.py    # ReportLab PDF generation
└── websocket/
    └── video_stream.py   # WebSocket video stream

frontend/
├── src/                  # React source
├── vite.config.js        # Vite config with API proxy
├── tailwind.config.js
└── package.json
```

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
