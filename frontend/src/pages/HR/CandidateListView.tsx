// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Upload, RefreshCw, Zap, BarChart2, CheckCircle, Lock, Trash2 } from 'lucide-react';
import { Button, Card, Badge, Avatar } from '../../components/HR/HrUIComponents';
import { fetchCandidates, deleteCandidate, hireCandidate, uploadCVs } from '../../services/hrService';

const CandidateListView = ({ setView, activeJob, selected, setSelected, setActiveCandidate, globalSearch = '' }: any) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isClosedJob = activeJob?.status === 'Closed';

  useEffect(() => {
    if (!activeJob) return;
    setSelected([]);
    fetchCandidates(activeJob.job_id)
      .then(setCandidates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeJob]);

  const isSelected = (cand: any) =>
    selected.some((c: any) => c.job_candidate_id === cand.job_candidate_id);

  const isRejected = (cand: any) => cand?.status === 'Rejected' || cand?.stage === 'Rejected';

  const toggleSelect = (cand: any) => {
    if (isClosedJob || isRejected(cand)) return;
    if (isSelected(cand)) {
      setSelected(selected.filter((c: any) => c.job_candidate_id !== cand.job_candidate_id));
    } else {
      setSelected([...selected, cand]);
    }
  };

  const handleHire = async () => {
    if (isClosedJob) return;
    try {
      if (selected[0]) setActiveCandidate(selected[0]);
      for (const cand of selected) await hireCandidate(cand.job_candidate_id);
      setView('hired');
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (candidate: any) => {
    if (isClosedJob) return;
    const id = candidate.job_candidate_id;
    await deleteCandidate(id);
    setCandidates(prev => prev.filter(c => c.job_candidate_id !== id));
    setSelected(selected.filter((c: any) => c.job_candidate_id !== id));
  };

  const handleUploadClick = () => {
    if (isClosedJob) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('cvs', files[i]);
    }

    try {
      const uploadResult = await uploadCVs(activeJob.job_id, formData);
      const freshCandidates = await fetchCandidates(activeJob.job_id);
      setCandidates(freshCandidates);
      if (uploadResult?.errors?.length) {
        alert(`${uploadResult.candidates?.length || 0} CVs analyzed. ${uploadResult.errors.length} could not be processed. Please review the uploaded files and try again.`);
      }
    } catch (err) {
      console.error("Failed to upload CVs:", err);
      alert("Failed to parse and upload CVs. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const formatInterviewScore = (score: any) => score == null ? '-' : `${Number(score).toFixed(1)}/10`;
  const eligibleForAiInvite = selected.filter((c: any) =>
    !isRejected(c) &&
    c.ai_interview_score == null &&
    !c.ai_interview_result_id
  );

  const filteredCandidates = candidates.filter(c => {
    const query = globalSearch.toLowerCase();
    return !query ||
      c.name?.toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.stage || '').toLowerCase().includes(query) ||
      (c.status || '').toLowerCase().includes(query);
  }).sort((a: any, b: any) => {
    const aHasInterview = a.ai_interview_score != null;
    const bHasInterview = b.ai_interview_score != null;
    const aRejected = a.status === 'Rejected';
    const bRejected = b.status === 'Rejected';
    if (aRejected !== bRejected) return aRejected ? 1 : -1;
    if (aHasInterview !== bHasInterview) return aHasInterview ? -1 : 1;
    if (aHasInterview && bHasInterview) return Number(b.ai_interview_score) - Number(a.ai_interview_score);
    return Number(b.score ?? -1) - Number(a.score ?? -1);
  });

  if (!activeJob) return <div className="text-gray-400 text-center py-20">No job selected.</div>;
  if (loading) return <div className="text-gray-400 text-center py-20">Loading candidates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Briefcase size={14} /><span>{activeJob.title}</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Candidate Pipeline</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            multiple
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            icon={uploading ? RefreshCw : Upload}
            className={`flex-1 md:flex-none ${uploading ? 'animate-pulse' : ''}`}
            onClick={handleUploadClick}
            disabled={uploading || isClosedJob}
          >
            {isClosedJob ? 'Job Closed' : uploading ? 'Screening CVs...' : 'Upload CVs'}
          </Button>
        </div>
      </div>

      {isClosedJob && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-sm text-amber-200">
          This opening is closed because a candidate was hired. Candidate records are read-only until the job is reopened.
        </div>
      )}

      {uploading && (
        <div className="bg-[#22d3ee]/5 border border-[#22d3ee]/20 p-6 rounded-xl flex items-center justify-center gap-4 animate-pulse">
          <RefreshCw size={24} className="text-[#22d3ee] animate-spin" />
          <div>
            <h4 className="text-[#22d3ee] font-bold">CV Screening in Progress</h4>
            <p className="text-xs text-gray-400 mt-1">Analyzing uploaded CVs against the job opening requirements.</p>
          </div>
        </div>
      )}

      {selected.length > 0 && !isClosedJob && (
        <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[#22d3ee] font-bold">{selected.length} candidates selected</span>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button size="sm" variant="success" icon={CheckCircle} onClick={handleHire}>Hire Selected</Button>
            <Button size="sm" icon={Zap} onClick={() => setView('ai-schedule')} disabled={eligibleForAiInvite.length === 0} fullWidth>
              Send AI Invite{eligibleForAiInvite.length !== selected.length ? ` (${eligibleForAiInvite.length})` : ''}
            </Button>
            <Button size="sm" variant="secondary" icon={BarChart2} onClick={() => setView('compare')} fullWidth>Compare</Button>
          </div>
        </div>
      )}

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#151632] text-xs font-bold text-gray-500 uppercase border-b border-white/5">
              <tr>
                <th className="px-6 py-3 w-12">
                  {!isClosedJob && (
                    <input
                      type="checkbox"
                      checked={filteredCandidates.filter(c => !isRejected(c)).length > 0 && filteredCandidates.filter(c => !isRejected(c)).every(c => isSelected(c))}
                      onChange={() => {
                        const selectableCandidates = filteredCandidates.filter(c => !isRejected(c));
                        if (selectableCandidates.every(c => isSelected(c))) {
                          setSelected(selected.filter((s: any) => !filteredCandidates.some(c => c.job_candidate_id === s.job_candidate_id)));
                        } else {
                          const newSelection = [...selected];
                          selectableCandidates.forEach(c => {
                            if (!newSelection.some(s => s.job_candidate_id === c.job_candidate_id)) {
                              newSelection.push(c);
                            }
                          });
                          setSelected(newSelection);
                        }
                      }}
                      className="rounded bg-[#0B0C1E] border-white/20 cursor-pointer"
                    />
                  )}
                </th>
                <th className="px-6 py-3">Candidate</th>
                <th className="px-6 py-3">Scores</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    {candidates.length === 0 ? "No candidates yet for this job." : "No matching candidates found."}
                  </td>
                </tr>
              )}
              {filteredCandidates.map(c => {
                const rejected = isRejected(c);
                return (
                <tr key={c.job_candidate_id} className={`transition-colors ${rejected ? 'bg-red-500/[0.03] opacity-70' : 'hover:bg-white/5'} ${isSelected(c) ? 'bg-white/5' : ''}`}>
                  <td className="px-6 py-4">
                    {!isClosedJob && !rejected && (
                      <input type="checkbox" checked={isSelected(c)}
                        onChange={() => toggleSelect(c)}
                        className="rounded bg-[#0B0C1E] border-white/20 cursor-pointer" />
                    )}
                    {rejected && <Lock size={15} className="text-red-300" />}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <Avatar initials={getInitials(c.name)} />
                      <div>
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.cv_filename || c.email || activeJob.title}</div>
                        {c.ranking_summary && (
                          <div className="text-xs text-gray-400 mt-1 max-w-md line-clamp-2">{c.ranking_summary}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {c.ai_interview_score != null ? (
                      <div>
                        <div className="text-lg font-bold text-[#d946ef]">{formatInterviewScore(c.ai_interview_score)}</div>
                        <div className="text-xs text-gray-500">Interview</div>
                        <div className="text-xs text-gray-400 mt-1">CV: {c.score != null ? `${c.score}%` : '-'}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-lg font-bold text-[#22d3ee]">{c.score != null ? `${c.score}%` : '-'}</div>
                        <div className="text-xs text-gray-500">CV</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4"><Badge status={c.status}>{c.stage}</Badge></td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}<br />
                    <span className="text-xs text-gray-600">{c.source}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setActiveCandidate(c); setView('ai-results'); }}>Review</Button>
                      {!isClosedJob && (
                        <button
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove candidate"
                          onClick={() => handleDelete(c)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CandidateListView;
