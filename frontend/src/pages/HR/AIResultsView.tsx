// @ts-nocheck
import React from 'react';
import { ArrowLeft, X, Download, Calendar, CheckCircle, AlertCircle, FileText, Brain } from 'lucide-react';
import { Button, Card, Avatar, BarChart } from '../../components/HR/HrUIComponents';
import { fetchAIInterviewResult, rejectCandidate } from '../../services/hrService';
import FeedbackDisplay from '../../interview_module/components/FeedbackDisplay';

const AIResultsView = ({ setView, activeCandidate, activeJob }: any) => {
  const c = activeCandidate;
  const isClosedJob = activeJob?.status === 'Closed';
  const isRejected = c?.status === 'Rejected' || c?.stage === 'Rejected';
  const [aiResult, setAiResult] = React.useState<any>(null);
  const [aiResultError, setAiResultError] = React.useState('');
  const [detailView, setDetailView] = React.useState<'cv' | 'interview' | null>(null);
  const [decisionLoading, setDecisionLoading] = React.useState(false);
  const [decisionError, setDecisionError] = React.useState('');
  const metrics = c?.metrics || {};
  const cvAnalysis = c?.cv_analysis || {};
  const jobMatch = c?.job_match_analysis || {};
  const interviewFeedback = aiResult?.feedback_data || {};
  const sectionEntries = Object.entries(cvAnalysis).filter(([, value]: any) => value?.score != null || value?.feedback);
  const strengths = jobMatch.matched_keywords || [];
  const gaps = [
    ...(jobMatch.missing_critical_skills || []),
    ...(jobMatch.skill_gap_analysis || []).map((gap: any) => gap.skill || gap.explanation).filter(Boolean),
  ];

  React.useEffect(() => {
    if (!c?.job_candidate_id) return;
    let active = true;

    fetchAIInterviewResult(c.job_candidate_id)
      .then((payload) => {
        if (active) setAiResult(payload.result || null);
      })
      .catch((err) => {
        if (active) setAiResultError(err.message || 'AI interview result unavailable.');
      });

    return () => {
      active = false;
    };
  }, [c?.job_candidate_id]);

  const handleReject = async () => {
    if (!c || decisionLoading) return;
    setDecisionLoading(true);
    setDecisionError('');
    try {
      await rejectCandidate(c.job_candidate_id);
      setView('candidate-list');
    } catch (err: any) {
      setDecisionError(err.message || 'Could not reject candidate.');
    } finally {
      setDecisionLoading(false);
    }
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const cvScore = c?.score ?? c?.job_alignment_score ?? c?.overall_cv_score ?? null;
  const interviewScore = aiResult?.overall_score ?? interviewFeedback?.overall_score ?? null;
  const formatInterviewScore = (score: any) => score == null ? '-' : `${Number(score).toFixed(1)}/10`;

  if (detailView === 'interview') {
    return (
      <div className="flex flex-col gap-4">
        {aiResult?.result_id && interviewFeedback && Object.keys(interviewFeedback).length > 0 ? (
          <div className="fixed inset-0 z-[9999] bg-[#080a0f]">
            <FeedbackDisplay
              data={interviewFeedback}
              sessionId={aiResult.ai_session_id}
              isHistoryView
              onExit={() => setDetailView(null)}
              exitLabel="BACK TO HR REVIEW"
            />
          </div>
        ) : (
          <>
            <div className="px-2">
              <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setDetailView(null)}>Back to Review</Button>
            </div>
            <Card>
              <h3 className="text-xl font-bold text-white mb-2">AI Interview Feedback</h3>
              <p className="text-gray-400">
                {aiResult?.invitation_status
                  ? `Invitation status: ${aiResult.invitation_status}. Full feedback has not been saved yet.`
                  : 'No AI interview result has been saved for this candidate yet.'}
              </p>
              {aiResultError && <p className="text-sm text-amber-400 mt-3">{aiResultError}</p>}
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView('candidate-list')}>Back to Pipeline</Button>
        {!isClosedJob && !isRejected && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="danger" icon={X} onClick={handleReject} disabled={decisionLoading} className="flex-1 sm:flex-none">
              {decisionLoading ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button icon={Calendar} onClick={() => setView('live-schedule')} className="flex-1 sm:flex-none">Schedule Live</Button>
          </div>
        )}
      </div>
      {isRejected && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm">
          This candidate has been rejected. Their record is locked and available for review only.
        </div>
      )}
      {decisionError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">{decisionError}</div>}

      {detailView === null && (
        <>
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-sm text-gray-400">{c?.cv_filename || 'Uploaded CV'}</p>
                <h3 className="text-2xl font-bold text-white mt-1">Candidate Review - {c?.name || 'Candidate'}</h3>
                <p className="text-gray-400 mt-2">Open either score card to review the detailed report.</p>
              </div>
              <Avatar initials={getInitials(c?.name)} size="xl" />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:border-[#22d3ee]/50 transition-colors flex flex-col h-full" onClick={() => setDetailView('cv')}>
              <div className="flex-1 flex items-start justify-between gap-4">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-[#22d3ee]/10 text-[#22d3ee] flex items-center justify-center mb-5">
                    <FileText size={26} />
                  </div>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Overall CV Score</p>
                  <div className="text-5xl font-bold text-[#22d3ee] mt-3">{cvScore != null ? `${cvScore}%` : '-'}</div>
                  <p className="text-gray-400 mt-4">{c?.ranking_summary || 'CV screening details are available for this candidate.'}</p>
                </div>
              </div>
              <Button className="mt-6" fullWidth variant="secondary" onClick={() => setDetailView('cv')}>View CV Details</Button>
            </Card>

            <Card className="cursor-pointer hover:border-[#d946ef]/50 transition-colors flex flex-col h-full" onClick={() => setDetailView('interview')}>
              <div className="flex-1 flex items-start justify-between gap-4">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-[#d946ef]/10 text-[#d946ef] flex items-center justify-center mb-5">
                    <Brain size={26} />
                  </div>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">AI Interview Score</p>
                  <div className="text-5xl font-bold text-[#d946ef] mt-3">{formatInterviewScore(interviewScore)}</div>
                  <p className="text-gray-400 mt-4">
                    {aiResult?.result_id ? 'Full AI interview feedback and recording are available.' : 'The AI interview has not been completed yet.'}
                  </p>
                </div>
              </div>
              <Button className="mt-6" fullWidth variant="secondary" onClick={() => setDetailView('interview')}>View Interview Details</Button>
            </Card>
          </div>
        </>
      )}

      {detailView === 'cv' && (
        <>
          <Card>
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setDetailView(null)}>Back to Review</Button>
          </Card>

          <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm text-gray-400">{c?.cv_filename || 'Uploaded CV'}</p>
            <h3 className="text-2xl font-bold text-white mt-1">CV Screening Report - {c?.name || 'Candidate'}</h3>
            <p className="text-gray-400 mt-2">{c ? new Date(c.created_at).toLocaleDateString() : ''}</p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-4xl font-bold text-[#22d3ee]">{c?.score != null ? `${c.score}%` : '-'}</div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mt-1">Overall Match</p>
          </div>
        </div>
          </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <h3 className="text-xl font-bold text-white mb-6">Detailed Feedback</h3>
            <div className="space-y-4 mb-8">
              {c?.job_alignment_score != null && <BarChart value={c.job_alignment_score} label="JOB ALIGNMENT" color="bg-[#22d3ee]" />}
              {c?.overall_cv_score != null && <BarChart value={c.overall_cv_score} label="OVERALL CV" color="bg-[#d946ef]" />}
              {c?.job_alignment_score == null && c?.overall_cv_score == null && c?.score != null && (
                <BarChart value={c.score} label="CV SCREENING SCORE" color="bg-[#22d3ee]" />
              )}
            </div>

            {c?.ranking_summary && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-4">
                <h4 className="text-white font-bold mb-2">Summary</h4>
                <p className="text-sm text-gray-300">{c.ranking_summary}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><CheckCircle size={16} /> Matched Signals</h4>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  {strengths.length > 0
                    ? strengths.slice(0, 6).map((item: string, idx: number) => <li key={idx}>{item}</li>)
                    : <li>No matched keywords were returned by the CV service.</li>}
                </ul>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2"><AlertCircle size={16} /> Gaps / Review Points</h4>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  {gaps.length > 0
                    ? gaps.slice(0, 6).map((item: string, idx: number) => <li key={idx}>{item}</li>)
                    : <li>No critical gaps were returned by the CV service.</li>}
                </ul>
              </div>
              {sectionEntries.length > 0 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <h4 className="text-white font-bold mb-3">CV Section Analysis</h4>
                  <div className="space-y-3">
                    {sectionEntries.map(([key, value]: any) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                          <span>{key.replace(/_/g, ' ')}</span>
                          <span>{value.score != null ? `${value.score}/10` : '-'}</span>
                        </div>
                        {value.feedback && <p className="text-sm text-gray-300 mt-1">{value.feedback}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card className="sticky top-24">
            <div className="text-center mb-6">
              <div className="w-32 h-32 rounded-full border-8 border-[#22d3ee] flex items-center justify-center mx-auto mb-4">
                {c ? <Avatar initials={getInitials(c.name)} size="xl" /> : <span className="text-4xl font-bold text-white">-</span>}
              </div>
              <p className="font-bold text-white text-lg">{c?.name}</p>
              <div className="text-4xl font-bold text-[#22d3ee] mt-2">{c?.score != null ? `${c.score}%` : '-'}</div>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mt-1">Overall Match</p>
            </div>
            <div className="space-y-4">
              {!isClosedJob && !isRejected && (
                <Button fullWidth onClick={() => setView('live-schedule')}>Schedule Live Interview</Button>
              )}
              <Button fullWidth variant="secondary" icon={Download}>Download Full Report</Button>
            </div>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default AIResultsView;
