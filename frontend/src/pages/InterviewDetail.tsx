import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// @ts-ignore
import { getInterviewDetail } from '../interview_module/api/interviewService';
// @ts-ignore
import FeedbackDisplay from '../interview_module/components/FeedbackDisplay';

const InterviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        if (!id) throw new Error("No session ID provided");
        const data = await getInterviewDetail(id);
        setSessionData(data.session);
      } catch (err: any) {
        setError(err.message || "Failed to load interview details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#080a0f] flex flex-col items-center justify-center font-bold text-xl text-[#00f2fe]">
        <svg className="animate-spin h-10 w-10 mb-4 text-[#d422eb]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Decrypting AI Report...
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="w-full min-h-screen bg-[#080a0f] flex flex-col items-center justify-center p-6">
        <div className="bg-[#11141d] border border-[#ff0844] p-10 rounded-3xl text-center max-w-lg shadow-2xl">
          <div className="w-20 h-20 mx-auto bg-[#ff0844]/20 rounded-full flex items-center justify-center mb-6 border border-[#ff0844]/50">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff0844" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white">Record Not Found</h2>
          <p className="text-white/60 mb-8 leading-relaxed">{error || "This interview session could not be located in our secure vault."}</p>
          <button 
            onClick={() => navigate('/history')} 
            className="px-8 py-3 bg-transparent border-2 border-white/20 text-white rounded-xl font-bold tracking-widest text-sm hover:border-[#00f2fe] transition-all uppercase"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#080a0f] overflow-hidden">
      <FeedbackDisplay 
        data={sessionData.feedback_data} 
        sessionId={sessionData.session_id} 
        videoUrl={sessionData.video_url}
        isHistoryView={true}
      />
    </div>
  );
};

export default InterviewDetail;