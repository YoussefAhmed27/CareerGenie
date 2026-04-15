import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { startSession, uploadCvPdf, getExistingCv } from '../api/interviewService';
import { AVATAR_PROFILES } from './Avatar';
import Navbar from '../../components/Navbar/Navbar'; 
import '../interview-styles.css'; 

export const AVATAR_ROSTER = [
  { id: 'sarah', name: 'Sarah', role: 'Engineering Manager', modelUrl: '/model-f2.glb', voiceId: 'aura-asteria-en', profile: AVATAR_PROFILES.female_standard, previewImg: '/previews/Sarah.png' },
  { id: 'david', name: 'David', role: 'Senior Tech Lead', modelUrl: '/model.glb', voiceId: 'aura-orpheus-en', profile: AVATAR_PROFILES.male_standard, previewImg: '/previews/David.png' },
  { id: 'Caitlin', name: 'Caitlin', role: 'Product Manager', modelUrl: '/model-female.glb', voiceId: 'aura-hera-en', profile: AVATAR_PROFILES.female_standard, previewImg: '/previews/Caitlin.png' },
  { id: 'kenji', name: 'Kenji', role: 'HR Director', modelUrl: '/model3.glb', voiceId: 'aura-helios-en', profile: AVATAR_PROFILES.male_standard, previewImg: '/previews/kenji.png' }
];

export default function Setup() {
  const navigate = useNavigate(); 
  const [step, setStep] = useState(1); 
  const [selectedAvatarId, setSelectedAvatarId] = useState('david'); 
  const [interviewMode, setInterviewMode] = useState('comprehensive');
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
      setUploadedFileName(''); setUploadedCvText(''); return;
    }
    setIsUploading(true); setError('');
    try {
      const result = await uploadCvPdf(file);
      setUploadedCvText(result.cv_text);
      setUploadedFileName(result.filename);
    } catch (err) {
      setError(err.message); setUploadedFileName(''); setUploadedCvText('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUseExistingCv = async () => {
    setIsUploading(true);
    setError('');
    try {
      const { blob, filename } = await getExistingCv();
      const existingFile = new File([blob], filename, { type: "application/pdf" });
      const result = await uploadCvPdf(existingFile);
      setUploadedCvText(result.cv_text);
      setUploadedFileName(filename);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContextSubmit = (e) => {
    e.preventDefault();
    if (!uploadedCvText || !jdText || !jobRole) {
      setError('Please upload a CV, fill out the Job Role, and paste the Job Description.'); return;
    }
    setError('');
    setStep(2);
  };

  const proceedToAvatarSelection = () => {
    setError('');
    setStep(3);
  };

  const proceedToDeviceCheck = (idToUse) => {
    setSelectedAvatarId(idToUse);
    setError('');
    setStep(4);
  };

  const handleRandomizeAvatar = () => {
    if (isRandomizing) return; 
    setIsRandomizing(true);
    let rollCount = 0; const maxRolls = 50; const speed = 120; 
    let currentIndex = AVATAR_ROSTER.findIndex(a => a.id === selectedAvatarId);

    const rollInterval = setInterval(() => {
      let nextIndex;
      do { nextIndex = Math.floor(Math.random() * AVATAR_ROSTER.length); } while (nextIndex === currentIndex); 
      currentIndex = nextIndex;
      setSelectedAvatarId(AVATAR_ROSTER[currentIndex].id);
      rollCount++;
      if (rollCount >= maxRolls) {
        clearInterval(rollInterval); setIsRandomizing(false); proceedToDeviceCheck(AVATAR_ROSTER[currentIndex].id);
      }
    }, speed);
  };

  const startDeviceCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setHasPermissions(true); setError('');

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser(); analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream); source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let maxVal = 0;
        for (let i = 0; i < dataArray.length; i++) { if (dataArray[i] > maxVal) maxVal = dataArray[i]; }
        let targetPercentage = Math.min(100, (maxVal / 150) * 100);
        setAudioLevel(prev => targetPercentage > prev ? prev + (targetPercentage - prev) * 0.4 : prev + (targetPercentage - prev) * 0.1); 
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
    } catch (err) {
      setHasPermissions(false); setError("Camera and Microphone access denied.");
    }
  };

  const stopDeviceCheck = () => {
    if (videoRef.current && videoRef.current.srcObject) { videoRef.current.srcObject.getTracks().forEach(track => track.stop()); }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close().catch(e => console.warn(e)); }
  };

  useEffect(() => {
    if (step === 4) startDeviceCheck();
    return () => stopDeviceCheck();
  }, [step]);

  const handleFinalStart = async () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
    } catch (e) {}
    
    setIsLoading(true); setError(''); stopDeviceCheck();

    try {
      const selectedAvatar = AVATAR_ROSTER.find(a => a.id === selectedAvatarId);
      const sessionId = await startSession(uploadedCvText, jdText, selectedAvatar.voiceId);
      sessionStorage.setItem('current_session_id', sessionId);
      sessionStorage.setItem('current_avatar', JSON.stringify(selectedAvatar));
      
      navigate(`/interview/session?mode=${interviewMode}`);
    } catch (err) {
      setError(err.message); setIsLoading(false); startDeviceCheck(); 
    } 
  };

  return (
    <>
      <Navbar />
      <div className="ai-theme-wrapper min-h-screen pt-28 pb-12 relative">
        <div className="setup-page-content max-w-5xl mx-auto flex flex-col w-full">
          
          <div className="stepper-container" style={{ marginBottom: '2rem' }}>
            <span className={`stepper-item ${step >= 1 ? 'active' : ''}`}>1. Role & CV</span>
            <span className="stepper-separator">›</span>
            <span className={`stepper-item ${step >= 2 ? 'active' : ''}`}>2. Interview Mode</span>
            <span className="stepper-separator">›</span>
            <span className={`stepper-item ${step >= 3 ? 'active' : ''}`}>3. Avatar</span>
            <span className="stepper-separator">›</span>
            <span className={`stepper-item ${step === 4 ? 'active' : ''}`}>4. Device Check</span>
          </div>

          <div className="setup-card">
            
            {/* STEP 1: CONTEXT */}
            {step === 1 && (
              <div className="step-1-container">
                <img src="/genie-character.png" alt="Genie" className="setup-genie-image" />
                <h2 className="gradient-text-header">Setup Your Interview</h2>
                <p className="subtitle-divider">Provide context so Genie can tailor your experience</p>

                <form onSubmit={handleContextSubmit} className="modern-setup-form">
                  <div className="form-top-row">
                    <div className="input-group resume-group">
                      <div className="cv-pods-container">
                        <div className={`cv-pod ${uploadedFileName ? 'success' : ''} ${isUploading ? 'loading' : ''}`} onClick={() => !isUploading && fileInputRef.current.click()}>
                          <span className="cv-pod-label">UPLOAD CV</span>
                          <div className="cv-pod-circle">
                            {isUploading ? <div className="spinner-minimal"></div> : uploadedFileName ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                          </div>
                          {uploadedFileName && <span className="file-name-success" title={uploadedFileName}>{uploadedFileName}</span>}
                        </div>
                        <div className={`cv-pod ${uploadedFileName ? 'success' : ''} ${isUploading ? 'loading' : ''}`} onClick={handleUseExistingCv}>
                          <span className="cv-pod-label">USE EXISTING CV</span>
                          <div className="cv-pod-circle">
                            {isUploading ? <div className="spinner-minimal"></div> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
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
                    Next
                  </button>
                  {error && <p className="error-message">{error}</p>}
                </form>
              </div>
            )}

            {step === 2 && (
              <div className="avatar-selection-step">
                <h2 className="gradient-text-header">Select Interview Mode</h2>
                <p className="subtitle-divider">Target specific rounds of the hiring cycle</p>

                <style>{`
                  .mode-selector-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    height: 380px; 
                    justify-content: flex-start;
                    margin-top: 40px;
                  }

                  .circles-row {
                    display: flex;
                    justify-content: center;
                    gap: 60px;
                    margin-bottom: 40px;
                  }

                  .mode-circle-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    gap: 16px;
                    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                  }

                  .mode-circle {
                    width: 90px;
                    height: 90px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.03);
                    border: 2px solid rgba(255,255,255,0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.4);
                    transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
                    position: relative;
                  }

                  .mode-circle-wrapper:hover .mode-circle {
                    background: rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.8);
                    transform: scale(1.15);
                  }

                  .mode-circle-wrapper.active {
                    transform: scale(1.15);
                  }

                  .mode-circle-wrapper.inactive {
                    opacity: 0.4;
                    transform: scale(0.9);
                  }

                  .mode-circle-wrapper.active .mode-circle {
                    background: linear-gradient(135deg, rgba(0,242,254,0.1), rgba(212,34,235,0.1));
                    border-color: transparent;
                    color: #fff;
                    box-shadow: 0 10px 30px rgba(212,34,235,0.3);
                  }

                  .mode-circle-wrapper.active .mode-circle::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 50%;
                    padding: 2px;
                    background: linear-gradient(135deg, #00f2fe, #d422eb);
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    -webkit-mask-composite: exclude;
                    mask-composite: exclude;
                    pointer-events: none;
                  }

                  .mode-circle-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #8b949e;
                    transition: all 0.4s;
                  }

                  .mode-circle-wrapper.active .mode-circle-title {
                    color: #fff;
                    text-shadow: 0 0 10px rgba(0,242,254,0.5);
                  }

                  .mode-description-box {
                    width: 100%;
                    max-width: 600px;
                    height: 100px; 
                    background: rgba(17, 20, 29, 0.6);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    padding: 0 32px;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
                  }

                  .mode-desc-text {
                    font-size: 1.05rem;
                    color: #e8edf5;
                    line-height: 1.6;
                    margin: 0;
                    animation: fadeInDesc 0.5s ease forwards;
                  }

                  @keyframes fadeInDesc {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>

                <div className="mode-selector-container">
                  
                  <div className="circles-row">
                    <div 
                      className={`mode-circle-wrapper ${interviewMode === 'behavioral' ? 'active' : 'inactive'}`} 
                      onClick={() => setInterviewMode('behavioral')}
                    >
                      <div className="mode-circle">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </div>
                      <span className="mode-circle-title">Behavioral</span>
                    </div>

                    <div 
                      className={`mode-circle-wrapper ${interviewMode === 'technical' ? 'active' : 'inactive'}`} 
                      onClick={() => setInterviewMode('technical')}
                    >
                      <div className="mode-circle">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                      </div>
                      <span className="mode-circle-title">Technical</span>
                    </div>

                    <div 
                      className={`mode-circle-wrapper ${interviewMode === 'comprehensive' ? 'active' : 'inactive'}`} 
                      onClick={() => setInterviewMode('comprehensive')}
                    >
                      <div className="mode-circle">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                      </div>
                      <span className="mode-circle-title">Comprehensive</span>
                    </div>
                  </div>

                  <div className="mode-description-box">
                    {interviewMode === 'behavioral' && (
                      <p key="desc-1" className="mode-desc-text">Evaluates your soft skills, cultural fit, past experiences, situational awareness and job alignment</p>
                    )}
                    {interviewMode === 'technical' && (
                      <p key="desc-2" className="mode-desc-text">Assesses your hard skills and domain expertise with role specific questions, problem solving and technical concepts</p>
                    )}
                    {interviewMode === 'comprehensive' && (
                      <p key="desc-3" className="mode-desc-text">A full-spectrum interview that evaluates both your technical proficiency and behavioral fit for a well-rounded assessment</p>
                    )}
                  </div>

                </div>

                <div className="bottom-nav-grid" style={{ marginTop: '0px' }}>
                  <div className="btn-back-wrapper">
                    <button type="button" className="btn-back" onClick={() => setStep(1)}>Back</button>
                  </div>
                  <div className="center-dice-wrapper"></div>
                  <div className="btn-next-wrapper">
                    <button type="button" className="btn-next" onClick={proceedToAvatarSelection}>Next</button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="avatar-selection-step">
                <h2 className="gradient-text-header">Choose Your Interviewer</h2>
                <p className="subtitle-divider">Select the avatar that fits the interview style</p>

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
                    <button type="button" className="btn-back" onClick={() => setStep(2)} disabled={isLoading || isRandomizing}>Back</button>
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
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="device-check-step">
                <h2 className="gradient-text-header">Hardware Check</h2>
                <p className="subtitle-divider">Verify camera/mic before interview starts</p>

                <div className="studio-dashboard-container">
                  
                  <div className="video-hero-card">
                    <div className="video-wrapper">
                      <video ref={videoRef} autoPlay muted playsInline className="studio-video" style={{ opacity: hasPermissions ? 1 : 0 }} />
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
                        <div className="status-icon-box"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>
                        <div className="status-text"><span className="status-title">Camera</span><span className="status-sub">{hasPermissions ? 'Connected' : 'Waiting for browser...'}</span></div>
                      </div>
                      <div className={`status-item ${hasPermissions ? 'ready' : 'pending'}`}>
                        <div className="status-icon-box"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></div>
                        <div className="status-text"><span className="status-title">Microphone</span><span className="status-sub">{hasPermissions ? 'Input Detected' : 'Waiting for browser...'}</span></div>
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
                          return (<div key={i} className={`sleek-bar ${isLoud ? 'loud' : ''}`} style={{ height: `${barHeight}%` }}></div>);
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="bottom-nav-grid" style={{ marginTop: '2rem' }}>
                  <div className="btn-back-wrapper">
                    <button type="button" className="btn-back" onClick={() => setStep(3)} disabled={isLoading}>Back</button>
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
    </>
  );
}