# proctor_server.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import cv2
import numpy as np
import base64
import requests
import asyncio
from proctor_engine import UnifiedProctoringEngine 

app = FastAPI()

print("Loading Proctoring Engine into memory...")
engine = UnifiedProctoringEngine(yolo_path="models/best.pt")
print("Proctoring Server Ready on Port 8001.")

@app.websocket("/ws/proctor/{session_id}")
async def proctor_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    print(f"[{session_id}] Proctoring Client Connected!")
    engine.reset_state()
    
    try:
        while True:
            data = await websocket.receive_text()
            encoded_data = data.split(',')[1] 
            
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            res = engine.process(frame)
            high_alerts = [e for e in res["events"] if e["sev"] == "HIGH"]

            if high_alerts:
                print(f"[{session_id}] CHEATING DETECTED: {high_alerts[0]['type']}")
                
                try:
                    requests.post("http://127.0.0.1:8000/api/log_proctor_event", json={
                        "session_id": session_id,
                        "event_type": high_alerts[0]["type"],
                        "action_taken": "TERMINATED"
                    }, timeout=2)
                except Exception as e:
                    print(f"Could not reach main backend: {e}")

                await websocket.send_json({
                    "action": "TERMINATE", 
                    "reason": high_alerts[0]["type"]
                })
                break 
            else:
                await websocket.send_json({
                    "action": "WARN", 
                    "events": res["events"]
                })
            
    except WebSocketDisconnect:
        print(f"[{session_id}] Proctoring Client Disconnected.")
    except Exception as e:
        print(f"Error processing frame: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)