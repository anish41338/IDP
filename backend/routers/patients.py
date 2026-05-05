from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from database.db import get_db
from database.models import Patient, MeasurementSession

router = APIRouter(prefix="/api/patients", tags=["patients"])


class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    name: str
    age: Optional[int]
    gender: Optional[str]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    notes: Optional[str]
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


@router.get("", response_model=List[PatientResponse])
def get_patients(db: DBSession = Depends(get_db)):
    return db.query(Patient).order_by(Patient.created_at.desc()).all()


@router.post("", response_model=PatientResponse, status_code=201)
def create_patient(patient: PatientCreate, db: DBSession = Depends(get_db)):
    db_patient = Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: DBSession = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: int, update: PatientUpdate, db: DBSession = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: int, db: DBSession = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()


@router.get("/{patient_id}/sessions")
def get_patient_sessions(patient_id: int, db: DBSession = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    sessions = db.query(MeasurementSession).filter(
        MeasurementSession.patient_id == patient_id
    ).order_by(MeasurementSession.session_date.desc()).all()
    return [
        {
            "id": s.id,
            "patient_id": s.patient_id,
            "measurements": s.measurements,
            "posture_alerts": s.posture_alerts,
            "notes": s.notes,
            "session_date": str(s.session_date),
        }
        for s in sessions
    ]
