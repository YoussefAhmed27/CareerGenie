// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'lucide-react';
import { Button, Card } from '../../components/HR/HrUIComponents';
import { scheduleAIInterview } from '../../services/hrService';

const AIScheduleView = ({ setView, selected }: any) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!startTime || !endTime) { setError('Please select both start and end times.'); return; }
    setLoading(true); setError('');
    try {
      for (const id of selected) {
        await scheduleAIInterview(id, { start_time: startTime, end_time: endTime });
      }
      setView('candidate-list');
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
          <p className="text-gray-400 text-sm">Send autonomous interview links to {selected.length} candidates.</p>
        </div>
        {error && <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Availability Window</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="datetime-local" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white"
                value={startTime} onChange={e => setStartTime(e.target.value)} />
              <input type="datetime-local" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white"
                value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Candidates must complete the interview within this timeframe.</p>
          </div>
          <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex gap-3">
            <Link size={20} className="text-[#22d3ee] shrink-0" />
            <p className="text-sm text-[#22d3ee]">Unique secure links will be generated and emailed automatically.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setView('candidate-list')}>Cancel</Button>
            <Button onClick={handleSend} disabled={loading}>{loading ? 'Sending...' : 'Generate & Send'}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIScheduleView;
