from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from database.db import get_db
from database.models import MeasurementSession, Report, Patient
from services.llm_service import generate_assessment_report, generate_progress_report, generate_soap_note
from services.analytics import compare_to_norms, compute_progress_delta

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportRequest(BaseModel):
    session_id: int


class ProgressReportRequest(BaseModel):
    session_id: int
    previous_session_id: int


def _session_to_dict(session: MeasurementSession) -> dict:
    return {
        "id": session.id,
        "measurements": session.measurements or {},
        "posture_alerts": session.posture_alerts or [],
        "notes": session.notes,
        "session_date": str(session.session_date),
    }


def _patient_to_dict(patient: Patient) -> dict:
    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "height_cm": patient.height_cm,
        "weight_kg": patient.weight_kg,
    }


@router.post("/assessment", status_code=201)
def create_assessment_report(req: ReportRequest, db: DBSession = Depends(get_db)):
    session = db.query(MeasurementSession).filter(MeasurementSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    patient = session.patient
    norms = {}
    if patient.age and patient.gender and session.measurements:
        norms = compare_to_norms(session.measurements, patient.age, patient.gender)
    content = generate_assessment_report(_patient_to_dict(patient), _session_to_dict(session), norms)
    report = Report(session_id=session.id, report_type="assessment", content=content)
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "session_id": report.session_id, "report_type": report.report_type, "content": report.content}


@router.post("/progress", status_code=201)
def create_progress_report(req: ProgressReportRequest, db: DBSession = Depends(get_db)):
    current = db.query(MeasurementSession).filter(MeasurementSession.id == req.session_id).first()
    previous = db.query(MeasurementSession).filter(MeasurementSession.id == req.previous_session_id).first()
    if not current or not previous:
        raise HTTPException(status_code=404, detail="Session not found")
    delta = compute_progress_delta(
        current.measurements or {}, previous.measurements or {}
    )
    patient = current.patient
    content = generate_progress_report(
        _patient_to_dict(patient), _session_to_dict(current), _session_to_dict(previous), delta
    )
    report = Report(session_id=current.id, report_type="progress", content=content)
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "session_id": report.session_id, "report_type": report.report_type, "content": report.content}


@router.post("/soap", status_code=201)
def create_soap_report(req: ReportRequest, db: DBSession = Depends(get_db)):
    session = db.query(MeasurementSession).filter(MeasurementSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    patient = session.patient
    content = generate_soap_note(_patient_to_dict(patient), _session_to_dict(session))
    report = Report(session_id=session.id, report_type="soap", content=content)
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "session_id": report.session_id, "report_type": report.report_type, "content": report.content}


@router.get("/{session_id}")
def get_session_reports(session_id: int, db: DBSession = Depends(get_db)):
    reports = db.query(Report).filter(Report.session_id == session_id).all()
    return [
        {"id": r.id, "session_id": r.session_id, "report_type": r.report_type,
         "content": r.content, "created_at": str(r.created_at)}
        for r in reports
    ]
