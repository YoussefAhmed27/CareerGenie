import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const SAMPLING_RATE = 100; 
const SMOOTHING_FACTOR = 0.05; 
const PROCTOR_INTERVAL = 500; 

export default function WebcamOverlay({ sessionId, onTerminate, isActive }) {
  const videoRef = useRef(null);
  const wsRef = useRef(null);     
  const onTerminateRef = useRef(onTerminate); 

  const [metrics, setMetrics] = useState({ confidence: 50, nervousness: 0, engagement: 50 });
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [proctorAlerts, setProctorAlerts] = useState([]);
  const [isTerminated, setIsTerminated] = useState(false);

  useEffect(() => {
    onTerminateRef.current = onTerminate;
  }, [onTerminate]);

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
                if (onTerminateRef.current) onTerminateRef.current(data.reason); 
            } else if (data.action === "WARN") {
                setProctorAlerts(data.events || []);
            }
        };

        setIsModelLoaded(true);
      } catch (e) { 
        console.error("CAMERA ERROR", e);
      }
    };
    init();

    return () => {
        if (wsRef.current) wsRef.current.close();
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };
  }, [sessionId]); 

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

    const memoryCanvas = document.createElement('canvas');
    const ctx = memoryCanvas.getContext('2d');
    let proctorInterval;

    const timeout = setTimeout(() => {
        proctorInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN && videoRef.current) {
                const video = videoRef.current;
                if (video.videoWidth === 0 || video.videoHeight === 0) return;
                
                memoryCanvas.width = video.videoWidth;
                memoryCanvas.height = video.videoHeight;
                
                ctx.drawImage(video, 0, 0, memoryCanvas.width, memoryCanvas.height);
                const base64Image = memoryCanvas.toDataURL('image/jpeg', 0.5);
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
      <div style={styles.videoWrapper}>
         <video ref={videoRef} muted playsInline style={styles.video} />
         
         {proctorAlerts.length > 0 && (
            <div style={{...styles.alertBanner, background: isTerminated ? '#7f1d1d' : 'rgba(239, 68, 68, 0.9)'}}>
                ⚠️ {proctorAlerts[0].type ? proctorAlerts[0].type.toUpperCase() : proctorAlerts[0].toUpperCase()}
            </div>
         )}
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
         <MetricRow label="CONFIDENCE" val={metrics.confidence} gradient="linear-gradient(90deg, #0d9488 0%, #2dd4bf 100%)" glow="rgba(45, 212, 191, 0.4)" />
         <MetricRow label="NERVOUSNESS" val={metrics.nervousness} gradient="linear-gradient(90deg, #be123c 0%, #fb7185 100%)" glow="rgba(251, 113, 133, 0.4)" />
         <MetricRow label="ENGAGEMENT" val={metrics.engagement} gradient="linear-gradient(90deg, #b45309 0%, #fbbf24 100%)" glow="rgba(251, 191, 36, 0.4)" />
      </div>
    </div>
  );
}

function lerp(start, end, t) { return start * (1 - t) + end * t; }

function MetricRow({label, val, gradient, glow}) {
    return (
        <div style={{display:'flex', alignItems:'center', fontSize:'11px', fontWeight:'600'}}>
            <div style={{width:'85px', color:'#94a3b8', letterSpacing:'0.5px'}}>{label}</div>
            
            <div style={{flex:1, height:'8px', background:'rgba(0,0,0,0.4)', borderRadius:'4px', overflow:'hidden', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{ 
                    width: Math.min(100, val)+'%', 
                    height:'100%', 
                    background: gradient, 
                    transition:'width 0.1s linear', 
                    borderRadius:'4px',
                    boxShadow: `0 0 8px ${glow}` 
                }}/>
            </div>
            <div style={{width:'35px', textAlign:'right', color:'#ffffff'}}>{Math.round(val)}%</div>
        </div>
    )
}

const styles = {
  container: { 
    position: 'absolute', bottom: '20px', left: '20px', width: '320px', 
    background: 'rgba(17, 21, 45, 0.75)', 
    backdropFilter: 'blur(24px) saturate(150%)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.08)', 
    borderRadius: '16px', 
    padding: '20px', color: '#ffffff', zIndex: 1000, 
    fontFamily: 'system-ui, sans-serif', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)' 
  },
  videoWrapper: { 
    width: '100%', height: '180px', background: '#000000', 
    overflow: 'hidden', position: 'relative', borderRadius: '12px', 
    marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  video: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  alertBanner: {
    position: 'absolute', bottom: '0', left: '0', width: '100%',
    color: 'white', padding: '8px 0', textAlign: 'center', fontSize: '12px',
    fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase',
    animation: 'pulseAlert 1s infinite'
  }
};