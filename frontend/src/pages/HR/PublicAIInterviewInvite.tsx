// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, ShieldCheck } from 'lucide-react';
import { fetchPublicAIInterviewInvite, markPublicAIInterviewStarted } from '../../services/hrService';
import { AVATAR_PROFILES } from '../../interview_module/components/Avatar';
import '../../interview_module/interview-styles.css';

const AI_SERVICE_URL = (import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const DEFAULT_AVATAR = {
  id: 'david',
  name: 'David',
  role: 'Senior Tech Lead',
  modelUrl: '/model.glb',
  voiceId: 'aura-orpheus-en',
  profile: AVATAR_PROFILES.male_standard,
  previewImg: '/previews/David.png',
};

const PublicAIInterviewInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState('');

  const stopDeviceCheck = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  const startDeviceCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setHasPermissions(true);
      setError('');

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let maxVal = 0;
        for (let i = 0; i < dataArray.length; i++) if (dataArray[i] > maxVal) maxVal = dataArray[i];
        const targetPercentage = Math.min(100, (maxVal / 150) * 100);
        setAudioLevel((prev) => targetPercentage > prev
          ? prev + (targetPercentage - prev) * 0.4
          : prev + (targetPercentage - prev) * 0.1);
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
    } catch {
      setHasPermissions(false);
      setError('Camera and microphone access is required before starting the interview.');
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchPublicAIInterviewInvite(token)
      .then((payload) => {
        setInvite(payload);
        setLoading(false);
        setTimeout(startDeviceCheck, 0);
      })
      .catch((err) => {
        setError(err.message || 'Invitation could not be loaded.');
        setLoading(false);
      });

    return () => stopDeviceCheck();
  }, [token]);

  const startInterview = async () => {
    if (!token || !invite) return;
    if (!hasPermissions) {
      setError('Please allow camera and microphone access before starting.');
      return;
    }
    setStarting(true);
    setError('');
    stopDeviceCheck();

    try {
      const context = invite.interview_context;
      const startRes = await fetch(`${AI_SERVICE_URL}/start_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_text: context.cv_text || 'Candidate CV context unavailable.',
          jd_text: context.jd_text || invite.job?.description || invite.job?.title || 'Job context unavailable.',
          voice_id: context.voice_id || DEFAULT_AVATAR.voiceId,
          job_role: context.job_role || invite.job?.title || 'Domain Expert',
        }),
      });

      if (!startRes.ok) {
        const detail = await startRes.json().catch(() => ({}));
        throw new Error(detail.detail || 'Could not start AI interview session.');
      }

      const { session_id } = await startRes.json();
      sessionStorage.setItem('current_session_id', session_id);
      sessionStorage.setItem('current_avatar', JSON.stringify(DEFAULT_AVATAR));
      sessionStorage.setItem('hr_invitation_token', token);
      sessionStorage.setItem('hr_invitation_candidate', invite.candidate?.name || 'Candidate');
      sessionStorage.setItem('hr_invitation_job', invite.job?.title || context.job_role || 'Interview');

      await markPublicAIInterviewStarted(token, { ai_session_id: session_id });
      navigate(`/hr-interview/session?mode=${context.mode || 'comprehensive'}`);
    } catch (err: any) {
      setError(err.message || 'Could not start interview.');
      setStarting(false);
      startDeviceCheck();
    }
  };

  if (loading) {
    return <div className="ai-theme-wrapper min-h-screen grid place-items-center text-white">Loading invitation...</div>;
  }

  if (error && !invite) {
    return <div className="ai-theme-wrapper min-h-screen grid place-items-center text-red-400 px-4 text-center">{error}</div>;
  }

  return (
    <div className="ai-theme-wrapper min-h-screen px-6 py-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-300/20 text-cyan-300 flex items-center justify-center">
            <ShieldCheck size={30} />
          </div>
          <div>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.25em]">{invite?.invitation?.workspace_name || 'CareerGenie'} AI Interview</p>
            <h1 className="text-4xl font-black text-white mt-1">{invite?.job?.title || 'AI Interview'}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8">
          <aside className="rounded-3xl border border-white/10 bg-[#11141d]/90 p-7 shadow-2xl shadow-black/30">
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Candidate</p>
                <p className="text-white text-xl font-bold">{invite?.candidate?.name || 'Candidate'}</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Interview Window</p>
                <p className="text-gray-200 flex items-start gap-2">
                  <Calendar size={18} className="text-cyan-300 mt-0.5 shrink-0" />
                  <span>
                    {invite?.invitation?.start_time ? new Date(invite.invitation.start_time).toLocaleString() : 'Available now'}
                    {invite?.invitation?.end_time ? ` - ${new Date(invite.invitation.end_time).toLocaleString()}` : ''}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Instructions</p>
                <ul className="text-sm text-gray-300 space-y-3">
                  <li className="flex gap-3"><span className="text-cyan-300 font-bold">01</span><span>Use a quiet, well-lit place and keep this tab open.</span></li>
                  <li className="flex gap-3"><span className="text-cyan-300 font-bold">02</span><span>Allow camera and microphone access before starting.</span></li>
                  <li className="flex gap-3"><span className="text-cyan-300 font-bold">03</span><span>Sit upright, face the screen directly, and keep your upper body centered in frame.</span></li>
                  <li className="flex gap-3"><span className="text-cyan-300 font-bold">04</span><span>Answer each question naturally after the interviewer finishes speaking.</span></li>
                  <li className="flex gap-3"><span className="text-cyan-300 font-bold">05</span><span>Wait for the final confirmation screen before closing the tab.</span></li>
                </ul>
              </div>
              <div className="rounded-2xl bg-cyan-400/5 border border-cyan-300/20 p-5">
                <p className="text-xs font-bold text-cyan-300 uppercase mb-2">Role Context</p>
                <p className="text-sm text-gray-300 line-clamp-5">
                  {invite?.job?.description || 'The interview has been prepared with the hiring team context for this role.'}
                </p>
              </div>
            </div>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-[#11141d]/90 p-7 shadow-2xl shadow-black/30">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
              <div className="video-hero-card min-h-[520px]">
                <div className="video-wrapper h-full">
                  <video ref={videoRef} autoPlay muted playsInline className="studio-video" style={{ opacity: hasPermissions ? 1 : 0 }} />
                {!hasPermissions && (
                  <div className="studio-placeholder">
                    <div className="spinner-minimal"></div>
                    <span>Awaiting Camera Access...</span>
                  </div>
                )}
                {hasPermissions && (
                  <>
                    <div className="live-badge">
                      <span className="live-dot"></span> FEED ACTIVE
                    </div>
                    <div className="absolute inset-x-12 top-12 bottom-12 border border-cyan-300/25 rounded-[2rem] pointer-events-none"></div>
                    <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-black/45 border border-white/10 px-4 py-3 text-sm text-gray-200 backdrop-blur">
                      Keep your face centered, shoulders visible, and posture straight.
                    </div>
                  </>
                )}
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className={`rounded-2xl border p-5 ${hasPermissions ? 'bg-emerald-400/10 border-emerald-300/20' : 'bg-white/5 border-white/10'}`}>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Camera</p>
                  <p className="text-white font-bold">{hasPermissions ? 'Connected' : 'Waiting for permission'}</p>
                </div>
                <div className={`rounded-2xl border p-5 ${hasPermissions ? 'bg-emerald-400/10 border-emerald-300/20' : 'bg-white/5 border-white/10'}`}>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Microphone</p>
                  <p className="text-white font-bold">{hasPermissions ? 'Input detected' : 'Waiting for permission'}</p>
                </div>
                <div className="audio-monitor-card flex-1">
                  <div className="monitor-label">INPUT LEVEL</div>
                  <div className="sleek-bars-container">
                    {[...Array(25)].map((_, i) => {
                      const centerDist = Math.abs(i - 12);
                      const heightMultiplier = Math.max(0.15, 1 - (centerDist * 0.08));
                      const barHeight = Math.max(4, audioLevel * heightMultiplier);
                      const isLoud = barHeight > 60;
                      return <div key={i} className={`sleek-bar ${isLoud ? 'loud' : ''}`} style={{ height: `${barHeight}%` }} />;
                    })}
                  </div>
                </div>
                <button type="button" className="btn-next start-interview-btn w-full" onClick={startInterview} disabled={starting || !hasPermissions}>
                  {starting ? 'Connecting...' : 'Start Interview'}
                </button>
              </div>
            </div>
            {error && <p className="error-message mt-5">{error}</p>}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PublicAIInterviewInvite;
