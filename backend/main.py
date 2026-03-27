from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import ALLOWED_ORIGINS
from database.db import init_db
from routers import patients, sessions, reports, chat, export
from websocket.video_stream import router as ws_router

app = FastAPI(title="Clinical Body Assessment Tool", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    init_db()


app.include_router(patients.router)
app.include_router(sessions.router)
app.include_router(reports.router)
app.include_router(chat.router)
app.include_router(export.router)
app.include_router(ws_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
