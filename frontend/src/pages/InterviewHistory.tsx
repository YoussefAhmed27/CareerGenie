import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { getInterviewHistory, deleteInterview } from '../interview_module/api/interviewService';

interface InterviewSession {
  session_id: string;
  job_role: string;
  interview_mode: string;
  overall_score: string | number;
  created_at: string;
}

const scoreColor = (score: number) => {
  if (score >= 8.5) return '#00f2fe';
  if (score >= 7.5) return '#29d4d4';
  if (score >= 6.5) return '#a07ae0';
  if (score >= 5.5) return '#d422eb';
  return '#ff0844';
};

const ScoreDonut = ({ score, color }: { score: number, color: string }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
        <circle
          cx="40" cy="40" r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
      <div className="font-mono font-black text-2xl z-10 text-white">
        {score.toFixed(1)}
      </div>
    </div>
  );
};

const InterviewHistory: React.FC = () => {
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getInterviewHistory();
        setInterviews(data.interviews || []);
      } catch (err: any) {
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteInterview(deleteConfirmId);
      setInterviews(interviews.filter(inv => inv.session_id !== deleteConfirmId));
    } catch (err: any) {
      alert(err.message || "Failed to delete interview");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div className="min-h-screen bg-[#11172c] text-white px-6 py-12 font-sans relative">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 
            className="text-4xl md:text-5xl font-black mb-2"
            style={{
                lineHeight: '1',
                paddingBottom: '0.15em',
                background: 'linear-gradient(90deg, #00f2fe 0%, #d422eb 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}
            >
            Interview History
            </h1>
            <p className="text-[#7586a1] text-lg font-semibold">
              Your comprehensive performance records.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold tracking-widest text-sm hover:bg-[#ff0844] hover:border-[#ff0844] hover:shadow-[0_0_20px_rgba(255,8,68,0.4)] transition-all uppercase"
          >
            Exit Dashboard
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <svg className="animate-spin h-10 w-10 text-[#00f2fe]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="bg-[#111622] border border-[#ff0844]/50 p-8 rounded-2xl text-center">
            <p className="text-[#ff0844] text-lg mb-4 font-bold">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#ff0844]/20 border border-[#ff0844]/50 text-[#ff0844] rounded-lg font-bold hover:bg-[#ff0844] hover:text-white transition-all">Retry</button>
          </div>
        ) : interviews.length === 0 ? (
          <div className="bg-[#111622] border border-white/10 p-16 rounded-3xl text-center shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-[#a0aab2]">No Sessions Found</h2>
            <p className="text-white/50 mb-8">You haven't completed any simulated interviews yet.</p>
            <button
              onClick={() => navigate('/interview/setup')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#d422eb] to-[#00f2fe] font-black tracking-widest text-white shadow-[0_4px_20px_rgba(212,34,235,0.4)] hover:shadow-[0_8px_30px_rgba(212,34,235,0.6)] hover:-translate-y-1 transition-all uppercase"
            >
              Start New Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {interviews.map((session) => {
              const score = parseFloat(session.overall_score as string) || 0;
              const color = scoreColor(score);
              const formattedDate = new Date(session.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              });

              return (
                <div
                  key={session.session_id}
                  onClick={() => navigate(`/history/${session.session_id}`)}
                  className="bg-[#181b2a] border border-white/10 rounded-[2rem] p-8 cursor-pointer group hover:-translate-y-2 transition-all duration-300 flex flex-col h-full"
                  style={{ boxShadow: `0 4px 20px rgba(0,0,0,0.3)` }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = `0 10px 40px ${color}30`}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3)`}
                >
                  <div className="flex justify-between items-start mb-6">
                    
                    <ScoreDonut score={score} color={color} />

                    <div className="text-right mt-2">
                      <span className="text-[11px] font-black tracking-widest text-[#7586a1] uppercase block mb-1">Date</span>
                      <span className="text-white font-bold">{formattedDate}</span>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div>
                      <span className="text-[11px] font-black tracking-widest text-[#7586a1] uppercase block mb-1">Target Role</span>
                      <h3 className="text-xl font-bold text-white truncate pb-1" title={session.job_role}>{session.job_role}</h3>
                    </div>
                    
                    <div className="inline-block px-3 py-1.5 rounded-md bg-white/5 border border-white/10">
                      <span className="text-xs font-bold tracking-wider text-white/90 uppercase">
                        {session.interview_mode} Mode
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-sm font-bold tracking-widest uppercase">
                    
                    <div className="flex items-center gap-2 text-[#a0aab2] group-hover:text-white transition-colors duration-300">
                      View Report
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-1 transition-transform duration-300">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteClick(e, session.session_id)}
                      className="p-2 text-[#7586a1] hover:text-white hover:bg-[#ff0844] hover:shadow-[0_0_15px_rgba(255,8,68,0.6)] rounded-xl transition-all"
                      
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1c]/90 backdrop-blur-sm px-4">
          <div className="bg-[#111622] border border-[#ff0844]/50 p-8 rounded-2xl max-w-md w-full shadow-[0_20px_60px_rgba(255,8,68,0.15)] text-center">
            <div className="w-16 h-16 mx-auto bg-[#ff0844]/20 rounded-full flex items-center justify-center mb-6 border border-[#ff0844]/50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff0844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Delete Record?</h3>
            <p className="text-[#a0aab2] mb-8 leading-relaxed">This action is permanent and cannot be undone. The video recording and all AI feedback will be permanently destroyed.</p>
            <div className="flex gap-4">
              <button 
                onClick={cancelDelete} 
                className="flex-1 py-3 rounded-xl border border-white/20 text-white font-bold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-3 rounded-xl bg-[#ff0844] text-white font-bold hover:bg-red-600 shadow-[0_0_15px_rgba(255,8,68,0.4)] transition-all"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewHistory;