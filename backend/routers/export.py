import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession
from database.db import get_db
from database.models import MeasurementSession, Patient, Report
from services.pdf_service import generate_session_pdf

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/pdf/{session_id}")
def export_pdf(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(MeasurementSession).filter(MeasurementSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    patient = session.patient
    reports = db.query(Report).filter(Report.session_id == session_id).order_by(Report.created_at.desc()).first()
    report_content = reports.content if reports else ""

    patient_data = {
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "height_cm": patient.height_cm,
        "weight_kg": patient.weight_kg,
    }
    session_data = {
        "measurements": session.measurements or {},
        "posture_alerts": session.posture_alerts or [],
        "notes": session.notes,
        "session_date": str(session.session_date),
    }

    pdf_bytes = generate_session_pdf(patient_data, session_data, report_content)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=session_{session_id}_report.pdf"
        },
    )


@router.get("/csv/{patient_id}")
def export_csv(patient_id: int, db: DBSession = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    sessions = (
        db.query(MeasurementSession)
        .filter(MeasurementSession.patient_id == patient_id)
        .order_by(MeasurementSession.session_date.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Determine all measurement keys
    all_keys = set()
    for s in sessions:
        if s.measurements:
            all_keys.update(s.measurements.keys())
    all_keys = sorted(all_keys)

    header = ["session_id", "session_date", "notes"] + all_keys
    writer.writerow(header)

    for s in sessions:
        row = [s.id, str(s.session_date), s.notes or ""]
        meas = s.measurements or {}
        for key in all_keys:
            row.append(meas.get(key, ""))
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=patient_{patient_id}_sessions.csv"
        },
    )
