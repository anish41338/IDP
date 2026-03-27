import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clinical_assessment.db")
LLM_MODEL = os.getenv("LLM_MODEL", "groq/llama-3.1-70b-versatile")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
