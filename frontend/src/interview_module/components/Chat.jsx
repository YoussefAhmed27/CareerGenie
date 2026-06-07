import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpeech } from '../hooks/useSpeech';
import Message from './Message';
import FeedbackDisplay from './FeedbackDisplay';
import Experience from './Experience'; 
import WebcamOverlay from './WebcamOverlay';
import CodeSandbox from './Codesandbox';
import AnalysisLoader from './AnalysisLoader'; 
import '../interview-styles.css'; 

export default function Chat() {
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const urlSessionId = searchParams.get('sessionId');
  const mode = searchParams.get('mode') || 'interview';
  
  const sessionId = urlSessionId || sessionStorage.getItem('current_session_id');
  const avatarConfig = JSON.parse(sessionStorage.getItem('current_avatar') || "{}");

  const [isAvatarReady, setIsAvatarReady] = useState(false);
  const [cheatReason, setCheatReason] = useState(null);

  const { 
    isListening, 
    messages, 
    analyser,
    scheduledVisemes,
    audioCtx,
    startListening, 
    stopListening,
    isInterviewComplete,
    isCodingQuestion,
    codingQuestionText,
    submitCodeToAgent,
    isVideoUploaded,        
    setIsInterviewComplete  
  } = useSpeech(sessionId, isAvatarReady, mode);

  const [feedbackData, setFeedbackData] = useState(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const hasTriggeredEndRef = useRef(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isInterviewComplete && !hasTriggeredEndRef.current && !cheatReason) {
      handleEndInterview();
    }
  }, [isInterviewComplete, cheatReason]);

  const handleMicToggle = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleEndInterview = async (reason = null) => {
    if (hasTriggeredEndRef.current && !reason) return;
    hasTriggeredEndRef.current = true;

    setIsInterviewComplete(true); 
    stopListening();

    if (reason) {
      setCheatReason(reason);
      return; 
    }

    if (mode === 'coaching') {
      if (audioCtx && audioCtx.state === 'running') {
        audioCtx.suspend();
      }
      navigate('/');
      return;
    }

    setIsFeedbackLoading(true);
    setFeedbackError(null);
  };

  useEffect(() => {
    if (isFeedbackLoading && isVideoUploaded && !feedbackData && !feedbackError) {
      const fetchFeedback = async () => {
        try {
          const storedQaIntervals = JSON.parse(
            localStorage.getItem(`qa_intervals_${sessionId}`) || "[]"
          );

          const AI_BASE_URL =
            import.meta.env.VITE_AI_URL ||
            import.meta.env.VITE_AI_SERVICE_URL ||
            'https://ai.careersgenie.tech';
          
          const response = await fetch(`${AI_BASE_URL}/get_feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              qa_intervals: storedQaIntervals
            })
          });
          
          if (!response.ok) throw new Error(`Backend Error: ${response.status}`);
          
          const data = await response.json();
          setFeedbackData(data);
        } catch (error) {
          console.error("Feedback error:", error);
          setFeedbackError(error.message); 
        } finally {
          setIsFeedbackLoading(false);
        }
      };

      fetchFeedback();
    }
  }, [isFeedbackLoading, isVideoUploaded, sessionId, feedbackData, feedbackError]);

  const handleCodeSubmit = (code, output, language) => {
    submitCodeToAgent(code, output, language);
  };

  if (cheatReason) {
    return (
      <div className="ai-theme-wrapper">
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
          background: 'radial-gradient(circle at center, #1f0505 0%, #000000 100%)',
          color: 'white', fontFamily: 'system-ui, sans-serif', zIndex: 9999, overflow: 'hidden'
        }}>
          
          <style>
            {`
              @keyframes pulseRedGlow {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                70% { box-shadow: 0 0 0 40px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
              }
              @keyframes scanline {
                0% { top: -10%; opacity: 0; }
                10% { opacity: 0.3; }
                90% { opacity: 0.3; }
                100% { top: 110%; opacity: 0; }
              }
              @keyframes slideUpFade {
                0% { opacity: 0; transform: translateY(40px) scale(0.95); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes glitchText {
                0% { text-shadow: 2px 0 red, -2px 0 cyan; }
                20% { text-shadow: -2px 0 red, 2px 0 cyan; }
                40% { text-shadow: 2px 0 red, -2px 0 cyan; }
                60% { text-shadow: -2px 0 red, 2px 0 cyan; }
                80% { text-shadow: 2px 0 red, -2px 0 cyan; }
                100% { text-shadow: 0 0 0; }
              }
            `}
          </style>

          <div style={{
            position: 'absolute', width: '100%', height: '10px', background: 'rgba(239, 68, 68, 0.5)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 1)', animation: 'scanline 3s linear infinite'
          }}></div>

          <div style={{
            position: 'relative', width: '90%', maxWidth: '550px', background: 'rgba(15, 5, 5, 0.8)',
            backdropFilter: 'blur(16px)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '24px',
            padding: '50px 40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            
            <div style={{
              width: '80px', height: '80px', margin: '0 auto 30px auto', background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid #ef4444', borderRadius: '50%', display: 'flex', justifyContent: 'center',
              alignItems: 'center', animation: 'pulseRedGlow 2s infinite'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <line x1="12" y1="15" x2="12" y2="18"></line>
              </svg>
            </div>
            
            <h1 style={{ 
              fontSize: '2.5rem', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '4px',
              color: '#ef4444', animation: 'glitchText 0.3s ease-in-out'
            }}>
              SESSION LOCKED
            </h1>
            
            <div style={{ width: '60px', height: '4px', background: '#ef4444', margin: '20px auto', borderRadius: '2px' }}></div>
            
            <h2 style={{ fontSize: '1.1rem', color: '#fca5a5', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '15px' }}>
              Violation: {cheatReason}
            </h2>
            
            <p style={{ color: '#9ca3af', fontSize: '1rem', lineHeight: '1.6', marginBottom: '40px' }}>
              Our automated proctoring engine has detected an integrity violation. This interview simulation has been forcibly terminated.
            </p>

            <button 
              onClick={() => window.location.href = '/'} 
              style={{
                padding: '16px 32px', background: '#ef4444', color: 'white', border: 'none',
                borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px',
                cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
              }}
              onMouseOver={(e) => { e.target.style.background = '#dc2626'; e.target.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.target.style.background = '#ef4444'; e.target.style.transform = 'translateY(0)'; }}
            >
              ACKNOWLEDGE & EXIT
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (feedbackError) {
    return (
      <div className="ai-theme-wrapper flex items-center justify-center h-screen text-white">
        <div className="text-center bg-[#0B0F19] p-10 rounded-3xl border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-red-400">Analysis Failed</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">The interview session data could not be processed. The server may have timed out while generating your comprehensive feedback report.</p>
          <p className="text-xs text-red-400/50 mb-8 font-mono">{feedbackError}</p>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors font-semibold">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (isFeedbackLoading || (feedbackData && !isVideoUploaded)) {
    return <AnalysisLoader />;
  }

  if (feedbackData && isVideoUploaded) {
    return <FeedbackDisplay data={feedbackData} sessionId={sessionId} />;
  }

  const showSandbox = isCodingQuestion && mode !== 'coaching';

  const styles = {
    micButton: {
      width: '70px', height: '70px', borderRadius: '50%', border: 'none',
      background: isListening ? '#ef4444' : 'white',
      color: isListening ? 'white' : 'black',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', boxShadow: '0 5px 20px rgba(0,0,0,0.5)', transition: 'all 0.2s',
    },
    endButton: {
      padding: '12px 24px', borderRadius: '30px',
      border: '1px solid rgba(255,255,255,0.2)',
      background: mode === 'coaching' ? 'rgba(0, 242, 254, 0.4)' : 'rgba(255, 0, 0, 0.6)', 
      color: 'white',
      fontWeight: 'bold', cursor: 'pointer',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '8px',
    },
    sandboxPanel: {
      flex: showSandbox ? '0 0 35%' : '0 0 0%',
      overflow: 'hidden',
      borderLeft: showSandbox ? '1px solid rgba(255,255,255,0.05)' : 'none',
      borderRight: showSandbox ? '1px solid rgba(255,255,255,0.05)' : 'none',
      transition: 'flex 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(20px)'
    },
    header: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px' },
    messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
  };

  return (
    <div className="ai-theme-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      <div className="w-full bg-[rgba(17,21,45,0.4)] backdrop-blur-md border-b border-white/10 h-20 flex items-center px-6 fixed top-0 left-0 z-50">
        <img 
          src="/logo.svg" 
          alt="CareerGenie" 
          className="w-40 sm:w-48 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => navigate('/')} 
          title="Return to Home"
        />
        {mode === 'coaching' && (
          <div style={{ marginLeft: '20px', background: 'rgba(0,242,254,0.1)', color: '#00f2fe', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', border: '1px solid #00f2fe' }}>
            LIVE COACHING SESSION
          </div>
        )}
      </div>

      <div className="chat-main-container">
        <div className="chat-left-panel" style={{ flex: showSandbox ? '0 0 40%' : 1 }}>
          <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            <Experience
              analyser={analyser}
              scheduledVisemes={scheduledVisemes}
              audioCtx={audioCtx}
              onReady={() => setIsAvatarReady(true)}
              modelUrl={mode === 'coaching' ? '/coach.glb' : avatarConfig?.modelUrl}
              config={avatarConfig?.profile}
            />
          </div>

          {mode !== 'coaching' && (
            <div className="webcam-wrapper">
              <WebcamOverlay 
                sessionId={sessionId}
                isActive={isAvatarReady && !isInterviewComplete}
                onTerminate={(reason) => {
                  handleEndInterview(reason);
                }}
              />
            </div>
          )}

          <div className="chat-center-control">
            <button style={styles.micButton} onClick={handleMicToggle}>
              {isListening ? (
                <div style={{ width: '24px', height: '24px', background: 'white', borderRadius: '4px' }} />
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          </div>

          <div className="chat-right-control">
            <button style={styles.endButton} onClick={() => handleEndInterview()} disabled={isFeedbackLoading}>
              {isFeedbackLoading ? 'Analyzing...' : (mode === 'coaching' ? 'End Session' : 'End Interview')}
            </button>
          </div>
        </div>

        <div style={styles.sandboxPanel}>
          {showSandbox && (
            <CodeSandbox
              questionText={codingQuestionText}
              onSubmit={handleCodeSubmit}
            />
          )}
        </div>

        <div className="chat-right-panel">
          <div style={styles.header}>LIVE TRANSCRIPT</div>
          <div style={styles.messages}>
            {messages.map((msg, idx) => (
              <Message key={idx} sender={msg.sender} text={msg.text} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}