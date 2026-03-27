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
    notes: Optional[str] = None


@router.post("", status_code=201)
def create_session(session: SessionCreate, db: DBSession = Depends(get_db)):
    db_session = MeasurementSession(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return {
        "id": db_session.id,
        "patient_id": db_session.patient_id,
        "measurements": db_session.measurements,
        "posture_alerts": db_session.posture_alerts,
        "notes": db_session.notes,
        "session_date": str(db_session.session_date),
    }


@router.get("/{session_id}")
def get_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(MeasurementSession).filter(MeasurementSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "patient_id": session.patient_id,
        "measurements": session.measurements,
        "posture_alerts": session.posture_alerts,
        "notes": session.notes,
        "session_date": str(session.session_date),
    }
