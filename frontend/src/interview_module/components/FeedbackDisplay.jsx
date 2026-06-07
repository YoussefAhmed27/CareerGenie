import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../interview-styles.css';
import { saveHrInterviewResult, saveInterviewResult } from '../api/interviewService';

const CYAN = '#00f2fe';
const MAGENTA = '#d422eb';
const AI_BASE_URL = import.meta.env.VITE_AI_URL || import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000';

function scoreColor(score) {
  if (score >= 8.5) return '#00f2fe';
  if (score >= 7.5) return '#29d4d4';
  if (score >= 6.5) return '#a07ae0';
  if (score >= 5.5) return '#d422eb';
  return '#ff0844';
}

const IconStrength = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${CYAN}80)` }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
const IconWeakness = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff0844" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(255,8,68,0.6))' }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
);
const IconTip = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={MAGENTA} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${MAGENTA}80)` }}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const ParticleCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 1.5 + 0.5,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,242,254,0.3)'; ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0,242,254,${0.05 * (1 - d / 120)})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }));
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0 }} />;
};

const SkillsSphere = ({ skills }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!skills || skills.length === 0) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const W = 350, H = 350, cx = 175, cy = 175, r = 110;
    let rotX = 0.3, rotY = 0, dragging = false, lastX = 0, lastY = 0;
    
    const nodes = skills.map((s, i) => {
      const phi = (i / skills.length) * Math.PI * 2;
      const theta = (Math.PI / 4) + (Math.random() * Math.PI / 2);
      return { ...s, theta, phi };
    });

    const project = (theta, phi) => {
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      const ry = x * Math.cos(rotY) - z * Math.sin(rotY);
      const rz = x * Math.sin(rotY) + z * Math.cos(rotY);
      const rx2 = y * Math.cos(rotX) - rz * Math.sin(rotX);
      const rz2 = y * Math.sin(rotX) + rz * Math.cos(rotX);
      const scale = 1 + rz2 / (r * 3);
      return { sx: cx + ry * scale, sy: cy - rx2 * scale, depth: rz2, scale };
    };

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        for (let j = 0; j <= 40; j++) { const p = project(i / 6 * Math.PI, j / 40 * Math.PI * 2); j === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy); }
        ctx.stroke();
      }
      for (let j = 0; j < 6; j++) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const p = project(i / 40 * Math.PI, j / 6 * Math.PI * 2); i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy); }
        ctx.stroke();
      }

      const projected = nodes.map(n => ({ ...n, ...project(n.theta, n.phi) })).sort((a, b) => a.depth - b.depth);
      
      ctx.beginPath();
      projected.forEach((n, i) => {
        projected.forEach((other, j) => {
          if (i !== j && Math.hypot(n.sx - other.sx, n.sy - other.sy) < 150) {
            ctx.moveTo(n.sx, n.sy); ctx.lineTo(other.sx, other.sy);
          }
        });
      });
      ctx.strokeStyle = 'rgba(0,242,254,0.2)'; ctx.lineWidth = 1; ctx.stroke();

      projected.forEach(n => {
        const alpha = Math.max(0.3, (n.depth + r) / (2 * r));
        const dotR = (n.score / 10) * 8 * n.scale;
        const c = scoreColor(n.score);
        
        ctx.beginPath(); ctx.arc(n.sx, n.sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `${c}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`; ctx.fill();
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();

        ctx.font = `800 ${Math.max(11, 13 * n.scale)}px system-ui,sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${alpha + 0.3})`; 
        ctx.textAlign = n.sx > cx ? 'left' : 'right'; ctx.textBaseline = 'middle';
        const tx = n.sx + (n.sx > cx ? dotR + 8 : -(dotR + 8));
        ctx.fillText(n.name.toUpperCase(), tx, n.sy - 5);
        
        ctx.font = '700 11px monospace'; 
        ctx.fillStyle = c; 
        ctx.fillText(n.score.toFixed(1), tx, n.sy + 12);
      });
      if (!dragging) rotY += 0.003;
      animId = requestAnimationFrame(draw);
    };

    const onDown = e => { dragging = true; lastX = e.offsetX; lastY = e.offsetY; };
    const onUp = () => { dragging = false; };
    const onMove = e => {
      if (dragging) { rotY += (e.clientX - lastX) * 0.01; rotX += (e.clientY - lastY) * 0.01; lastX = e.clientX; lastY = e.clientY; }
    };
    canvas.addEventListener('mousedown', onDown); window.addEventListener('mouseup', onUp);
    canvas.addEventListener('mousemove', onMove);
    draw();
    return () => {
      cancelAnimationFrame(animId); canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp); canvas.removeEventListener('mousemove', onMove);
    };
  }, [skills]);
  return <canvas ref={ref} width={350} height={350} style={{ display: 'block', margin: '0 auto', cursor: 'grab' }} />;
};

const TimelineChart = ({ lines, duration, title }) => {
  const pathDataList = useMemo(() => {
    return lines.map(line => {
      const startY = 40 + Math.random() * 40; 
      const midY = 30 + Math.random() * 50;   
      const finalY = 100 - (line.finalScore / 10) * 80; 
      
      const path = `M 0,${startY} C 200,${midY} 400,${midY + 20} 800,${finalY}`;
      return { ...line, path, finalY };
    });
  }, [lines]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const tMid = formatTime(duration / 2);
  const tEnd = formatTime(duration);

  return (
    <div style={{ background: '#11141d', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', width: '100%', boxSizing: 'border-box' }}>
      <h3 style={{ color: '#a0aab2', letterSpacing: '3px', marginBottom: '30px', fontSize: '13px', fontWeight: '800' }}>{title}</h3>
      <div style={{ position: 'relative', width: '100%', height: '140px' }}>
        <svg width="100%" height="100%" viewBox="0 0 800 120" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <line x1="0" y1="20" x2="800" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <line x1="0" y1="60" x2="800" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

          {pathDataList.map((line, i) => (
            <g key={i}>
              <path d={line.path} fill="none" stroke={line.color} strokeWidth="3" style={{ filter: `drop-shadow(0 0 6px ${line.color}80)` }} />
              <path d={`${line.path} L 800,120 L 0,120 Z`} fill={`url(#grad-${i})`} opacity="0.2" />
              <circle cx="800" cy={line.finalY} r="5" fill="#fff" filter={`drop-shadow(0 0 6px ${line.color})`} />
              <text x="815" y={line.finalY} fill={line.color} fontSize="12px" fontWeight="800" dominantBaseline="middle" fontFamily="monospace">
                {line.finalScore.toFixed(1)} {line.label}
              </text>
              <defs>
                <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={line.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={line.color} stopOpacity="0" />
                </linearGradient>
              </defs>
            </g>
          ))}
          <text x="0" y="135" fill="#7586a1" fontSize="10px" fontWeight="800">0:00</text>
          <text x="400" y="135" fill="#7586a1" fontSize="10px" fontWeight="800" textAnchor="middle">{tMid}</text>
          <text x="800" y="135" fill="#7586a1" fontSize="10px" fontWeight="800" textAnchor="end">{tEnd}</text>
        </svg>
      </div>
    </div>
  );
};

const ScoreOrb = ({ score }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1800, start = performance.now();
    const tick = now => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(parseFloat((p * score).toFixed(1)));
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [score]);

  return (
    <div style={{ position: 'relative', width: 450, height: 450 }}>
      {[0, 30, 60].map((inset, i) => (
        <div key={i} style={{
          position: 'absolute', inset, borderRadius: '50%', border: `1px solid ${i === 1 ? 'rgba(212,34,235,0.2)' : 'rgba(0,242,254,0.25)'}`,
          animation: `orbSpin ${10 + i * 4}s linear infinite ${i === 1 ? 'reverse' : ''}`,
          borderStyle: i === 2 ? 'dashed' : 'solid',
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 90, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, rgba(0,242,254,0.15), rgba(212,34,235,0.05), rgba(11,14,20,0.9))',
        border: '1px solid rgba(0,242,254,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 70px ${scoreColor(score)}40`
      }}>
        <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 1, background: `linear-gradient(135deg, ${CYAN}, ${MAGENTA})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'monospace' }}>{display}</div>
        <div style={{ fontSize: 14, letterSpacing: 4, color: '#a0aab2', marginTop: 12, textTransform: 'uppercase', fontWeight: 800 }}>MATCH SCORE</div>
      </div>
    </div>
  );
};

const MassiveDonut = ({ score, label, size = 160 }) => {
  const r = size * 0.38, circ = 2 * Math.PI * r, offset = circ - (score / 10) * circ;
  const c = scoreColor(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={c} strokeWidth="12" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 8px ${c}80)` }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.24} fontWeight="800" fill="#fff" transform={`rotate(90, ${size/2}, ${size/2})`} fontFamily="monospace">{score.toFixed(1)}</text>
      </svg>
      {label && <span style={{ fontSize: 14, letterSpacing: 2, color: '#a0aab2', textTransform: 'uppercase', fontWeight: 800, marginTop: '10px' }}>{label}</span>}
    </div>
  );
};

const MiniDonut = ({ score, label, size = 100 }) => {
  const r = size * 0.38, circ = 2 * Math.PI * r, offset = circ - (score / 10) * circ;
  const c = scoreColor(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={c} strokeWidth="8" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 6px ${c}80)` }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.22} fontWeight="800" fill="#fff" transform={`rotate(90, ${size/2}, ${size/2})`} fontFamily="monospace">{score.toFixed(1)}</text>
      </svg>
      <span style={{ fontSize: 12, letterSpacing: 1.5, color: '#a0aab2', textTransform: 'uppercase', fontWeight: 800 }}>{label}</span>
    </div>
  );
};

const GlowingRadarChart = ({ traits }) => {
  const [activeTrait, setActiveTrait] = useState(null);

  const size = 420, center = size / 2, radius = 135;
  
  const traitData = [
    { label: 'OPENNESS', val: traits.openness || 0 },
    { label: 'CONSCIENTIOUS', val: traits.conscientiousness || 0 },
    { label: 'EXTRAVERSION', val: traits.extraversion || 0 },
    { label: 'AGREEABLE', val: traits.agreeableness || 0 },
    { label: 'NEUROTICISM', val: traits.neuroticism || 0 }
  ];

  const getCoords = (val, i, radScale = 1) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return { x: center + (val / 10) * radius * radScale * Math.cos(angle), y: center + (val / 10) * radius * radScale * Math.sin(angle) };
  };

  const points = traitData.map((d, i) => `${getCoords(d.val, i).x},${getCoords(d.val, i).y}`).join(' ');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs><radialGradient id="radarGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={`${MAGENTA}50`} /><stop offset="100%" stopColor={`${MAGENTA}00`} /></radialGradient></defs>
        
        {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
          <polygon key={scale} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" points={traitData.map((_, i) => `${getCoords(10, i, scale).x},${getCoords(10, i, scale).y}`).join(' ')} />
        ))}
        {traitData.map((_, i) => <line key={i} x1={center} y1={center} x2={getCoords(10, i).x} y2={getCoords(10, i).y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />)}
        
        <polygon points={points} fill="url(#radarGlow)" stroke={MAGENTA} strokeWidth="3" style={{ filter: `drop-shadow(0 0 10px ${MAGENTA}80)`, pointerEvents: 'none' }} />
        
        {traitData.map((d, i) => {
          const point = getCoords(d.val, i);
          const textPos = getCoords(11.5, i); 
          const isActive = activeTrait === i;
          
          return (
            <g key={i} 
               onMouseEnter={() => setActiveTrait(i)} 
               onMouseLeave={() => setActiveTrait(null)} 
               style={{ cursor: 'crosshair' }}>
              <circle cx={point.x} cy={point.y} r="25" fill="transparent" />
              <circle cx={point.x} cy={point.y} r={isActive ? 8 : 5} fill="#fff" filter={`drop-shadow(0 0 6px ${MAGENTA})`} style={{ transition: 'r 0.2s' }} />
              <text x={textPos.x} y={textPos.y} fill={isActive ? '#fff' : '#a0aab2'} fontSize="11px" fontWeight="800" letterSpacing="1.5px" textAnchor="middle" dominantBaseline="middle" style={{ transition: 'fill 0.2s' }}>
                {d.label}
              </text>
            </g>
          );
        })}

        {activeTrait !== null && (() => {
          const pt = getCoords(traitData[activeTrait].val, activeTrait);
          return (
            <g style={{ pointerEvents: 'none', transition: 'all 0.1s' }}>
              <rect x={pt.x - 25} y={pt.y - 35} width={50} height={22} rx={6} fill="#0b0e14" stroke={MAGENTA} strokeWidth={1.5} filter={`drop-shadow(0 0 6px ${MAGENTA})`} />
              <text x={pt.x} y={pt.y - 23} fill="#fff" fontSize="12px" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontFamily="monospace">
                {traitData[activeTrait].val.toFixed(1)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

const MetricBarAnimated = ({ label, score }) => {
  const [animate, setAnimate] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const ob = new IntersectionObserver(entries => { if (entries[0].isIntersecting) setAnimate(true); }, { threshold: 0.1 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  const color = scoreColor(score);

  return (
    <div ref={ref} style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: '#a0aab2', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: '16px', color: color, fontWeight: '900', fontFamily: 'monospace' }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: animate ? `${(score / 10) * 100}%` : '0%', height: '100%', background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: '4px', transition: 'width 1.5s cubic-bezier(0.25, 0.8, 0.25, 1)', boxShadow: `0 0 15px ${color}60` }} />
      </div>
    </div>
  );
};

const InsightList = ({ items, type }) => {
  if (!items || items.length === 0) return <p style={{ color: '#4a536b', fontStyle: 'italic' }}>Awaiting data stream...</p>;
  const Icon = type === 'strength' ? IconStrength : type === 'weakness' ? IconWeakness : IconTip;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: '20px', background: '#11141d', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.2s', zIndex: 1 }}
             onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
             onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <Icon />
          <p style={{ margin: 0, color: '#e8edf5', fontSize: '16px', lineHeight: '1.7', fontWeight: '400' }}>{item}</p>
        </div>
      ))}
    </div>
  );
};

export default function FeedbackDisplay({ data, sessionId, videoUrl, isHistoryView = false, onExit, exitLabel }) {
  const [videoDuration, setVideoDuration] = useState(0);
  const scrollContainerRef = useRef(null);
  const hasSaved = useRef(false);
  const [hrSubmitStatus, setHrSubmitStatus] = useState('saving');
  const [hrSubmitError, setHrSubmitError] = useState('');
  
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const { overall_score, behavioral_report, technical_report, error } = data;

  useEffect(() => {
    if (!isHistoryView && data && sessionId && !hasSaved.current && !data.error) {
      hasSaved.current = true;

      const hrInvitationToken = sessionStorage.getItem('hr_invitation_token');

      const payload = {
        ai_session_id: sessionId,
        job_role: data.job_role || "Candidate",
        interview_mode: data.mode || "comprehensive",
        overall_score: data.overall_score || 0,
        video_object_key: `${sessionId}.webm`,
        feedback_data: data
      };

      if (hrInvitationToken) {
        setHrSubmitStatus('saving');
        setHrSubmitError('');

        saveHrInterviewResult(hrInvitationToken, payload)
          .then(() => setHrSubmitStatus('saved'))
          .catch(err => {
            console.error("Failed to automatically save HR interview result:", err);
            setHrSubmitStatus('error');
            setHrSubmitError(err.message || 'Could not submit the interview result.');
          });
      } else {
        saveInterviewResult(payload).catch(err => {
          console.error("Failed to automatically save interview result:", err);
        });
      }
    }
  }, [data, sessionId, isHistoryView]);

  const handleExitClick = () => {
    if (onExit) {
      onExit();
    } else if (isHistoryView) {
      window.location.href = '/history';
    } else if (sessionStorage.getItem('hr_invitation_token')) {
      sessionStorage.removeItem('hr_invitation_token');
      sessionStorage.removeItem('hr_invitation_candidate');
      sessionStorage.removeItem('hr_invitation_job');
      window.close();
    } else {
      window.location.href = '/';
    }
  };

  const handleRestartClick = async () => {
    if (sessionStorage.getItem('hr_invitation_token')) {
      alert("Restart is disabled for HR-assigned interviews. Please use the original invitation link again if needed.");
      return;
    }

    if (isHistoryView) {
      window.location.href = '/history';
      return;
    }

    try {
      const response = await fetch(`${AI_BASE_URL}/restart_session/${sessionId}`, { method: 'POST' });
      if (!response.ok) throw new Error("Failed to restart");
      const result = await response.json();
      window.location.href = `/interview/session?sessionId=${result.session_id}`;
    } catch (err) {
      alert("Could not restart the session. The server might have reset.");
    }
  };

  const handleStartCoaching = () => {
    window.location.href = `/interview/session?sessionId=${sessionId}&mode=coaching`;
  };

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };
  const onMouseLeave = () => setIsDragging(false);
  const onMouseUp = () => setIsDragging(false);
  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const isHrAssignedInterview = !isHistoryView && !!sessionStorage.getItem('hr_invitation_token');

  if (isHrAssignedInterview) {
    const candidateName = sessionStorage.getItem('hr_invitation_candidate') || 'Candidate';
    const jobTitle = sessionStorage.getItem('hr_invitation_job') || 'this role';
    const saved = hrSubmitStatus === 'saved';
    const failed = hrSubmitStatus === 'error' || error;

    return (
      <div className="ai-theme-wrapper" style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at top, rgba(0,242,254,0.12), #0b0e14 45%)',
        color: '#fff',
        padding: '24px',
        boxSizing: 'border-box'
      }}>
        <ParticleCanvas />
        <div style={{
          width: '100%',
          maxWidth: '720px',
          background: 'rgba(17, 20, 29, 0.92)',
          border: `1px solid ${failed ? 'rgba(255,8,68,0.35)' : 'rgba(0,242,254,0.28)'}`,
          boxShadow: failed ? '0 24px 80px rgba(255,8,68,0.12)' : '0 24px 80px rgba(0,242,254,0.12)',
          padding: '56px',
          borderRadius: '24px',
          textAlign: 'center',
          zIndex: 1
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            margin: '0 auto 28px',
            display: 'grid',
            placeItems: 'center',
            background: failed ? 'rgba(255,8,68,0.12)' : 'rgba(0,242,254,0.12)',
            border: failed ? '1px solid rgba(255,8,68,0.4)' : '1px solid rgba(0,242,254,0.4)',
            color: failed ? '#ff0844' : CYAN,
            fontSize: '34px',
            fontWeight: 900
          }}>
            {saved ? '✓' : failed ? '!' : '...'}
          </div>

          <p style={{ color: '#7586a1', fontSize: '13px', letterSpacing: '2px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '14px' }}>
            {saved ? 'Interview Submitted' : failed ? 'Submission Needs Review' : 'Submitting Interview'}
          </p>

          <h1 style={{ fontSize: '2.7rem', lineHeight: 1.1, margin: '0 0 18px', fontWeight: 900 }}>
            {saved ? 'Thank you for interviewing with us.' : failed ? 'Thank you. Your interview was completed.' : 'Please wait while we submit your interview.'}
          </h1>

          <p style={{ color: '#a0aab2', fontSize: '17px', lineHeight: 1.7, margin: '0 auto', maxWidth: '560px' }}>
            {saved
              ? `Your interview for ${jobTitle} has been securely submitted. The hiring team will review your interview and contact you about next steps.`
              : failed
                ? `Your interview for ${jobTitle} has ended. Please do not retake it unless the hiring team sends you a new invitation.`
                : `We are preparing your interview report for the hiring team. This page will update automatically.`}
          </p>

          {hrSubmitError && (
            <p style={{ marginTop: '22px', color: '#ff8a9b', fontSize: '14px' }}>
              {hrSubmitError}
            </p>
          )}

          <p style={{ marginTop: '34px', color: '#7586a1', fontSize: '14px' }}>
            {candidateName}, you may close this tab once submission is complete.
          </p>

          {(saved || failed) && (
            <button onClick={handleExitClick} className="btn-exit" style={{ marginTop: '24px', minWidth: '190px' }}>
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-theme-wrapper" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0b0e14', color: '#fff' }}>
        <div style={{ background: '#11141d', border: '1px solid #ff0844', padding: '50px', borderRadius: '16px', textAlign: 'center', zIndex: 1 }}>
          <IconWeakness />
          <h2 style={{ marginTop: '20px' }}>Pipeline Failure</h2>
          <p>{error}</p>
          <button onClick={handleExitClick} className="btn-exit" style={{ marginTop: '20px' }}>EXIT DASHBOARD</button>
        </div>
      </div>
    );
  }

  const bReport = behavioral_report || {};
  const tReport = technical_report || {};
  const header = bReport.header || tReport.header || {};
  
  const bTop = bReport.top_section || {};
  const tTop = tReport.top_section || {};
  const bMetrics = bReport.visual_metrics || {};
  const commMetrics = bMetrics.communication || {};
  const traitMetrics = bMetrics.personality_traits || {};
  const tMetrics = tReport.visual_metrics || {};
  const bDetails = bReport.detailed_analysis || {};
  const tDetails = tReport.detailed_analysis || {};

  const sphereSkills = [
    { name: 'Relevance', score: tMetrics.relevance_to_question || 0, x: 0.5, y: 0.8, z: 0.2 },
    { name: 'Job Fit', score: tMetrics.job_alignment || 0, x: -0.7, y: 0.4, z: 0.6 },
    { name: 'Structure', score: tMetrics.answer_structure || 0, x: 0.2, y: -0.6, z: 0.8 },
    { name: 'Jargon', score: tMetrics.technical_jargon_accuracy || 0, x: -0.5, y: -0.8, z: -0.3 },
    { name: 'Logic', score: tMetrics.problem_solving_logic || 0, x: 0.8, y: -0.3, z: -0.5 }
  ];

  return (
    <div 
      className={`horizontal-scroll-container ${isDragging ? 'dragging' : ''}`} 
      ref={scrollContainerRef}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      onWheel={handleWheel}
    >
      <ParticleCanvas />
      
      {/* Interview Overview Page*/}
      <section className="snap-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '50px', padding: '60px 80px', boxSizing: 'border-box' }}>
        
        <div style={{ flex: '0 0 500px', background: 'rgba(17, 20, 29, 0.85)', padding: '50px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '30px', zIndex: 1, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}>
          <div>
            <h1 style={{ fontSize: '3.6rem', whiteSpace: 'nowrap', fontWeight: '900', margin: '0 0 10px 0', background: 'linear-gradient(90deg, #fff, #a0aab2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Interview Report
            </h1>
            <p style={{ color: '#7586a1', fontSize: '14px', letterSpacing: '3px', fontWeight: '800' }}>
              {header.role || 'FULL STACK DEVELOPER'} • {new Date().toLocaleDateString()}
            </p>
          </div>

          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
            <video 
              src={videoUrl || data.video_url || `${AI_BASE_URL}/recordings/${sessionId}.webm`} 
              controls 
              style={{ width: '100%', display: 'block' }} 
              onLoadedMetadata={(e) => setVideoDuration(e.target.duration)}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            <button onClick={handleExitClick} className="btn-exit" style={{ flex: 1 }}>
              {exitLabel || (isHistoryView ? 'BACK TO DASHBOARD' : 'EXIT')}
            </button>
            {!isHistoryView && (
              <button onClick={handleRestartClick} className="btn-retry" style={{ flex: 1.5 }}>
                RETRY SESSION
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <ScoreOrb score={overall_score || 0} />
          
          {!isHistoryView && (
            <button 
              onClick={handleStartCoaching} 
              style={{
                marginTop: '40px',
                padding: '20px 50px',
                background: 'rgba(0,242,254,0.08)',
                border: `1px solid ${CYAN}`,
                color: CYAN,
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: '800',
                letterSpacing: '2px',
                cursor: 'pointer',
                boxShadow: `0 0 20px ${CYAN}20`,
                transition: 'all 0.3s'
              }}
            >
              START AI COACHING
            </button>
          )}
        </div>
        
        <div className="scroll-indicator" style={{ position: 'absolute', bottom: '40px', right: '60px', color: '#7586a1', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: '800', letterSpacing: '2px', zIndex: 2 }}>
          SCROLL HORIZONTALLY <span style={{ fontSize: '24px', color: CYAN, animation: 'bounceRight 1.5s infinite' }}>→</span>
        </div>
      </section>

      {/* Technical Analysis Page*/}
      {technical_report && (
        <section className="snap-screen screen-block">
          <div className="screen-header" style={{ zIndex: 1, position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, paddingRight: '60px' }}>
              <h1 className="screen-title">Technical Deep Dive</h1>
              <p className="screen-summary" style={{ maxWidth: '100%' }}>{tTop.overall_summary}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '20px' }}>
              <button onClick={handleExitClick} className="btn-exit-small">EXIT DASHBOARD</button>
              <MassiveDonut score={tTop.technical_score || 0} label="Tech Score" size={160} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', paddingBottom: '50px', zIndex: 1, position: 'relative' }}>
            <div style={{ background: '#11141d', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ color: '#a0aab2', letterSpacing: '3px', marginBottom: '20px', fontSize: '13px', fontWeight: '800' }}>SKILL CONSTELLATION</h3>
              <SkillsSphere skills={sphereSkills} />
            </div>

            <div style={{ background: '#11141d', padding: '50px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ color: '#a0aab2', letterSpacing: '3px', marginBottom: '40px', fontSize: '13px', fontWeight: '800', textAlign: 'center' }}>CORE COMPETENCIES</h3>
              <MetricBarAnimated label="Relevance to Question" score={tMetrics.relevance_to_question || 0} />
              <MetricBarAnimated label="Job Alignment" score={tMetrics.job_alignment || 0} />
              <MetricBarAnimated label="Answer Structure" score={tMetrics.answer_structure || 0} />
              <MetricBarAnimated label="Tech Jargon Accuracy" score={tMetrics.technical_jargon_accuracy || 0} />
              <MetricBarAnimated label="Problem Solving Logic" score={tMetrics.problem_solving_logic || 0} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '80px', zIndex: 1, position: 'relative' }}>
            <div>
              <h3 className="section-subtitle" style={{ color: CYAN }}>VERIFIED STRENGTHS</h3>
              <InsightList items={tDetails.strengths} type="strength" />
            </div>
            <div>
              <h3 className="section-subtitle" style={{ color: '#ff0844' }}>KNOWLEDGE GAPS</h3>
              <InsightList items={tDetails.weaknesses} type="weakness" />
            </div>
            <div>
              <h3 className="section-subtitle" style={{ color: MAGENTA }}>IMPROVEMENT TIPS</h3>
              <InsightList items={tDetails.improvement_tips} type="tip" />
            </div>

            {tDetails.code_review && tDetails.code_review !== "null" && (
              <div style={{ background: 'rgba(0,242,254,0.05)', borderLeft: `4px solid ${CYAN}`, padding: '40px', borderRadius: '0 20px 20px 0', marginTop: '20px' }}>
                <h3 className="section-subtitle" style={{ color: CYAN, marginBottom: '20px' }}>TERMINAL CODE REVIEW</h3>
                <p style={{ margin: 0, color: '#fff', fontSize: '16px', lineHeight: '1.8', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{tDetails.code_review}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Behavioral & Communication page */}
      {behavioral_report && (
        <section className="snap-screen screen-block">
          
          <div className="screen-header" style={{ zIndex: 1, position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, paddingRight: '60px' }}>
              <h1 className="screen-title">Behavioral & Communication</h1>
              <p className="screen-summary" style={{ maxWidth: '100%' }}>{bTop.overall_summary}</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '20px' }}>
              <button onClick={handleExitClick} className="btn-exit-small">EXIT DASHBOARD</button>
              <MassiveDonut score={bTop.behavioral_score || 0} label="Behavior Score" size={160} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', paddingBottom: '50px', zIndex: 1, position: 'relative' }}>
            
            <div style={{ background: '#11141d', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ color: '#a0aab2', letterSpacing: '3px', marginBottom: '30px', fontSize: '13px', fontWeight: '800' }}>PSYCHOMETRIC TRAITS</h3>
              {traitMetrics.openness && <GlowingRadarChart traits={traitMetrics} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', background: '#11141d', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <MiniDonut score={traitMetrics.confidence || 0} label="Confidence" size={120} />
                <MiniDonut score={traitMetrics.engagement || 0} label="Engagement" size={120} />
                <MiniDonut score={traitMetrics.nervousness || 0} label="Nervousness" size={120} />
              </div>
              
              <div style={{ background: '#11141d', padding: '50px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ color: '#a0aab2', letterSpacing: '3px', marginBottom: '30px', fontSize: '13px', fontWeight: '800', textAlign: 'center' }}>SPEECH DYNAMICS</h3>
                <MetricBarAnimated label="Fluency" score={commMetrics.fluency || 0} />
                <MetricBarAnimated label="Pacing" score={commMetrics.pacing || 0} />
                <MetricBarAnimated label="Tone Expressiveness" score={commMetrics.tone_expressiveness || 0} />
                <MetricBarAnimated label="Pause Control" score={commMetrics.pause_control || 0} />
                <MetricBarAnimated label="Filler Words" score={10 - commMetrics.filler_word_usage || 0} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '80px', zIndex: 1, position: 'relative' }}>
            <div>
              <h3 className="section-subtitle" style={{ color: CYAN }}>COMMUNICATION STRENGTHS</h3>
              <InsightList items={bDetails.strengths} type="strength" />
            </div>
            <div>
              <h3 className="section-subtitle" style={{ color: '#ff0844' }}>DELIVERY WEAKNESSES</h3>
              <InsightList items={bDetails.weaknesses} type="weakness" />
            </div>
            <div>
              <h3 className="section-subtitle" style={{ color: MAGENTA }}>IMPROVEMENT TIPS</h3>
              <InsightList items={bDetails.improvement_tips} type="tip" />
            </div>
          </div>
        </section>
      )}

      <style>{`
        .horizontal-scroll-container {
          display: flex; flex-direction: row; width: 100vw; height: 100vh;
          overflow-x: auto; overflow-y: hidden;
          scroll-snap-type: x mandatory;
          background: #080a0f; font-family: system-ui, -apple-system, sans-serif; color: #fff;
          cursor: grab;
        }
        .horizontal-scroll-container.dragging {
          scroll-snap-type: none; cursor: grabbing;
        }
        .horizontal-scroll-container.dragging * { user-select: none; }

        .snap-screen {
          flex: 0 0 100vw; width: 100vw; height: 100vh;
          scroll-snap-align: start; overflow-y: auto; overflow-x: hidden;
          box-sizing: border-box; position: relative;
        }

        .screen-block { padding: 60px 100px; }

        .screen-header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 30px; margin-bottom: 40px; }
        .screen-title { font-size: 3.5rem; font-weight: 900; margin: 0 0 16px 0; color: #fff; }
        .screen-summary { color: #a0aab2; font-size: 18px; line-height: 1.7; margin: 0; }
        .section-subtitle { font-size: 14px; letter-spacing: 2px; font-weight: 800; margin-bottom: 24px; text-transform: uppercase; }
        
        .btn-exit {
          padding: 16px; background: transparent; color: #a0aab2;
          border: 2px solid rgba(255,255,255,0.1); border-radius: 12px;
          font-size: 14px; font-weight: 800; letter-spacing: 2px; cursor: pointer; transition: all 0.3s;
          text-transform: uppercase;
        }
        .btn-exit:hover { border-color: #ff0844; color: #fff; }
        
        .btn-retry {
          padding: 16px; background: linear-gradient(90deg, ${CYAN} 0%, ${MAGENTA} 100%);
          color: #fff; border: none; border-radius: 12px;
          font-size: 14px; font-weight: 900; letter-spacing: 2px; cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,242,254,0.3); transition: all 0.3s;
          text-transform: uppercase;
        }
        .btn-retry:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,242,254,0.5); }
        
        .btn-exit-small {
          padding: 12px 30px; background: rgba(255,8,68,0.1); color: #ff0844;
          border: 1px solid rgba(255,8,68,0.3); border-radius: 8px;
          font-weight: 800; letter-spacing: 1.5px; cursor: pointer; transition: all 0.3s;
        }
        .btn-exit-small:hover { background: #ff0844; color: #fff; box-shadow: 0 0 15px rgba(255,8,68,0.4); }

        @keyframes orbSpin { to { transform: rotate(360deg); } }
        @keyframes bounceRight { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
        .scroll-indicator:hover span { animation-duration: 0.8s; }
        
        ::-webkit-scrollbar { height: 10px; width: 10px; }
        ::-webkit-scrollbar-track { background: #080a0f; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}