"""
Unified Proctoring Engine (Microservice Edition)
----------------------------------------------------------
* Full Multimodal Engine (MediaPipe + YOLO + SixDRepNet).
* Tuned for 500ms Server-Side Frame Analysis.
* Zeroed baselines and 6s face-missing grace period.
"""

import cv2
import numpy as np
from collections import deque
import time
from uniface import RetinaFace
from sixdrepnet import SixDRepNet
import mediapipe as mp
mp_face_mesh = mp.solutions.face_mesh
from ultralytics import YOLO

# thresholds
HEAD_YAW_BASELINE   = 0.0
HEAD_PITCH_BASELINE = 0.0
IRIS_H_BASELINE     = 0.5934
IRIS_V_BASELINE     = 0.3928

# safe zones
HEAD_YAW_SOFT, HEAD_YAW_HARD     = 18.0, 30.0   
HEAD_PITCH_SOFT, HEAD_PITCH_HARD = 15.0, 30.0   
IRIS_RIGHT_DELTA, IRIS_LEFT_DELTA, IRIS_DOWN_DELTA = 0.05, -0.10, -0.05   

# forgiveness thresholds
SOFT_WARN_SECS, HARD_WARN_SECS, HIGH_SECS = 4.0, 3.0, 6.0 
DEVICE_GRACE_PERIOD = 3.0 

LEFT_IRIS, LEFT_EYE, LEFT_EYE_TB       = [474, 475, 476, 477], [33,  133], [159, 145]
RIGHT_IRIS, RIGHT_EYE, RIGHT_EYE_TB    = [469, 470, 471, 472], [362, 263], [386, 374]

# Iris tracker
class IrisTracker:
    def __init__(self):
        self.face_mesh = mp_face_mesh.FaceMesh(
            max_num_faces=1, refine_landmarks=True,
            min_detection_confidence=0.5, min_tracking_confidence=0.5,
        )
        self.current_landmarks = None

    def process_frame(self, frame):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = self.face_mesh.process(rgb)
        self.current_landmarks = res.multi_face_landmarks[0].landmark if res.multi_face_landmarks else None

    def get_ratios(self, w, h):
        if not self.current_landmarks: return None
        lm = self.current_landmarks
        def pt(idx): return np.array([lm[idx].x * w, lm[idx].y * h])
        def ratio(i_ids, c_ids, tb_ids):
            ic, lc, rc = np.mean([pt(i) for i in i_ids], axis=0), pt(c_ids[0]), pt(c_ids[1])
            tc, bc = pt(tb_ids[0]), pt(tb_ids[1])
            ew, eh = np.linalg.norm(rc - lc), np.linalg.norm(bc - tc)
            return float((ic[0]-lc[0])/ew) if ew >= 1 else 0.5, float((ic[1]-tc[1])/eh) if eh >= 1 else 0.5
        
        lh, lv = ratio(LEFT_IRIS, LEFT_EYE, LEFT_EYE_TB)
        rh, rv = ratio(RIGHT_IRIS, RIGHT_EYE, RIGHT_EYE_TB)
        return (lh+rh)/2, (lv+rv)/2

# Unified Proctoring Engine
class UnifiedProctoringEngine:
    def __init__(self, yolo_path):
        print("Initializing Unified Multimodal Engine...")
        
        self.detector  = RetinaFace()
        self.pose_est  = SixDRepNet()
        self.iris      = IrisTracker()
        
        print(f"Loading YOLO Model: {yolo_path}")
        self.yolo_model = YOLO(yolo_path)
        
        self._timers      = {}
        self._head_buf    = deque(maxlen=4) 
        self._iris_buf    = deque(maxlen=4)
        self._frame_count = 0
        self._last_faces  = None
        self._last_devices = []
        print("Engine Ready.")
    
    def reset_state(self):
        """Wipes the phantom timers so old sessions don't instantly kill new ones."""
        self._timers = {}
        self._head_buf.clear()
        self._iris_buf.clear()
        self._frame_count = 0
        self._last_faces = None
        self._last_devices = []
        print("Engine state wiped clean for new session.")

    def _timer_update(self, name, active):
        now = time.time()
        if active:
            if name not in self._timers: self._timers[name] = now
            return now - self._timers[name]
        self._timers.pop(name, None)
        return 0.0

    def _correct_head(self, raw_yaw, raw_pitch):
        return (raw_yaw - HEAD_YAW_BASELINE), -(raw_pitch - HEAD_PITCH_BASELINE)

    def _classify_zone(self, yaw, pitch, iris_h, iris_v):
        ir, il, idown = False, False, False
        if abs(yaw) <= HEAD_YAW_SOFT and 0.1 <= iris_h <= 1.5 and iris_v >= 0.0:
            dh, dv = iris_h - IRIS_H_BASELINE, iris_v - IRIS_V_BASELINE
            ir, il, idown = dh > IRIS_RIGHT_DELTA, dh < IRIS_LEFT_DELTA, dv < IRIS_DOWN_DELTA

        if yaw > HEAD_YAW_HARD:   return "RIGHT", "hard"
        if yaw < -HEAD_YAW_HARD:  return "LEFT",  "hard"
        if pitch > HEAD_PITCH_HARD: return "DOWN",  "hard"
        if pitch < -HEAD_PITCH_HARD: return "UP",    "hard"
        
        if yaw > HEAD_YAW_SOFT or ir: return "RIGHT", "soft"
        if yaw < -HEAD_YAW_SOFT or il: return "LEFT", "soft"
        if pitch > HEAD_PITCH_SOFT or idown: return "DOWN", "soft"
        if pitch < -HEAD_PITCH_SOFT: return "UP", "soft"
        return "CENTER", "none"

    def process(self, frame):
        h, w = frame.shape[:2]
        self._frame_count += 1
        events = []

        # YOLO illegal device detection
        results = self.yolo_model(frame, conf=0.50, verbose=False)[0]
        self._last_devices = []
        for box in results.boxes:
            cls_name = self.yolo_model.names[int(box.cls[0])]
            if cls_name in ["phone", "mobile_phone", "headphone", "earphone"]:
                self._last_devices.append({
                    "class": cls_name, 
                    "conf": float(box.conf[0]), 
                    "bbox": box.xyxy[0].cpu().numpy().astype(int)
                })
        
        # Temporal Flag for Devices
        current_device_classes = {dev['class'] for dev in self._last_devices}
        for target_class in ["phone", "mobile_phone", "headphone", "earphone"]:
            is_present = target_class in current_device_classes
            dur = self._timer_update(f"device_{target_class}", is_present)
            
            if is_present and dur >= DEVICE_GRACE_PERIOD:  
                events.append({
                    "type": f"Unauthorized Device: {target_class.upper()}", 
                    "dur": dur, 
                    "sev": "HIGH"
                })

        # Gaze and Head Pose Analysis
        self.iris.process_frame(frame)
        
        if self._frame_count % 4 == 0 or self._last_faces is None:
            self._last_faces = self.detector.detect(frame)
        
        face_count = len(self._last_faces) if self._last_faces else 0
        
        if face_count > 1:
            events.append({"type": "Multiple People Detected", "dur": 0, "sev": "HIGH"})

        if face_count == 0:
            dur = self._timer_update("no_face", True)
            for k in ["RIGHT","LEFT","DOWN","UP"]: self._timer_update(k, False)
            if dur > 6.0: events.append({"type": "Candidate Missing", "dur": dur, "sev": "HIGH"})
            return self._build_payload("NO FACE", (0,0,255), None, 0, 0, face_count, events, self._last_devices)

        self._timer_update("no_face", False)
        best_face = max(self._last_faces, key=lambda f: f.confidence)
        fx1, fy1, fx2, fy2 = best_face.bbox.astype(int)

        try:
            p, y, r = self.pose_est.predict(frame)
            yaw, pitch = self._correct_head(float(y[0]), float(p[0]))
            self._head_buf.append((yaw, pitch))
        except:
            if not self._head_buf: self._head_buf.append((0.0, 0.0))
            
        head_yaw = float(np.mean([x[0] for x in self._head_buf]))
        head_pitch = float(np.mean([x[1] for x in self._head_buf]))

        iris_res = self.iris.get_ratios(w, h)
        if iris_res: self._iris_buf.append(iris_res)
        iris_h = float(np.mean([x[0] for x in self._iris_buf])) if self._iris_buf else IRIS_H_BASELINE
        iris_v = float(np.mean([x[1] for x in self._iris_buf])) if self._iris_buf else IRIS_V_BASELINE

        zone, tier = self._classify_zone(head_yaw, head_pitch, iris_h, iris_v)
        color = (0,200,0) if zone == "CENTER" else ((0,0,255) if tier == "hard" else (0,140,255))

        # Sustained Gaze Away
        if zone != "CENTER":
            dur = self._timer_update(zone, True)
            for k in ["RIGHT", "LEFT", "DOWN", "UP"]:
                if k != zone: self._timer_update(k, False)
            
            thresh = HARD_WARN_SECS if tier == "hard" else SOFT_WARN_SECS
            if dur >= thresh:
                sev = "HIGH" if dur >= HIGH_SECS else "MEDIUM"
                events.append({"type": f"Looking {zone}", "dur": dur, "sev": sev})
        else:
            for k in ["RIGHT","LEFT","DOWN","UP"]: self._timer_update(k, False)

        return self._build_payload(zone, color, [fx1, fy1, fx2, fy2], head_yaw, head_pitch, face_count, events, self._last_devices)

    def _build_payload(self, zone, color, bbox, yaw, pitch, face_count, events, devices):
        events.sort(key=lambda x: 0 if x["sev"] == "HIGH" else 1)
        return {
            "zone": zone, "color": color, "face_bbox": bbox, 
            "head_yaw": round(yaw, 1), "head_pitch": round(pitch, 1), 
            "face_count": face_count, "events": events, "devices": devices
        }