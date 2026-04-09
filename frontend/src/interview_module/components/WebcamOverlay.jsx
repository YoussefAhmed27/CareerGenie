import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const SAMPLING_RATE = 100; 
const SMOOTHING_FACTOR = 0.05; 
const PROCTOR_INTERVAL = 500; 

export default function WebcamOverlay({ sessionId, onTerminate, isActive }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); 
  const wsRef = useRef(null);     

  const [status, setStatus] = useState("Initializing...");
  const [metrics, setMetrics] = useState({ confidence: 50, nervousness: 0, engagement: 50 });
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [proctorAlerts, setProctorAlerts] = useState([]);
  const [isTerminated, setIsTerminated] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        }
        
        wsRef.current = new WebSocket(`ws://127.0.0.1:8001/ws/proctor/${sessionId}`);
        
        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.action === "TERMINATE") {
                setIsTerminated(true);
                setProctorAlerts([{ type: `TERMINATED: ${data.reason}` }]);
                if (onTerminate) onTerminate(data.reason); 
            } else if (data.action === "WARN") {
                setProctorAlerts(data.events || []);
            }
        };

        setIsModelLoaded(true);
        setStatus("ACTIVE");
      } catch (e) { 
        setStatus("CAMERA ERROR"); 
      }
    };
    init();

    return () => {
        if (wsRef.current) wsRef.current.close();
    };
  }, [sessionId, onTerminate]);

  useEffect(() => {
    if (!isModelLoaded || isTerminated) return;

    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused) return;
      try {
        const detection = await faceapi.detectSingleFace(
          videoRef.current, new faceapi.TinyFaceDetectorOptions()
        ).withFaceExpressions();

        if (detection) {
          const s = detection.expressions;
          let targetNerv = (s.fearful * 5.0) + (s.sad * 3.0) + (s.disgusted * 3.0);
          if (s.happy < 0.1) {
             targetNerv += (s.surprised * 2.0); 
             targetNerv += (s.neutral * 0.3);  
          }
          targetNerv = Math.min(100, targetNerv * 100);

          let targetConf = (s.happy * 1.2) + (s.neutral * 0.5);
          targetConf = (targetConf * 100) - targetNerv; 
          targetConf = Math.min(100, Math.max(0, targetConf));

          let targetEng = (s.happy * 1.0) + (s.surprised * 1.5) + (s.neutral * 0.4);
          targetEng = targetEng * 100;
          targetEng -= (targetNerv * 0.4);
          targetEng = Math.min(100, Math.max(0, targetEng));

          setMetrics(prev => ({
            confidence: lerp(prev.confidence, targetConf, SMOOTHING_FACTOR),
            nervousness: lerp(prev.nervousness, targetNerv, SMOOTHING_FACTOR),
            engagement: lerp(prev.engagement, targetEng, SMOOTHING_FACTOR)
          }));
        }
      } catch (e) {}
    }, SAMPLING_RATE);

    return () => clearInterval(interval);
  }, [isModelLoaded, isTerminated]);

  useEffect(() => {
    if (!isModelLoaded || isTerminated || !isActive) return;

    let proctorInterval;
    const timeout = setTimeout(() => {
        proctorInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const base64Image = canvas.toDataURL('image/jpeg', 0.5);
                wsRef.current.send(base64Image);
            }
        }, PROCTOR_INTERVAL);
    }, 3000); 

    return () => {
        clearTimeout(timeout);
        if (proctorInterval) clearInterval(proctorInterval);
    };
  }, [isModelLoaded, isTerminated, isActive]);

  return (
    <div style={styles.container}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={styles.videoWrapper}>
         <video ref={videoRef} muted playsInline style={styles.video} />
         
         <div style={styles.statusOverlay}>
            <span style={{color: metrics.confidence > 0 ? '#10b981' : '#6b7280'}}>
                {isTerminated ? "● OFFLINE" : (status === "ACTIVE" ? (isActive ? "● REAL-TIME AI" : "● WAITING FOR AVATAR...") : status)}
            </span>
         </div>

         {proctorAlerts.length > 0 && (
            <div style={{...styles.alertBanner, background: isTerminated ? '#7f1d1d' : 'rgba(239, 68, 68, 0.9)'}}>
                ⚠️ {proctorAlerts[0].type ? proctorAlerts[0].type.toUpperCase() : proctorAlerts[0].toUpperCase()}
            </div>
         )}
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
         <MetricRow label="CONFIDENCE" val={metrics.confidence} color="#10b981" />
         <MetricRow label="NERVOUSNESS" val={metrics.nervousness} color="#ef4444" />
         <MetricRow label="ENGAGEMENT" val={metrics.engagement} color="#f59e0b" />
      </div>
    </div>
  );
}

function lerp(start, end, t) { return start * (1 - t) + end * t; }

const styles = {
  container: { 
    position: 'absolute', bottom: '20px', left: '20px', width: '320px', 
    background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.5)', borderRadius: '16px', 
    padding: '20px', color: '#1f2937', zIndex: 1000, 
    fontFamily: 'system-ui, sans-serif', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)' 
  },
  videoWrapper: { 
    width: '100%', height: '180px', background: '#e5e7eb', 
    overflow: 'hidden', position: 'relative', borderRadius: '12px', 
    marginBottom: '20px', border: '1px solid #d1d5db' 
  },
  video: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  statusOverlay: { 
    position: 'absolute', top: '10px', left: '10px', fontSize: '10px', fontWeight: '700', 
    background: 'rgba(255, 255, 255, 0.95)', padding: '4px 10px', borderRadius: '20px', 
    color: '#374151', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  alertBanner: {
    position: 'absolute', bottom: '0', left: '0', width: '100%',
    color: 'white', padding: '8px 0', textAlign: 'center', fontSize: '12px',
    fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase',
    animation: 'pulseAlert 1s infinite'
  }
};

function MetricRow({label, val, color}) {
    return (
        <div style={{display:'flex', alignItems:'center', fontSize:'11px', fontWeight:'600'}}>
            <div style={{width:'85px', color:'#6b7280', letterSpacing:'0.5px'}}>{label}</div>
            <div style={{flex:1, height:'8px', background:'#f3f4f6', borderRadius:'4px', overflow:'hidden'}}>
                <div style={{ width: Math.min(100, val)+'%', height:'100%', background: color, transition:'width 0.1s linear', borderRadius:'4px' }}/>
            </div>
            <div style={{width:'35px', textAlign:'right', color:'#111827'}}>{Math.round(val)}%</div>
        </div>
    )
}