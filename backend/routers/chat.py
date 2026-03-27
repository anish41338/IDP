from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from database.db import get_db
from database.models import Patient, MeasurementSession, ChatMessage
from services.llm_service import chat_with_context

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    content: str


@router.post("/{patient_id}", status_code=201)
def send_message(patient_id: int, req: ChatRequest, db: DBSession = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Save user message
    user_msg = ChatMessage(patient_id=patient_id, role="user", content=req.content)
    db.add(user_msg)
    db.commit()

    # Build context: last 5 sessions
    sessions = (
        db.query(MeasurementSession)
        .filter(MeasurementSession.patient_id == patient_id)
        .order_by(MeasurementSession.session_date.desc())
        .limit(5)
        .all()
    )
    sessions_data = [
        {"session_date": str(s.session_date), "measurements": s.measurements or {}}
        for s in sessions
    ]

    # Last 20 chat messages for context
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.patient_id == patient_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
        .all()
    )
    history.reverse()
    messages_data = [{"role": m.role, "content": m.content} for m in history]

    patient_data = {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
    }

    reply_content = chat_with_context(patient_data, sessions_data, messages_data)

    assistant_msg = ChatMessage(patient_id=patient_id, role="assistant", content=reply_content)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return {"id": assistant_msg.id, "role": "assistant", "content": reply_content}


@router.get("/{patient_id}")
def get_chat_history(patient_id: int, db: DBSession = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.patient_id == patient_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": str(m.created_at)} for m in messages]
