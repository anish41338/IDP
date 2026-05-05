import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
from services.pose_service import pose_service

router = APIRouter()


@router.websocket("/ws/video")
async def video_stream(websocket: WebSocket):
    await websocket.accept()
    height_cm = 170.0  # default
    loop = asyncio.get_event_loop()

    # Reset all Kalman state + alert cooldowns at the start of every new session
    pose_service.reset_tracking()

    try:
        while True:
            message = await websocket.receive()

            if "text" in message:
                try:
                    data = json.loads(message["text"])
                    if data.get("type") == "config":
                        height_cm = float(data.get("height_cm", 170.0))
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
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass
    finally:
        # Clean up between sessions so next patient starts fresh
        pose_service.reset_tracking()
