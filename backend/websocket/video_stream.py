import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.pose_service import pose_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/video")
async def video_stream(websocket: WebSocket):
    """Per-frame WebSocket handler.

    Tracking state on ``pose_service`` is intentionally NOT reset on every
    ``accept`` / disconnect. React.StrictMode double-mounts the client hook
    in dev (open → close → open) and any transient network blip causes a
    reconnect — wiping the in-progress anomaly calibration in either case
    used to make the baseline impossible to build.

    Reset is now driven by a client-supplied ``session_id`` in the config
    message: a new id resets state, the same id is treated as a reconnect
    of the same session and preserves the calibration buffer.
    """
    await websocket.accept()
    height_cm = 170.0  # default
    loop = asyncio.get_event_loop()

    try:
        while True:
            message = await websocket.receive()

            if "text" in message:
                try:
                    data = json.loads(message["text"])
                    if data.get("type") == "config":
                        height_cm = float(data.get("height_cm", 170.0))
                        session_id = data.get("session_id")
                        if session_id:
                            try:
                                if pose_service.maybe_reset_for_session(str(session_id)):
                                    logger.info("New session %s — tracking state reset", session_id)
                            except Exception:
                                pass
                        patient_id = data.get("patient_id")
                        if patient_id is not None:
                            try:
                                pose_service.set_patient(patient_id)
                            except Exception:
                                pass
                except (json.JSONDecodeError, ValueError):
                    pass

            elif "bytes" in message:
                frame_bytes = message["bytes"]
                b64_frame, measurements, alerts, detected = await loop.run_in_executor(
                    None, pose_service.process_frame, frame_bytes, height_cm
                )
                response = {
                    "frame": b64_frame,
                    "measurements": measurements,
                    "posture_alerts": alerts,
                    "landmarks_detected": detected,
                }
                await websocket.send_json(response)

    except WebSocketDisconnect:
        # Don't reset — a reconnect with the same session_id should resume.
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass
