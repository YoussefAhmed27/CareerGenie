// @ts-nocheck
import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button, Card, Avatar, BarChart } from '../../components/HR/HrUIComponents';

const CompareView = ({ setView, candidates, setActiveCandidate, setSelectedCandidates }: any) => {
  const [mode, setMode] = React.useState<'cv' | 'interview'>('cv');
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const scoreForMode = (c: any) => mode === 'interview'
    ? c.ai_interview_score
    : c.score ?? c.job_alignment_score ?? c.overall_cv_score;
  const formatInterviewScore = (score: any) => score == null ? '-' : `${Number(score).toFixed(1)}/10`;

  const list = (candidates || [])
    .slice()
    .sort((a: any, b: any) => Number(scoreForMode(b) ?? -1) - Number(scoreForMode(a) ?? -1))
    .slice(0, 3);

  const handleRemoveClick = (c: any) => {
    setSelectedCandidates(prev => prev.filter((item: any) => item.job_candidate_id !== c.job_candidate_id));
  };

  const renderCvDetails = (c: any) => {
    const sectionEntries = Object.entries(c.cv_analysis || {}).filter(([, value]: any) => value?.score != null || value?.feedback);
    const matched = c.job_match_analysis?.matched_keywords || [];
    const gaps = [
      ...(c.job_match_analysis?.missing_critical_skills || []),
      ...(c.job_match_analysis?.skill_gap_analysis || []).map((gap: any) => gap.skill || gap.explanation).filter(Boolean),
    ];

    return (
      <div className="space-y-4 flex-1">
        {c.job_alignment_score != null && <BarChart value={c.job_alignment_score} label="JOB ALIGNMENT" color="bg-[#22d3ee]" />}
        {c.overall_cv_score != null && <BarChart value={c.overall_cv_score} label="OVERALL CV" color="bg-[#d946ef]" />}

        {sectionEntries.slice(0, 5).map(([key, value]: any) => (
          <div key={key} className="p-3 bg-white/5 rounded-lg">
            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase gap-3">
              <span>{key.replace(/_/g, ' ')}</span>
              <span>{value.score != null ? `${value.score}/10` : '-'}</span>
            </div>
            {value.feedback && <p className="text-sm text-gray-300 mt-2 line-clamp-3">{value.feedback}</p>}
          </div>
        ))}

        {(c.ranking_summary || c.job_match_analysis?.match_explanation) && (
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Summary</p>
            <p className="text-sm text-gray-300">{c.ranking_summary || c.job_match_analysis.match_explanation}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <p className="text-xs font-bold text-emerald-400 uppercase mb-2">Matched Keywords</p>
            <p className="text-sm text-gray-300">{matched.length ? matched.slice(0, 8).join(', ') : 'None returned by CV service.'}</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg">
            <p className="text-xs font-bold text-amber-400 uppercase mb-2">Review Gaps</p>
            <p className="text-sm text-gray-300">{gaps.length ? gaps.slice(0, 8).join(', ') : 'None returned by CV service.'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderInterviewDetails = (c: any) => {
    const feedback = c.ai_interview_feedback || {};
    const technicalTop = feedback.technical_report?.top_section || {};
    const behavioralTop = feedback.behavioral_report?.top_section || {};
    const technicalMetrics = feedback.technical_report?.visual_metrics || {};
    const behavioralMetrics = feedback.behavioral_report?.visual_metrics || {};
    const communication = behavioralMetrics.communication || {};
    const traits = behavioralMetrics.personality_traits || {};

    const metricRows = [
      ['TECHNICAL SCORE', technicalTop.technical_score, '#22d3ee'],
      ['BEHAVIOR SCORE', behavioralTop.behavioral_score, '#d946ef'],
      ['JOB ALIGNMENT', technicalMetrics.job_alignment, '#22d3ee'],
      ['ANSWER STRUCTURE', technicalMetrics.answer_structure, '#d946ef'],
      ['PROBLEM SOLVING', technicalMetrics.problem_solving_logic, '#22d3ee'],
      ['FLUENCY', communication.fluency, '#d946ef'],
      ['CONFIDENCE', traits.confidence, '#22d3ee'],
      ['ENGAGEMENT', traits.engagement, '#d946ef'],
    ].filter(([, value]) => value != null);

    return (
      <div className="space-y-4 flex-1">
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Interview Status</p>
          <p className="text-sm text-gray-300">{c.ai_interview_score != null ? 'Completed' : `${c.status || 'Pending'} - ${c.stage || 'Not started'}`}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Interview Score</p>
          <p className="text-sm text-gray-300">{c.ai_interview_score != null ? formatInterviewScore(c.ai_interview_score) : 'No interview score saved yet.'}</p>
        </div>

        {metricRows.length > 0 && (
          <div className="space-y-3">
            {metricRows.map(([label, value, color]: any) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-1">
                  <span>{label}</span>
                  <span>{Number(value).toFixed(1)}/10</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(value) * 10))}%`, background: color }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(technicalTop.overall_summary || behavioralTop.overall_summary) && (
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Summary</p>
            {technicalTop.overall_summary && <p className="text-sm text-gray-300 mb-2">{technicalTop.overall_summary}</p>}
            {behavioralTop.overall_summary && <p className="text-sm text-gray-300">{behavioralTop.overall_summary}</p>}
          </div>
        )}

        {c.ai_interview_completed_at && (
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Completed</p>
            <p className="text-sm text-gray-300">{new Date(c.ai_interview_completed_at).toLocaleString()}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView('candidate-list')}>Back</Button>
          <h2 className="text-2xl font-bold text-white">Candidate Comparison</h2>
        </div>
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
          <button className={`px-4 py-2 rounded-md text-sm font-bold ${mode === 'cv' ? 'bg-[#22d3ee] text-white' : 'text-gray-400'}`} onClick={() => setMode('cv')}>Compare CV Scores</button>
          <button className={`px-4 py-2 rounded-md text-sm font-bold ${mode === 'interview' ? 'bg-[#d946ef] text-white' : 'text-gray-400'}`} onClick={() => setMode('interview')}>Compare Interview Scores</button>
        </div>
      </div>

      {list.length === 0 && (
        <div className="text-center text-gray-400 py-20">Select candidates from the pipeline to compare them.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {list.map((c: any, i: number) => (
          <Card key={i} className="flex flex-col gap-6">
            <div className="text-center border-b border-white/10 pb-6">
              <div className="w-20 h-20 mx-auto mb-4 flex justify-center">
                <Avatar initials={getInitials(c.name)} size="xl" />
              </div>
              <h3 className="text-xl font-bold text-white">{c.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{c.cv_filename || c.email}</p>
              <div className={`text-3xl font-bold mt-2 ${mode === 'interview' ? 'text-[#d946ef]' : 'text-[#22d3ee]'}`}>
                {mode === 'interview'
                  ? formatInterviewScore(c.ai_interview_score)
                  : scoreForMode(c) != null ? `${scoreForMode(c)}%` : '-'}
              </div>
              <p className="text-xs text-gray-500 uppercase font-bold mt-1">{mode === 'interview' ? 'AI Interview' : 'CV Screening'}</p>
            </div>

            {mode === 'interview' ? renderInterviewDetails(c) : renderCvDetails(c)}

            <div className="pt-4 border-t border-white/10 flex gap-2">
              <Button fullWidth size="sm" onClick={() => { setActiveCandidate(c); setView('ai-results'); }}>Review</Button>
              <Button variant="danger" size="sm" icon={X} onClick={() => handleRemoveClick(c)}></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CompareView;
