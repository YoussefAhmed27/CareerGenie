// @ts-nocheck
import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button, Card } from '../../components/HR/HrUIComponents';

export const LiveScheduleView = ({ setView }: any) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  return (
    <div className="max-w-2xl mx-auto pt-10">
      <Card>
        <div className="border-b border-white/10 pb-6 mb-6">
          <h2 className="text-xl font-bold text-white">Schedule Final Round</h2>
          <p className="text-gray-400 text-sm">Send a live interview invite to the candidate.</p>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Date</label>
              <input type="date" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white"
                value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Time</label>
              <input type="time" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white"
                value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex gap-3">
            <Mail size={20} className="text-[#22d3ee] shrink-0" />
            <p className="text-sm text-[#22d3ee]">Secure video link will be emailed to the candidate.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setView('ai-results')}>Cancel</Button>
            <Button onClick={() => setView('live-room')}>Send Invite</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const LiveRoomView = ({ setView }: any) => {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  return (
    <div className="fixed inset-0 bg-[#0B0C1E] z-[100] flex flex-col h-[100dvh]">
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-white text-sm font-bold">Live Interview</span>
          </div>
          <span className="bg-red-500/20 px-2 py-0.5 rounded text-xs text-red-200 border border-red-500/30 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> REC
          </span>
        </div>
      </div>

      <div className="flex-1 relative w-full bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 text-lg font-bold">Candidate Video Feed</div>
        <div className="absolute bottom-6 left-6 w-48 h-32 md:w-64 md:h-40 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-40 flex items-center justify-center text-gray-500 text-sm">
          You
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#151632]/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-full flex items-center gap-4 shadow-2xl z-50">
          <button onClick={() => setMicOn(!micOn)}
            className={`p-4 rounded-full transition-all text-white ${micOn ? 'bg-white/5 hover:bg-white/20' : 'bg-red-500/30'}`}>
            🎤
          </button>
          <button onClick={() => setVideoOn(!videoOn)}
            className={`p-4 rounded-full transition-all text-white ${videoOn ? 'bg-white/5 hover:bg-white/20' : 'bg-red-500/30'}`}>
            📷
          </button>
          <button className="p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all">🖥️</button>
          <button className="p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all">💬</button>
          <div className="w-px h-8 bg-white/10 mx-2"></div>
          <button onClick={() => setView('candidate-list')}
            className="px-8 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold whitespace-nowrap shadow-lg shadow-red-500/20 transition-all hover:scale-105">
            End Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export const HiredView = ({ setView, activeCandidate }: any) => (
  <div className="h-full flex items-center justify-center p-4 mt-20">
    <div className="bg-[#151632]/80 backdrop-blur-xl border border-white/10 rounded-xl p-8 md:p-12 max-w-lg w-full text-center border-[#22d3ee]/30">
      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <span className="text-5xl">✓</span>
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Candidate Hired!</h2>
      <p className="text-gray-400 mb-8">
        <strong className="text-white">{activeCandidate?.name || 'The candidate'}</strong> has been marked as hired.<br />
        Job opening marked as <strong className="text-[#22d3ee]">Completed</strong>.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="ghost" fullWidth onClick={() => setView('dashboard')}>Back to Dashboard</Button>
        <Button fullWidth onClick={() => setView('create-job')}>Post New Job</Button>
      </div>
    </div>
  </div>
);
