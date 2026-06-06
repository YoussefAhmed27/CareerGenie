// @ts-nocheck
import React, { useState } from 'react';
import { Copy, Link, Mail } from 'lucide-react';
import { Button, Card } from '../../components/HR/HrUIComponents';
import { scheduleAIInterview } from '../../services/hrService';

const AIScheduleView = ({ setView, selected }: any) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [links, setLinks] = useState([]);
  const isRejected = (candidate: any) => candidate?.status === 'Rejected' || candidate?.stage === 'Rejected';
  const eligibleCandidates = selected.filter((candidate: any) => !isRejected(candidate) && candidate.ai_interview_score == null && !candidate.ai_interview_result_id);
  const blockedCandidates = selected.filter((candidate: any) => isRejected(candidate) || candidate.ai_interview_score != null || candidate.ai_interview_result_id);

  const handleSend = async () => {
    if (!startTime || !endTime) { setError('Please select both start and end times.'); return; }
    setLoading(true); setError('');
    try {
      const generatedLinks = [];
      for (const candidate of eligibleCandidates) {
        const candidateId = candidate.job_candidate_id || candidate;
        const result = await scheduleAIInterview(candidateId, {
          start_time: startTime,
          end_time: endTime,
          interview_mode: 'comprehensive',
        });
        generatedLinks.push({
          candidateName: candidate.name || result.candidate?.name || `Candidate ${candidateId}`,
          url: result.invitation_url,
        });
      }
      if (generatedLinks.length === 0) {
        setError('All selected candidates already completed an AI interview.');
      }
      setLinks(generatedLinks);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-10">
      <Card>
        <div className="border-b border-white/10 pb-6 mb-6">
          <h2 className="text-xl font-bold text-white">Schedule AI Interviews</h2>
          <p className="text-gray-400 text-sm">Send AI interview invitations to {eligibleCandidates.length} eligible candidate{eligibleCandidates.length === 1 ? '' : 's'}.</p>
        </div>
        {error && <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
        <div className="space-y-6">
          {blockedCandidates.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
              {blockedCandidates.length} selected candidate{blockedCandidates.length === 1 ? '' : 's'} cannot receive a new AI interview invitation.
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Availability Window</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="datetime-local" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white"
                value={startTime} onChange={e => setStartTime(e.target.value)} />
              <input type="datetime-local" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white"
                value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Candidates can complete the interview during this availability window.</p>
          </div>
          <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex gap-3">
            <Mail size={20} className="text-[#22d3ee] shrink-0" />
            <p className="text-sm text-[#22d3ee]">
              Interview invitations will be sent to candidates by email. A secure link will also be available here for follow-up if needed.
            </p>
          </div>
          {links.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase block">Interview Invitations</label>
              {links.map((item: any, index) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-bold text-white">{item.candidateName}</div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1">
                      Invitation sent
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input readOnly value={item.url} className="flex-1 bg-[#0B0C1E] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300" />
                    <Button size="sm" variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(item.url)}>Copy</Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Use the secure link if the candidate needs the invitation shared again.
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setView('candidate-list')}>Cancel</Button>
            <Button onClick={handleSend} disabled={loading || eligibleCandidates.length === 0}>{loading ? 'Sending...' : 'Send Invitations'}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIScheduleView;
