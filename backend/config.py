import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clinical_assessment.db")
LLM_MODEL = os.getenv("LLM_MODEL", "groq/llama-3.3-70b-versatile")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

# Postural anomaly detection (services/anomaly_detector.py)
BASELINE_DURATION_SEC = float(os.getenv("BASELINE_DURATION_SEC", "60"))
ANOMALY_THRESHOLD = float(os.getenv("ANOMALY_THRESHOLD", "-0.1"))
SMOOTHING_WINDOW = int(os.getenv("SMOOTHING_WINDOW", "15"))
CONTAMINATION = float(os.getenv("CONTAMINATION", "0.05"))
BASELINE_DIR = os.getenv("BASELINE_DIR", os.path.join(os.path.dirname(__file__), "baselines"))
