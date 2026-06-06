// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Copy, ExternalLink, Mail, RefreshCw, Video } from 'lucide-react';
import { Button, Card, Badge } from '../../components/HR/HrUIComponents';
import {
  createLiveInterviewRoom,
  endLiveInterviewRoom,
  fetchLiveInterviewRooms,
  startLiveInterviewRoom,
} from '../../services/hrService';

const formatDateTime = (value: string) => {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleString();
};

export const LiveScheduleView = ({ setView, activeCandidate }: any) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadRooms = async () => {
    try {
      const rows = await fetchLiveInterviewRooms();
      setRooms(rows);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load live interviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreate = async () => {
    if (!activeCandidate?.job_candidate_id) {
      setError('Open a candidate review first, then schedule a live interview.');
      return;
    }

    setCreating(true);
    try {
      await createLiveInterviewRoom(activeCandidate.job_candidate_id, {
        scheduled_at: scheduledAt || null,
      });
      setScheduledAt('');
      await loadRooms();
    } catch (err) {
      setError(err.message || 'Could not create live interview room.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  const handleStart = async (roomId: number) => {
    await startLiveInterviewRoom(roomId);
    navigate(`/hr-live-room/${roomId}`);
  };

  const handleEnd = async (roomId: number) => {
    await endLiveInterviewRoom(roomId);
    await loadRooms();
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Video size={16} />
              <span>Live Interview</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Live Interview Schedule</h2>
            <p className="text-gray-400 mt-2">
              Schedule a one-on-one video interview and send the candidate a secure invitation link.
            </p>
            {activeCandidate && (
              <p className="text-sm text-[#22d3ee] mt-3">
                Selected candidate: <strong>{activeCandidate.name}</strong>
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white outline-none"
            />
            <Button icon={Calendar} onClick={handleCreate} disabled={creating || !activeCandidate}>
              {creating ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </div>
        </div>
        <div className="mt-5 bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex gap-3">
          <Mail size={18} className="text-[#22d3ee] shrink-0 mt-0.5" />
          <p className="text-sm text-[#22d3ee]">
            Candidates receive their invitation by email. A secure link remains available if the invitation needs to be shared again.
          </p>
        </div>
        {error && <p className="text-sm text-red-300 mt-4">{error}</p>}
      </Card>

      <Card noPadding>
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white">Scheduled Live Interviews</h3>
          <button className="text-gray-400 hover:text-white" onClick={loadRooms} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading live interviews...</div>
        ) : rooms.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No live interviews scheduled yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {rooms.map((room) => (
              <div key={room.room_id} className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h4 className="font-bold text-white">{room.candidate_name}</h4>
                    <Badge status={room.status}>{room.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-400">{room.job_title}</p>
                  <p className="text-xs text-gray-500 mt-1">Scheduled: {formatDateTime(room.scheduled_at)}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-xl">{room.room_url}</p>
                  <p className="text-xs text-emerald-300 mt-2">Invitation sent to candidate.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={Copy} onClick={() => handleCopy(room.room_url)}>Copy Link</Button>
                  {room.status !== 'ended' && (
                    <Button size="sm" icon={ExternalLink} onClick={() => handleStart(room.room_id)}>
                      {room.status === 'active' ? 'Open Room' : 'Start Room'}
                    </Button>
                  )}
                  {room.status !== 'ended' && (
                    <Button size="sm" variant="danger" onClick={() => handleEnd(room.room_id)}>End</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export const LiveRoomView = () => null;

export const HiredView = ({ setView, activeCandidate }: any) => (
  <div className="h-full flex items-center justify-center p-4 mt-20">
    <div className="bg-[#151632]/80 backdrop-blur-xl border border-white/10 rounded-xl p-8 md:p-12 max-w-lg w-full text-center border-[#22d3ee]/30">
      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <span className="text-2xl font-bold">OK</span>
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Candidate Hired!</h2>
      <p className="text-gray-400 mb-8">
        <strong className="text-white">{activeCandidate?.name || 'The candidate'}</strong> has been marked as hired.<br />
        This job opening is now <strong className="text-[#22d3ee]">Closed</strong>.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="ghost" fullWidth onClick={() => setView('dashboard')}>Back to Dashboard</Button>
        <Button fullWidth onClick={() => setView('create-job')}>Post New Job</Button>
      </div>
    </div>
  </div>
);
