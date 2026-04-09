import React from 'react';
import '../interview-styles.css';

const IconStrength = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px', filter: 'drop-shadow(0 0 4px rgba(0,242,254,0.4))' }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const IconWeakness = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d422eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px', filter: 'drop-shadow(0 0 4px rgba(212,34,235,0.4))' }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const IconTip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0aab2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const ScoreDonut = ({ score, label, size = 130 }) => {
  const radius = size * 0.38;
  const circumference = 2 * Math.PI * radius;
  const pct = (score / 10) * 100;
  const offset = circumference - (pct / 100) * circumference;
  
  const gradId = `grad-${label.replace(/\s+/g, '-')}`;

  return (
    <div style={{ textAlign: 'center', width: `${size}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#d422eb" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={`url(#${gradId})`} strokeWidth="8" fill="none" 
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.25, 0.8, 0.25, 1)', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', filter: 'drop-shadow(0 0 6px rgba(212,34,235,0.3))' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize={size * 0.22} fontWeight="800" fill="#ffffff">
          {score.toFixed(1)}
        </text>
      </svg>
      {label && <div style={{ fontSize: '11px', color: '#a0aab2', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700' }}>{label}</div>}
    </div>
  );
};

// Psychometric Big 5 Radar Chart
const Big5RadarChart = ({ traits }) => {
  const size = 240;
  const center = size / 2;
  const radius = 80;
  
  const labels = ['OPENNESS', 'CONSCIENTIOUS', 'EXTRAVERSION', 'AGREEABLE', 'NEUROTICISM'];
  const values = [traits.openness, traits.conscientiousness, traits.extraversion, traits.agreeableness, traits.neuroticism];
  
  const points = values.map((val, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const distance = (val / 10) * radius; 
    return `${center + distance * Math.cos(angle)},${center + distance * Math.sin(angle)}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1e2235', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.03)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
      <h4 style={{ color: '#7586a1', margin: '0 0 15px 0', letterSpacing: '2px', fontSize: '11px', fontWeight: '800' }}>PSYCHOMETRIC FOOTPRINT</h4>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
          <polygon key={scale} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            points={labels.map((_, i) => {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              return `${center + scale * radius * Math.cos(angle)},${center + scale * radius * Math.sin(angle)}`;
            }).join(' ')}
          />
        ))}
        {labels.map((_, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
        })}
        <polygon points={points} fill="rgba(0, 242, 254, 0.15)" stroke="#00f2fe" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 8px rgba(0,242,254,0.4))' }} />
        {labels.map((label, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = center + (radius + 22) * Math.cos(angle);
          const y = center + (radius + 22) * Math.sin(angle);
          return <text key={i} x={x} y={y} fill="#a0aab2" fontSize="9px" fontWeight="800" letterSpacing="1px" textAnchor="middle" dominantBaseline="middle">{label}</text>;
        })}
      </svg>
    </div>
  );
};

// Insight list
const InsightList = ({ items, type }) => {
  if (!items || items.length === 0) return <p style={{color: '#4a536b', fontStyle: 'italic', fontSize: '14px'}}>Awaiting data stream...</p>;
  
  const getIcon = () => {
    if (type === 'strength') return <IconStrength />;
    if (type === 'weakness') return <IconWeakness />;
    return <IconTip />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: '16px', background: '#1e2235', padding: '16px 20px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.03)', transition: 'transform 0.2s', cursor: 'default' }}
             onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
             onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          {getIcon()}
          <p style={{ margin: 0, color: '#ffffff', fontSize: '14.5px', lineHeight: '1.6', fontWeight: '400' }}>{item}</p>
        </div>
      ))}
    </div>
  );
};

// Main dashboard component
export default function FeedbackDisplay({ data, sessionId }) {
  const { overall_score, behavioral_report, technical_report, error } = data;

  const handleDoneClick = () => { window.location.href = '/'; };

  if (error) {
    return (
      <div className="ai-theme-wrapper">
        <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f121b', color: '#fff' }}>
          <div style={{ background: '#1e2235', border: '1px solid #d422eb', padding: '40px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 0 30px rgba(212,34,235,0.2)' }}>
            <IconWeakness />
            <h2 style={{ marginTop: '20px', color: '#fff' }}>Pipeline Failure</h2>
            <p style={{ color: '#a0aab2' }}>{error}</p>
            <button onClick={handleDoneClick} style={{ marginTop: '20px', padding: '12px 24px', background: 'linear-gradient(90deg, #00f2fe 0%, #d422eb 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Reboot Interface</button>
          </div>
        </div>
      </div>
    );
  }

  const bReport = behavioral_report || {};
  const tReport = technical_report || {};
  const metrics = bReport.display_metrics || {};

  // ── WRAPPED WITH ai-theme-wrapper ──
  return (
    <div className="ai-theme-wrapper">
      <div style={{ 
        width: '100vw', height: '100vh', background: '#0f121b', 
        color: '#ffffff', overflowX: 'auto', overflowY: 'hidden', display: 'flex', scrollSnapType: 'x mandatory',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        
        {/* ── PANEL 1: HERO OVERVIEW ── */}
        <section style={{ minWidth: '100vw', height: '100vh', padding: '60px 80px', boxSizing: 'border-box', scrollSnapAlign: 'start', display: 'flex', gap: '50px' }}>
          
          {/* Left: Meta & Video */}
          <div style={{ flex: '0 0 450px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 8px 0', background: 'linear-gradient(90deg, #00f2fe 0%, #d422eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                System Report
              </h1>
              <div style={{ color: '#7586a1', fontSize: '13px', letterSpacing: '2px', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                ID: {sessionId}
              </div>
            </div>

            <div style={{ background: '#1e2235', padding: '20px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7586a1', fontSize: '12px', fontWeight: '800', letterSpacing: '1px' }}>TIMESTAMP</span>
                <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600' }}>{new Date().toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7586a1', fontSize: '12px', fontWeight: '800', letterSpacing: '1px' }}>INTERVIEWER</span>
                <span style={{ color: '#00f2fe', fontSize: '13px', fontWeight: '600' }}>David (AI Lead)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7586a1', fontSize: '12px', fontWeight: '800', letterSpacing: '1px' }}>DURATION</span>
                <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600' }}>15m 00s</span>
              </div>
            </div>

            <div style={{ background: '#1e2235', borderRadius: '16px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', color: '#7586a1', fontWeight: '800', letterSpacing: '1.5px' }}>SESSION ARCHIVE</div>
              <video src={`http://127.0.0.1:8000/recordings/${sessionId}.webm`} controls style={{ width: '100%', display: 'block', background: '#000' }} />
            </div>

            <button onClick={handleDoneClick} style={{ 
              marginTop: 'auto', padding: '16px', background: 'transparent', color: '#a0aab2', 
              border: '2px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px', fontWeight: '800', 
              letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.3s'
            }} onMouseOver={e => { e.target.style.borderColor = '#d422eb'; e.target.style.color = '#fff'; }} onMouseOut={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.color = '#a0aab2'; }}>
              EXIT DASHBOARD
            </button>
          </div>

          {/* Right: Master Score & Scroll Prompt */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#1e2235', borderRadius: '24px', border: '2px solid rgba(255,255,255,0.03)', position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(0,242,254,0.1) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
             
             <ScoreDonut score={overall_score || 0} label="Overall Match Score" size={260} />
             
             <div style={{ marginTop: '50px', display: 'flex', alignItems: 'center', gap: '15px', color: '#00f2fe', background: 'rgba(0,242,254,0.05)', padding: '10px 24px', borderRadius: '30px', border: '1px solid rgba(0,242,254,0.1)' }}>
               <span style={{ fontSize: '12px', letterSpacing: '2px', fontWeight: '800' }}>SCROLL RIGHT TO INITIALIZE DATA</span>
               <span style={{ animation: 'bounceRight 2s infinite', fontWeight: 'bold' }}>→</span>
             </div>
          </div>
        </section>

        {/* ── PANEL 2: TECHNICAL ASSESSMENT ── */}
        <section style={{ minWidth: '100vw', height: '100vh', padding: '60px 80px', boxSizing: 'border-box', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '2rem', color: '#ffffff', margin: '0 0 12px 0', fontWeight: '800' }}>Technical Architecture</h2>
              <p style={{ color: '#a0aab2', fontSize: '16px', maxWidth: '800px', lineHeight: '1.7', margin: 0, fontWeight: '400' }}>{tReport.overall_summary}</p>
            </div>
            <ScoreDonut score={tReport.technical_score || 0} label="Tech Score" size={110} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', overflowY: 'auto', paddingRight: '10px', height: 'calc(100% - 150px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
               <div>
                 <h3 style={{ fontSize: '11px', color: '#00f2fe', letterSpacing: '2px', fontWeight: '800', marginBottom: '16px' }}>VERIFIED STRENGTHS</h3>
                 <InsightList items={tReport.strengths} type="strength" />
               </div>
               <div>
                 <h3 style={{ fontSize: '11px', color: '#d422eb', letterSpacing: '2px', fontWeight: '800', marginBottom: '16px' }}>KNOWLEDGE GAPS</h3>
                 <InsightList items={tReport.weaknesses} type="weakness" />
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
               {tReport.code_review && tReport.code_review !== "null" && (
                  <div style={{ background: '#1e2235', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.03)', borderLeft: '4px solid #00f2fe', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    <h3 style={{ fontSize: '11px', color: '#00f2fe', letterSpacing: '2px', fontWeight: '800', marginBottom: '12px', marginTop: 0 }}>TERMINAL CODE REVIEW</h3>
                    <p style={{ color: '#ffffff', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>{tReport.code_review}</p>
                  </div>
               )}
               <div>
                 <h3 style={{ fontSize: '11px', color: '#a0aab2', letterSpacing: '2px', fontWeight: '800', marginBottom: '16px' }}>RECOMMENDED UPGRADES</h3>
                 <InsightList items={tReport.improvement_tips} type="tip" />
               </div>
            </div>
          </div>
        </section>

        {/* ── PANEL 3: BEHAVIORAL FOOTPRINT ── */}
        <section style={{ minWidth: '100vw', height: '100vh', padding: '60px 80px', boxSizing: 'border-box', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '2rem', color: '#ffffff', margin: '0 0 12px 0', fontWeight: '800' }}>Behavioral Footprint</h2>
              <p style={{ color: '#a0aab2', fontSize: '16px', maxWidth: '800px', lineHeight: '1.7', margin: 0, fontWeight: '400' }}>{bReport.overall_summary}</p>
            </div>
            <ScoreDonut score={bReport.behavioral_score || 0} label="Behavior Score" size={110} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '50px', overflowY: 'auto', paddingRight: '10px', height: 'calc(100% - 150px)' }}>
            
            {/* Left: Metrics & Gauges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1e2235', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.03)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                  <ScoreDonut score={metrics.confidence || 0} label="Confidence" size={85} />
                  <ScoreDonut score={metrics.engagement || 0} label="Engagement" size={85} />
                  <ScoreDonut score={metrics.nervousness || 0} label="Nervousness" size={85} />
               </div>
               {metrics.big_5_traits && <Big5RadarChart traits={metrics.big_5_traits} />}
            </div>

            {/* Right: Text Analysis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
               <div>
                 <h3 style={{ fontSize: '11px', color: '#00f2fe', letterSpacing: '2px', fontWeight: '800', marginBottom: '16px' }}>COMMUNICATION STRENGTHS</h3>
                 <InsightList items={bReport.strengths} type="strength" />
               </div>
               <div>
                 <h3 style={{ fontSize: '11px', color: '#d422eb', letterSpacing: '2px', fontWeight: '800', marginBottom: '16px' }}>DELIVERY FRICTION</h3>
                 <InsightList items={bReport.weaknesses} type="weakness" />
               </div>
               <div>
                 <h3 style={{ fontSize: '11px', color: '#a0aab2', letterSpacing: '2px', fontWeight: '800', marginBottom: '16px' }}>EXECUTIVE PRESENCE TIPS</h3>
                 <InsightList items={bReport.improvement_tips} type="tip" />
               </div>
            </div>
          </div>
        </section>

        {/* CSS Overrides for Scrollbar and Animations */}
        <style>{`
          ::-webkit-scrollbar { height: 6px; width: 6px; }
          ::-webkit-scrollbar-track { background: #0f121b; }
          ::-webkit-scrollbar-thumb { background: #4a536b; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: #7586a1; }
          @keyframes bounceRight {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(8px); }
          }
        `}</style>
      </div>
    </div>
  );
}