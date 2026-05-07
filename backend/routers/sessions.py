from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from typing import Optional
from pydantic import BaseModel
from database.db import get_db
from database.models import MeasurementSession

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    patient_id: int
    measurements: Optional[dict] = None
    posture_alerts: Optional[list] = None
    anomaly_summary: Optional[dict] = None
    notes: Optional[str] = None


def _serialize(session: MeasurementSession) -> dict:
    return {
        "id": session.id,
        "patient_id": session.patient_id,
        "measurements": session.measurements,
        "posture_alerts": session.posture_alerts,
        "anomaly_summary": session.anomaly_summary,
        "notes": session.notes,
        "session_date": str(session.session_date),
    }


@router.post("", status_code=201)
def create_session(session: SessionCreate, db: DBSession = Depends(get_db)):
    db_session = MeasurementSession(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return _serialize(db_session)


@router.get("/{session_id}")
def get_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(MeasurementSession).filter(MeasurementSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _serialize(session)


@router.get("/{session_id}/anomalies")
def get_session_anomalies(session_id: int, db: DBSession = Depends(get_db)):
    """Return the persisted anomaly summary for a session.

    Returns 404 if the session does not exist or no anomaly data was
    recorded (e.g., the session predates the anomaly detector).
    """
    session = db.query(MeasurementSession).filter(MeasurementSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.anomaly_summary:
        raise HTTPException(status_code=404, detail="No anomaly data for this session")
    return {
        "session_id": session.id,
        "patient_id": session.patient_id,
        "anomaly_summary": session.anomaly_summary,
    }
