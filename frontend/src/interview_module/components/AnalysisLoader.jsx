import React, { useState, useEffect, useRef } from 'react';

// ─── CONSTANTS & COLORS ──────────────────────────────────────────────────────
const CYAN = '#00f2fe';
const MAGENTA = '#d422eb';
const BG_COLOR = '#080a0f';

const PHASES = [
  "Analyzing Facial Microexpressions...",
  "Extracting Speech Analytics...",
  "Understanding Semantic Structure...",
  "Evaluating Technical Level...",
  "Analyzing Psychometric Traits...",
  "Generating Comprehensive Insights..."
];

// Backgrouund particles
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
    
    // Create particles with alternating cyan/magenta colors
    const pts = Array.from({ length: 60 }, (_, i) => ({
      x: Math.random() * canvas.width, 
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.7, 
      vy: (Math.random() - 0.5) * 0.7,
      r: Math.random() * 2 + 0.5,
      color: i % 2 === 0 ? CYAN : MAGENTA
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '60'; // Add transparency
        ctx.fill();
      });

      // Draw constellation connections
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 160) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          const opacity = 0.08 * (1 - d / 160);
          ctx.strokeStyle = a.color === CYAN ? `rgba(0, 242, 254, ${opacity})` : `rgba(212, 34, 235, ${opacity})`; 
          ctx.lineWidth = 1; 
          ctx.stroke();
        }
      }));
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. THE VISUALIZERS (High-End SVG & 3D HUDs)
// ═══════════════════════════════════════════════════════════════════════════════

// VISUAL 1: THE BIOMETRIC WIREFRAME FACE
const VisualFace = () => (
  <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <svg viewBox="0 0 400 400" width="85%" height="85%" style={{ filter: `drop-shadow(0 0 15px ${CYAN}50)` }}>
      <defs>
        <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={CYAN} stopOpacity="0.8"/>
          <stop offset="100%" stopColor={MAGENTA} stopOpacity="0.2"/>
        </linearGradient>
        <clipPath id="scanClip">
          <rect x="0" y="0" width="400" height="400">
            <animate attributeName="y" values="-100;400;-100" dur="4s" repeatCount="indefinite" />
          </rect>
        </clipPath>
      </defs>

      {/* Intricate Cyber-Head Base Structure */}
      <g stroke="rgba(0, 242, 254, 0.3)" strokeWidth="1" fill="none">
        {/* Cranium and Jaw Outlines */}
        <path d="M 200 40 C 300 40, 320 160, 280 260 C 260 310, 230 350, 200 360 C 170 350, 140 310, 120 260 C 80 160, 100 40, 200 40 Z" />
        <path d="M 200 40 C 260 40, 280 140, 260 220 C 240 280, 220 330, 200 360 C 180 330, 160 280, 140 220 C 120 140, 140 40, 200 40 Z" opacity="0.5"/>
        <path d="M 200 40 C 230 40, 240 120, 230 200 C 220 260, 210 310, 200 360 C 190 310, 180 260, 170 200 C 160 120, 170 40, 200 40 Z" opacity="0.3"/>
        
        {/* Horizontal Topographic Contours */}
        <path d="M 115 120 Q 200 150 285 120" />
        <path d="M 100 160 Q 200 190 300 160" />
        <path d="M 105 200 Q 200 230 295 200" />
        <path d="M 120 250 Q 200 280 280 250" />
        <path d="M 145 300 Q 200 320 255 300" />

        {/* Geometric Eye/Nose/Mouth Nodes */}
        <polygon points="160,160 180,150 190,165 170,175" stroke={CYAN} strokeWidth="1.5" />
        <polygon points="240,160 220,150 210,165 230,175" stroke={CYAN} strokeWidth="1.5" />
        <path d="M 200 170 L 215 220 L 185 220 Z" stroke={MAGENTA} strokeWidth="1.5" />
        <path d="M 170 260 Q 200 270 230 260 Q 200 280 170 260 Z" stroke={CYAN} strokeWidth="1.5" />
      </g>

      {/* Sweeping Laser Scanner Overlay */}
      <g clipPath="url(#scanClip)">
        <path d="M 200 40 C 300 40, 320 160, 280 260 C 260 310, 230 350, 200 360 C 170 350, 140 310, 120 260 C 80 160, 100 40, 200 40 Z" 
              fill="url(#faceGrad)" stroke={CYAN} strokeWidth="3" filter="drop-shadow(0 0 10px #00f2fe)" />
        {/* Active Action Unit Blips */}
        <circle cx="175" cy="165" r="6" fill="#fff" filter="drop-shadow(0 0 8px #fff)"/>
        <circle cx="225" cy="165" r="6" fill="#fff" filter="drop-shadow(0 0 8px #fff)"/>
        <circle cx="200" cy="220" r="5" fill="#fff" filter="drop-shadow(0 0 8px #fff)"/>
        <circle cx="170" cy="260" r="4" fill="#fff" filter="drop-shadow(0 0 8px #fff)"/>
        <circle cx="230" cy="260" r="4" fill="#fff" filter="drop-shadow(0 0 8px #fff)"/>
      </g>
      
      {/* Scanning Line */}
      <line x1="50" y1="0" x2="350" y2="0" stroke={CYAN} strokeWidth="3" filter="drop-shadow(0 0 10px #00f2fe)">
        <animate attributeName="y1" values="20;380;20" dur="4s" repeatCount="indefinite" />
        <animate attributeName="y2" values="20;380;20" dur="4s" repeatCount="indefinite" />
      </line>
    </svg>
  </div>
);

// VISUAL 2: THE 3D SEMANTIC EMBEDDING CORE
const VisualSemantic = () => {
  // Creating an array of small floating "embedding" cubes
  const floatingNodes = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 200,
    y: (Math.random() - 0.5) * 200,
    z: (Math.random() - 0.5) * 200,
    delay: Math.random() * -5,
    speed: 3 + Math.random() * 4
  }));

  return (
    <div className="semantic-3d-container">
      {/* Outer Data Rings mapped in 3D */}
      <div className="data-ring ring-1"></div>
      <div className="data-ring ring-2"></div>
      
      {/* The Central Vector Engine Cube */}
      <div className="core-cube">
        <div className="cube-face front"></div><div className="cube-face back"></div>
        <div className="cube-face right"></div><div className="cube-face left"></div>
        <div className="cube-face top"></div><div className="cube-face bottom"></div>
      </div>

      {/* Orbiting Semantic Embeddings (Smaller Cubes) */}
      <div className="orbit-container">
        {floatingNodes.map(node => (
          <div key={node.id} className="floating-node" style={{
            transform: `translate3d(${node.x}px, ${node.y}px, ${node.z}px)`,
            animationDelay: `${node.delay}s`,
            animationDuration: `${node.speed}s`
          }}>
            <div className="small-cube">
              <div className="s-face s-front"></div><div className="s-face s-back"></div>
              <div className="s-face s-right"></div><div className="s-face s-left"></div>
              <div className="s-face s-top"></div><div className="s-face s-bottom"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// VISUAL 3: THE CIRCULAR AUDIO SPECTROGRAM
const VisualAudio = () => {
  const bars = 60;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 400 400" width="90%" height="90%" style={{ filter: `drop-shadow(0 0 15px ${CYAN}50)` }}>
        
        {/* Crisp Circular Spectrum Analyzer */}
        <g style={{ transformOrigin: 'center', animation: 'spinSlow 30s linear infinite' }}>
          {Array.from({ length: bars }).map((_, i) => {
            const angle = (i / bars) * Math.PI * 2;
            const x1 = 200 + 100 * Math.cos(angle);
            const y1 = 200 + 100 * Math.sin(angle);
            const x2 = 200 + 160 * Math.cos(angle);
            const y2 = 200 + 160 * Math.sin(angle);
            
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 2 === 0 ? CYAN : MAGENTA} strokeWidth="4" strokeLinecap="round"
                    style={{
                      transformOrigin: `${x1}px ${y1}px`,
                      animation: `audioBounce ${0.4 + Math.random() * 0.8}s infinite ease-in-out alternate ${Math.random()}s`
                    }} />
            );
          })}
        </g>

        {/* Dynamic Center Voiceprint Waveform */}
        <circle cx="200" cy="200" r="85" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        <g stroke={MAGENTA} strokeWidth="3" fill="none" filter={`drop-shadow(0 0 10px ${MAGENTA})`}>
          <path d="M 120 200 Q 140 120 160 200 T 200 200 T 240 200 T 280 200">
            <animate attributeName="d" values="
              M 120 200 Q 140 120 160 200 T 200 200 T 240 200 T 280 200;
              M 120 200 Q 140 280 160 200 T 200 200 T 240 200 T 280 200;
              M 120 200 Q 140 150 160 200 T 200 200 T 240 200 T 280 200" 
              dur="2s" repeatCount="indefinite" />
          </path>
        </g>
        <g stroke={CYAN} strokeWidth="2" fill="none" opacity="0.7">
          <path d="M 120 200 Q 140 250 160 200 T 200 200 T 240 200 T 280 200">
            <animate attributeName="d" values="
              M 120 200 Q 140 250 160 200 T 200 200 T 240 200 T 280 200;
              M 120 200 Q 140 150 160 200 T 200 200 T 240 200 T 280 200;
              M 120 200 Q 140 220 160 200 T 200 200 T 240 200 T 280 200" 
              dur="1.5s" repeatCount="indefinite" />
          </path>
        </g>
      </svg>
    </div>
  );
};



// 3. THE MAIN ANALYSIS LOADER COMPONENT
export default function AnalysisLoader() {
  const [progress, setProgress] = useState(0);
  const [visIndex, setVisIndex] = useState(0);
  const [loadingText, setLoadingText] = useState(PHASES[0]);

  useEffect(() => {
    // Asymptotic progress bar (creeps to 99%)
    const progressInterval = setInterval(() => {
      setProgress(prev => prev + (99 - prev) * 0.015);
    }, 1000);

    // Swap the central massive visual every 6 seconds
    const swapInterval = setInterval(() => {
      setVisIndex(prev => (prev + 1) % 3);
    }, 6000);

    // Rotate through the user-friendly loading text phrases
    const textInterval = setInterval(() => {
      setLoadingText(prev => {
        const currentIndex = PHASES.indexOf(prev);
        return PHASES[(currentIndex + 1) % PHASES.length];
      });
    }, 4000);

    return () => { clearInterval(progressInterval); clearInterval(swapInterval); clearInterval(textInterval); };
  }, []);

  const visualComponents = [
    <VisualFace key="face" />,
    <VisualSemantic key="semantic" />,
    <VisualAudio key="audio" />
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: BG_COLOR,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden'
    }}>
      
      {/*  GLOBAL CSS ANIMATIONS & 3D ENGINE  */}
      <style>
        {`
          @keyframes spinSlow { 100% { transform: rotate(360deg); } }
          @keyframes spinReverse { 100% { transform: rotate(-360deg); } }
          @keyframes audioBounce { 0% { transform: scale(1); } 100% { transform: scale(0.3); } }
          
          /* Visual Crossfade Transition */
          .fade-transition {
            position: absolute; inset: 0;
            transition: opacity 1s ease-in-out, transform 1s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .massive-astrolabe {
            position: relative;
            width: 500px; height: 500px;
            background: rgba(17, 20, 29, 0.4);
            backdrop-filter: blur(25px);
            border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            box-shadow: inset 0 0 120px rgba(0, 242, 254, 0.1), 0 30px 100px rgba(0,0,0,0.8);
            border: 1px solid rgba(0, 242, 254, 0.2);
            margin-bottom: 50px;
          }

          /* --- 3D SEMANTIC CSS ENGINE --- */
          .semantic-3d-container {
            width: 100%; height: 100%;
            perspective: 1000px;
            display: flex; justify-content: center; align-items: center;
            transform-style: preserve-3d;
          }

          @keyframes rotateCore {
            0% { transform: rotateX(0deg) rotateY(0deg); }
            100% { transform: rotateX(360deg) rotateY(720deg); }
          }

          @keyframes orbitNodes {
            0% { transform: rotateY(0deg) rotateX(45deg); }
            100% { transform: rotateY(360deg) rotateX(45deg); }
          }

          @keyframes pulseFace {
            0%, 100% { box-shadow: inset 0 0 20px ${CYAN}, 0 0 10px ${CYAN}; }
            50% { box-shadow: inset 0 0 50px ${MAGENTA}, 0 0 30px ${MAGENTA}; }
          }

          /* The Main Central Cube */
          .core-cube {
            position: absolute;
            width: 100px; height: 100px;
            transform-style: preserve-3d;
            animation: rotateCore 15s infinite linear;
          }
          
          .cube-face {
            position: absolute; width: 100px; height: 100px;
            background: rgba(8, 10, 15, 0.8);
            border: 2px solid ${CYAN};
            animation: pulseFace 4s infinite alternate;
            backface-visibility: visible;
          }

          .cube-face.front  { transform: translateZ(50px); }
          .cube-face.back   { transform: rotateY(180deg) translateZ(50px); }
          .cube-face.right  { transform: rotateY(90deg) translateZ(50px); }
          .cube-face.left   { transform: rotateY(-90deg) translateZ(50px); }
          .cube-face.top    { transform: rotateX(90deg) translateZ(50px); }
          .cube-face.bottom { transform: rotateX(-90deg) translateZ(50px); }

          /* Orbiting System */
          .orbit-container {
            position: absolute;
            width: 100%; height: 100%;
            transform-style: preserve-3d;
            animation: orbitNodes 20s infinite linear;
          }

          .floating-node {
            position: absolute;
            top: 50%; left: 50%;
            transform-style: preserve-3d;
          }

          /* Small Embedding Cubes */
          .small-cube {
            position: relative; width: 20px; height: 20px;
            transform-style: preserve-3d;
            animation: rotateCore 5s infinite linear;
            margin-left: -10px; margin-top: -10px;
          }

          .s-face {
            position: absolute; width: 20px; height: 20px;
            background: rgba(212, 34, 235, 0.2);
            border: 1px solid ${MAGENTA};
            box-shadow: 0 0 8px ${MAGENTA};
          }

          .s-front  { transform: translateZ(10px); }
          .s-back   { transform: rotateY(180deg) translateZ(10px); }
          .s-right  { transform: rotateY(90deg) translateZ(10px); }
          .s-left   { transform: rotateY(-90deg) translateZ(10px); }
          .s-top    { transform: rotateX(90deg) translateZ(10px); }
          .s-bottom { transform: rotateX(-90deg) translateZ(10px); }

          /* Holographic Data Rings */
          .data-ring {
            position: absolute; border-radius: 50%;
            transform-style: preserve-3d;
          }
          .ring-1 {
            width: 280px; height: 280px;
            border: 1px dashed ${CYAN};
            transform: rotateX(70deg);
            animation: spinSlow 10s infinite linear;
          }
          .ring-2 {
            width: 340px; height: 340px;
            border: 2px dotted ${MAGENTA}; opacity: 0.5;
            transform: rotateX(70deg) rotateY(20deg);
            animation: spinReverse 15s infinite linear;
          }
        `}
      </style>

      {/* BACKGROUND (Particles + Vignette) */}
      <ParticleCanvas />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 10%, #05070f 85%)', zIndex: 1, pointerEvents: 'none' }} />

      {/*  TOP HEADER (Glowing Gradient Title)  */}
      <div style={{ position: 'absolute', top: '60px', textAlign: 'center', zIndex: 10, width: '100%' }}>
        <h1 style={{ 
          fontSize: '2.8rem', fontWeight: '900', letterSpacing: '12px', margin: '0 0 10px 0', 
          background: `linear-gradient(180deg, #d422eb 0%, #00f2fe 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 0 20px rgba(0,242,254,0.4))`,
          textTransform: 'uppercase'
        }}>
          INTERVIEW ANALYSIS
        </h1>
      </div>

      {/*  THE MASSIVE CENTRAL ASTROLABE  */}
      <div className="massive-astrolabe" style={{ zIndex: 10 }}>
        
        {/* Outer Rotating UI Rings */}
        <div style={{ position: 'absolute', inset: '-30px', borderRadius: '50%', border: `1px dashed ${CYAN}40`, borderTop: `4px solid ${CYAN}`, animation: 'spinSlow 25s linear infinite' }} />
        <div style={{ position: 'absolute', inset: '-55px', borderRadius: '50%', border: `1px solid ${MAGENTA}20`, borderBottom: `4px solid ${MAGENTA}`, animation: 'spinReverse 20s linear infinite' }} />

        {/* Dynamic Visual Swapper */}
        <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          {visualComponents.map((component, index) => {
            const isActive = index === visIndex;
            return (
              <div key={index} className="fade-transition" style={{ 
                opacity: isActive ? 1 : 0, 
                transform: isActive ? 'scale(1)' : 'scale(0.85)',
                pointerEvents: isActive ? 'auto' : 'none'
              }}>
                {component}
              </div>
            );
          })}
        </div>
      </div>

      {/*  SLEEK BOTTOM PROGRESS BAR  */}
      <div style={{ position: 'absolute', bottom: '80px', width: '100%', maxWidth: '650px', zIndex: 10, textAlign: 'center' }}>
        
        <p style={{ color: '#e8edf5', fontSize: '1.2rem', margin: '0 0 20px 0', fontWeight: '500', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {loadingText}
        </p>

        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative' }}>
          {/* Glowing Track */}
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: '3px',
            width: `${progress}%`, background: `linear-gradient(90deg, ${CYAN}, ${MAGENTA})`,
            transition: 'width 1s linear', boxShadow: `0 0 15px ${MAGENTA}`
          }} />
          {/* Glowing Scanner Tip */}
          <div style={{
            position: 'absolute', top: '50%', left: `${progress}%`, transform: 'translate(-50%, -50%)',
            width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
            boxShadow: `0 0 15px #fff, 0 0 30px ${MAGENTA}`, transition: 'left 1s linear'
          }} />
        </div>
      </div>

    </div>
  );
}