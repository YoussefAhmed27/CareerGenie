// @ts-nocheck
import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button, Card, Avatar, BarChart } from '../../components/HR/HrUIComponents';

const CompareView = ({ setView, candidates, setActiveCandidate, setSelectedCandidates }: any) => {
  const list = (candidates || []).slice(0, 3);
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const handleInterviewClick = (c: any) => {
    setActiveCandidate(c);
    setView('live-schedule');
  };

  const handleRemoveClick = (c: any) => {
    setSelectedCandidates(prev => prev.filter((item: any) => item.job_candidate_id !== c.job_candidate_id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView('candidate-list')}>Back</Button>
        <h2 className="text-2xl font-bold text-white">Candidate Comparison</h2>
      </div>
      {list.length === 0 && (
        <div className="text-center text-gray-400 py-20">Select candidates from the pipeline to compare them.</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {list.map((c: any, i: number) => {
          const m = c.metrics || {};
          return (
            <Card key={i} className="flex flex-col gap-6">
              <div className="text-center border-b border-white/10 pb-6">
                <div className="w-20 h-20 mx-auto mb-4 flex justify-center">
                  <Avatar initials={getInitials(c.name)} size="xl" />
                </div>
                <h3 className="text-xl font-bold text-white">{c.name}</h3>
                <div className="text-3xl font-bold text-[#22d3ee] mt-2">{c.score != null ? `${c.score}%` : '—'}</div>
              </div>
              <div className="space-y-4 flex-1">
                <BarChart value={m.tech ?? 0} label="TECHNICAL" color="bg-[#22d3ee]" />
                <BarChart value={m.comm ?? 0} label="COMMUNICATION" color="bg-[#d946ef]" />
                <BarChart value={m.culture ?? 0} label="CULTURE FIT" color="bg-emerald-400" />
                <div className="p-3 bg-white/5 rounded-lg mt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Stage</p>
                  <p className="text-sm text-gray-300">{c.stage}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 flex gap-2">
                <Button fullWidth size="sm" onClick={() => handleInterviewClick(c)}>Interview</Button>
                <Button variant="danger" size="sm" icon={X} onClick={() => handleRemoveClick(c)}></Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CompareView;
