// @ts-nocheck
import React from 'react';
import { ArrowLeft, X, Download, Play, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Card, Avatar, RadarChart, BarChart } from '../../components/HR/HrUIComponents';
import { updateCandidate } from '../../services/hrService';

const AIResultsView = ({ setView, activeCandidate }: any) => {
  const c = activeCandidate;
  const metrics = c?.metrics || {};

  const handleReject = async () => {
    if (c) await updateCandidate(c.job_candidate_id, { status: 'Rejected', stage: c.stage });
    setView('candidate-list');
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView('candidate-list')}>Back to Pipeline</Button>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="danger" icon={X} onClick={handleReject} className="flex-1 sm:flex-none">Reject</Button>
          <Button icon={Calendar} onClick={() => setView('live-schedule')} className="flex-1 sm:flex-none">Schedule Live</Button>
        </div>
      </div>

      {/* Video placeholder */}
      <Card noPadding className="overflow-hidden relative aspect-video md:aspect-[21/9] bg-gray-900 group shrink-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:scale-110 transition-transform">
            <Play size={32} fill="currentColor" className="ml-1" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black to-transparent">
          <h3 className="text-white text-xl font-bold">Interview Recording — {c?.name || 'Candidate'}</h3>
          <p className="text-gray-400">AI Interview · {c ? new Date(c.created_at).toLocaleDateString() : ''}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <h3 className="text-xl font-bold text-white mb-6">Detailed Feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="flex justify-center"><RadarChart /></div>
              <div className="space-y-4">
                <BarChart value={metrics.tech ?? 0} label="TECHNICAL PROFICIENCY" color="bg-[#22d3ee]" />
                <BarChart value={metrics.comm ?? 0} label="COMMUNICATION" color="bg-[#d946ef]" />
                <BarChart value={metrics.culture ?? 0} label="CULTURAL FIT" color="bg-emerald-400" />
                <BarChart value={metrics.confidence ?? 0} label="CONFIDENCE" color="bg-amber-400" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><CheckCircle size={16} /> Strengths</h4>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li>Strong domain knowledge and technical depth.</li>
                  <li>Clear and structured communication style.</li>
                  <li>High engagement score throughout the session.</li>
                </ul>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2"><AlertCircle size={16} /> Areas for Improvement</h4>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li>Speaking pace could be slowed for clarity.</li>
                  <li>Could provide more concrete examples for behavioral questions.</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card className="sticky top-24">
            <div className="text-center mb-6">
              <div className="w-32 h-32 rounded-full border-8 border-[#22d3ee] flex items-center justify-center mx-auto mb-4">
                {c ? <Avatar initials={getInitials(c.name)} size="xl" /> : <span className="text-4xl font-bold text-white">—</span>}
              </div>
              <p className="font-bold text-white text-lg">{c?.name}</p>
              <div className="text-4xl font-bold text-[#22d3ee] mt-2">{c?.score != null ? `${c.score}%` : '—'}</div>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mt-1">Overall Match</p>
            </div>
            <div className="space-y-4">
              <Button fullWidth onClick={() => setView('live-schedule')}>Proceed to Final Round</Button>
              <Button fullWidth variant="secondary" icon={Download}>Download Full Report</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIResultsView;
