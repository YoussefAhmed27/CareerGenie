import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { startSession, uploadCvPdf } from '../api/interviewService';
import { AVATAR_PROFILES } from './Avatar';
import Navbar from '../../components/Navbar/Navbar'; 
import '../interview-styles.css'; 

export const AVATAR_ROSTER = [
  {
    id: 'sarah',
    name: 'Sarah',
    role: 'Engineering Manager',
    modelUrl: '/model-f2.glb', 
    voiceId: 'aura-asteria-en', 
    profile: AVATAR_PROFILES.female_standard,
    previewImg: '/previews/Sarah.png' 
  },
  {
    id: 'david',
    name: 'David',
    role: 'Senior Tech Lead',
    modelUrl: '/model.glb', 
    voiceId: 'aura-orpheus-en', 
    profile: AVATAR_PROFILES.male_standard,
    previewImg: '/previews/David.png'
  },
  {
    id: 'Caitlin',
    name: 'Caitlin',
    role: 'Product Manager',
    modelUrl: '/model-female.glb', 
    voiceId: 'aura-hera-en', 
    profile: AVATAR_PROFILES.female_standard, 
    previewImg: '/previews/Caitlin.png'
  },
  {
    id: 'kenji',
    name: 'Kenji',
    role: 'HR Director',
    modelUrl: '/model3.glb', 
    voiceId: 'aura-helios-en', 
    profile: AVATAR_PROFILES.male_standard,
    previewImg: '/previews/kenji.png'
  }
];

export default function Setup() {
  const navigate = useNavigate(); 
  const [step, setStep] = useState(1); 
  const [selectedAvatarId, setSelectedAvatarId] = useState('david'); 
  const [isRandomizing, setIsRandomizing] = useState(false);

  const [uploadedCvText, setUploadedCvText] = useState(''); 
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [jdText, setJdText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      setUploadedFileName('');
      setUploadedCvText('');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const result = await uploadCvPdf(file);
      setUploadedCvText(result.cv_text);
      setUploadedFileName(result.filename);
      setError(''); 
    } catch (err) {
      setError(err.message);
      setUploadedFileName('');
      setUploadedCvText('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!uploadedCvText || !jdText || !jobRole) {
      setError('Please upload a CV, fill out the Job Role, and paste the Job Description.');
      return;
    }
    setError('');
    setStep(2); 
  };

  const proceedToDeviceCheck = (idToUse) => {
    setSelectedAvatarId(idToUse);
    setError('');
    setStep(3);
  };

  const handleRandomizeAvatar = () => {
    if (isRandomizing) return; 
    setIsRandomizing(true);

    let rollCount = 0;
    const maxRolls = 50; 
    const speed = 120; 
    
    let currentIndex = AVATAR_ROSTER.findIndex(a => a.id === selectedAvatarId);

    const rollInterval = setInterval(() => {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * AVATAR_ROSTER.length);
      } while (nextIndex === currentIndex); 

      currentIndex = nextIndex;
      setSelectedAvatarId(AVATAR_ROSTER[currentIndex].id);
      rollCount++;

      if (rollCount >= maxRolls) {
        clearInterval(rollInterval);
        setIsRandomizing(false);
        proceedToDeviceCheck(AVATAR_ROSTER[currentIndex].id);
      }
    }, speed);
  };

  const startDeviceCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermissions(true);
      setError('');

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        
        let maxVal = 0;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > maxVal) maxVal = dataArray[i];
        }
        
        let targetPercentage = Math.min(100, (maxVal / 150) * 100);

        setAudioLevel(prev => {
          if (targetPercentage > prev) {
            return prev + (targetPercentage - prev) * 0.4; 
          } else {
            return prev + (targetPercentage - prev) * 0.1; 
          }
        }); 
        
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

    } catch (err) {
      setHasPermissions(false);
      setError("Camera and Microphone access denied. Please allow permissions in your browser.");
      console.error("CAMERA FAIL REASON:", err.name, err.message);
    }
  };

  const stopDeviceCheck = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.warn("Audio Context already handled:", e));
    }
  };

  useEffect(() => {
    if (step === 3) {
      startDeviceCheck();
    }
    return () => stopDeviceCheck();
  }, [step]);

  const handleFinalStart = async () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
    } catch (e) {
      console.warn("Could not resume AudioContext:", e);
    }
    
    setIsLoading(true);
    setError('');
    
    stopDeviceCheck();

    try {
      const selectedAvatar = AVATAR_ROSTER.find(a => a.id === selectedAvatarId);
      const sessionId = await startSession(uploadedCvText, jdText, selectedAvatar.voiceId);
      
      sessionStorage.setItem('current_session_id', sessionId);
      sessionStorage.setItem('current_avatar', JSON.stringify(selectedAvatar));
      navigate('/interview/session');

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      startDeviceCheck(); 
    } 
  };

  return (
    <div className="ai-theme-wrapper min-h-screen pt-28 pb-12 relative">
      <Navbar />

      <div className="setup-page-content max-w-5xl mx-auto flex flex-col w-full">
        
        <div className="stepper-container" style={{ marginBottom: '2rem' }}>
          <span className={`stepper-item ${step === 1 ? 'active' : ''}`}>1. CV & Role</span>
          <span className="stepper-separator">›</span>
          <span className={`stepper-item ${step === 2 ? 'active' : ''}`}>2. Choose Avatar</span>
          <span className="stepper-separator">›</span>
          <span className={`stepper-item ${step === 3 ? 'active' : ''}`}>3. Device Check & Start</span>
        </div>

        <div className="setup-card">
          
          {step === 1 && (
            <div className="step-1-container">
              <img src="/genie-character.png" alt="Genie" className="setup-genie-image" />
              <h2 className="gradient-text-header">Setup Your Interview</h2>
              <p className="subtitle-divider">Provide context so Genie can tailor your experience</p>

              <form onSubmit={handleNextStep} className="modern-setup-form">
                <div className="form-top-row">
                  <div className="input-group resume-group">
                    <div className="cv-pods-container">
                      <div 
                        className={`cv-pod ${uploadedFileName ? 'success' : ''} ${isUploading ? 'loading' : ''}`}
                        onClick={() => !isUploading && fileInputRef.current.click()}
                      >
                        <span className="cv-pod-label">UPLOAD CV</span>
                        <div className="cv-pod-circle">
                          {isUploading ? (
                            <div className="spinner-minimal"></div>
                          ) : uploadedFileName ? (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                          ) : (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          )}
                        </div>
                        {uploadedFileName && (
                          <span className="file-name-success" title={uploadedFileName}>{uploadedFileName}</span>
                        )}
                      </div>
                      <div className="cv-pod disabled">
                        <span className="cv-pod-label">USE EXISTING CV</span>
                        <div className="cv-pod-circle">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        </div>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf" />
                    </div>
                  </div>

                  <div className="input-group role-group">
                    <label htmlFor="job-role-input" className="modern-label">Job Role</label>
                    <div className="input-wrapper">
                      <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                      <input id="job-role-input" type="text" className="modern-input with-icon" placeholder="Ex. Senior AI Engineer" value={jobRole} onChange={(e) => setJobRole(e.target.value)} disabled={isLoading || isUploading} />
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="jd-input" className="modern-label">Job Description</label>
                  <textarea id="jd-input" className="modern-textarea" placeholder="Paste the full job requirements here..." value={jdText} onChange={(e) => setJdText(e.target.value)} disabled={isLoading || isUploading} />
                </div>

                <button type="submit" className="btn-primary-wide" disabled={isLoading || isUploading || !uploadedCvText || !jobRole || !jdText}>
                  Continue to Avatars
                </button>
                {error && <p className="error-message">{error}</p>}
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="avatar-selection-step">
              <h2 className="gradient-text-header">Setup Your Interview</h2>
              <p className="subtitle-divider">Select avatar choice to proceed with</p>

              <div className="avatar-row-container">
                {AVATAR_ROSTER.map((avatar) => (
                  <div key={avatar.id} className="avatar-card-wrapper" onClick={() => setSelectedAvatarId(avatar.id)}>
                    <div className={`avatar-card ${selectedAvatarId === avatar.id ? 'active' : ''}`}>
                      <div className="avatar-image-container">
                        <img src={avatar.previewImg} alt={avatar.name} className="avatar-image" />
                      </div>
                      <div className="avatar-text-container">
                        <span className="avatar-name">{avatar.name}</span>
                      </div>
                    </div>
                    <div className={`radio-indicator ${selectedAvatarId === avatar.id ? 'active' : ''}`}></div>
                  </div>
                ))}
              </div>

              <div className="genie-pick-container">
                <div className="genie-pick-header" onClick={handleRandomizeAvatar}>
                  <span className="genie-text">Let Genie Pick</span>
                  <img src="/genie-character.png" alt="Genie" className="genie-tiny-icon" />
                </div>
              </div>

              <div className="bottom-nav-grid">
                <div className="btn-back-wrapper">
                  <button type="button" className="btn-back" onClick={() => setStep(1)} disabled={isLoading || isRandomizing}>Back</button>
                </div>
                
                <div className="center-dice-wrapper">
                  <button type="button" className="dice-button" onClick={handleRandomizeAvatar} disabled={isRandomizing}>
                    <div className="dice-scene">
                      <div className={`dice-cube ${isRandomizing ? 'rolling-true-3d' : ''}`}>
                        <div className="dice-face front"><span className="dot center"></span></div>
                        <div className="dice-face back"><span className="dot top-left"></span><span className="dot bottom-right"></span></div>
                        <div className="dice-face right"><span className="dot top-left"></span><span className="dot center"></span><span className="dot bottom-right"></span></div>
                        <div className="dice-face left"><span className="dot top-left"></span><span className="dot top-right"></span><span className="dot bottom-left"></span><span className="dot bottom-right"></span></div>
                        <div className="dice-face top"><span className="dot top-left"></span><span className="dot center"></span><span className="dot bottom-right"></span><span className="dot top-right"></span><span className="dot bottom-left"></span></div>
                        <div className="dice-face bottom"><span className="dot top-left"></span><span className="dot top-right"></span><span className="dot middle-left"></span><span className="dot middle-right"></span><span className="dot bottom-left"></span><span className="dot bottom-right"></span></div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="btn-next-wrapper">
                  <button type="button" className="btn-next" onClick={() => proceedToDeviceCheck(selectedAvatarId)} disabled={isLoading || isRandomizing}>
                    Next Step
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="device-check-step">
              <h2 className="gradient-text-header">Hardware Check</h2>
              <p className="subtitle-divider">Verify camera/mic before interview starts</p>

              <div className="studio-dashboard-container">
                
                <div className="video-hero-card">
                  <div className="video-wrapper">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="studio-video" 
                      style={{ opacity: hasPermissions ? 1 : 0 }}
                    />
                    {!hasPermissions && (
                      <div className="studio-placeholder">
                        <div className="spinner-minimal"></div>
                        <span>Awaiting Camera Access...</span>
                      </div>
                    )}
                    {hasPermissions && (
                      <div className="live-badge">
                        <span className="live-dot"></span> FEED ACTIVE
                      </div>
                    )}
                  </div>
                </div>

                <div className="hardware-status-panel">
                  
                  <div className="status-list">
                    <div className={`status-item ${hasPermissions ? 'ready' : 'pending'}`}>
                      <div className="status-icon-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      </div>
                      <div className="status-text">
                        <span className="status-title">Camera</span>
                        <span className="status-sub">{hasPermissions ? 'Connected' : 'Waiting for browser...'}</span>
                      </div>
                    </div>

                    <div className={`status-item ${hasPermissions ? 'ready' : 'pending'}`}>
                      <div className="status-icon-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                      </div>
                      <div className="status-text">
                        <span className="status-title">Microphone</span>
                        <span className="status-sub">{hasPermissions ? 'Input Detected' : 'Waiting for browser...'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="audio-monitor-card">
                    <div className="monitor-label">INPUT LEVEL</div>
                    <div className="sleek-bars-container">
                      {[...Array(25)].map((_, i) => {
                        const centerDist = Math.abs(i - 12);
                        const heightMultiplier = Math.max(0.15, 1 - (centerDist * 0.08));
                        const barHeight = Math.max(4, audioLevel * heightMultiplier);
                        const isLoud = barHeight > 60;
                        return (
                          <div 
                            key={i} 
                            className={`sleek-bar ${isLoud ? 'loud' : ''}`} 
                            style={{ height: `${barHeight}%` }}
                          ></div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              <div className="bottom-nav-grid" style={{ marginTop: '2rem' }}>
                <div className="btn-back-wrapper">
                  <button type="button" className="btn-back" onClick={() => setStep(2)} disabled={isLoading}>Back</button>
                </div>
                
                <div className="center-dice-wrapper"></div>

                <div className="btn-next-wrapper">
                  <button type="button" className="btn-next start-interview-btn" onClick={handleFinalStart} disabled={isLoading || !hasPermissions}>
                    {isLoading ? 'Connecting...' : 'Start Interview'}
                  </button>
                </div>
              </div>
              
              {error && <p className="error-message">{error}</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}