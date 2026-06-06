// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, PhoneOff, RefreshCw, Video } from 'lucide-react';
import { Button, Card, Badge } from '../../components/HR/HrUIComponents';
import {
  endLiveInterviewRoom,
  fetchLiveInterviewRoom,
  fetchPublicLiveInterviewRoom,
  startLiveInterviewRoom,
} from '../../services/hrService';

const LiveInterviewRoom = ({ role }: { role: 'hr' | 'candidate' }) => {
  const { roomId, token } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  const isHr = role === 'hr';
  const roomEmbedUrl = isHr ? room?.whereby_host_room_url : room?.whereby_room_url;
  const canEnterWhereby = room?.status === 'active' && roomEmbedUrl;

  const loadRoom = async () => {
    try {
      const payload = isHr
        ? await fetchLiveInterviewRoom(roomId)
        : await fetchPublicLiveInterviewRoom(token);
      setRoom(payload.room);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load live interview room.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
  }, [roomId, token, role]);

  useEffect(() => {
    if (isHr || room?.status !== 'scheduled') return;
    const interval = window.setInterval(loadRoom, 3000);
    return () => window.clearInterval(interval);
  }, [isHr, room?.status]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const payload = await startLiveInterviewRoom(roomId);
      setRoom(payload.room);
    } catch (err) {
      setError(err.message || 'Could not start live interview.');
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!isHr) {
      navigate('/');
      return;
    }

    setEnding(true);
    try {
      const payload = await endLiveInterviewRoom(roomId);
      setRoom(payload.room);
    } catch (err) {
      setError(err.message || 'Could not end live interview.');
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0B0C1E] text-gray-400 grid place-items-center">Loading live interview...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0C1E] text-white grid place-items-center p-6">
        <Card className="max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold mb-3">Live room unavailable</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button variant="secondary" onClick={() => isHr ? navigate('/hr-dashboard?view=live-schedule') : navigate('/')}>Go Back</Button>
        </Card>
      </div>
    );
  }

  if (!isHr && room?.status === 'scheduled') {
    return (
      <div className="min-h-screen bg-[#0B0C1E] text-white grid place-items-center p-6">
        <Card className="max-w-xl w-full text-center">
          <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-[#22d3ee]/10 text-[#22d3ee] grid place-items-center">
            <RefreshCw className="animate-spin" size={24} />
          </div>
          <Badge status="scheduled">Scheduled</Badge>
          <h1 className="text-2xl font-bold mt-4 mb-3">{room.job_title}</h1>
          <p className="text-gray-400">
            Your live interview room will open once the HR interviewer starts the session.
          </p>
        </Card>
      </div>
    );
  }

  if (room?.status === 'ended') {
    return (
      <div className="min-h-screen bg-[#0B0C1E] text-white grid place-items-center p-6">
        <Card className="max-w-xl w-full text-center">
          <Badge status="ended">Ended</Badge>
          <h1 className="text-2xl font-bold mt-4 mb-3">Live interview ended</h1>
          <p className="text-gray-400 mb-6">Thank you. The hiring team will follow up regarding next steps.</p>
          <Button variant="secondary" onClick={() => isHr ? navigate('/hr-dashboard?view=live-schedule') : navigate('/')}>Close</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070817] text-white flex flex-col">
      <header className="h-16 px-4 md:px-6 border-b border-white/10 bg-[#0B0C1E] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {isHr && (
            <button className="p-2 text-gray-400 hover:text-white" onClick={() => navigate('/hr-dashboard?view=live-schedule')}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="h-10 w-10 rounded-full bg-[#22d3ee]/10 text-[#22d3ee] grid place-items-center shrink-0">
            <Video size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase text-gray-500 font-bold">Whereby Live Interview</p>
            <h1 className="font-bold truncate">{room?.candidate_name} - {room?.job_title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge status={room?.status}>{room?.status}</Badge>
          {isHr && room?.status === 'scheduled' && (
            <Button size="sm" onClick={handleStart} disabled={starting}>{starting ? 'Starting...' : 'Start Room'}</Button>
          )}
          {canEnterWhereby && (
            <a href={roomEmbedUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary" icon={ExternalLink}>Open Whereby</Button>
            </a>
          )}
          {canEnterWhereby && (
            <Button size="sm" variant="danger" icon={PhoneOff} onClick={handleEnd} disabled={ending}>
              {isHr ? ending ? 'Ending...' : 'End' : 'Leave'}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 bg-black">
        {canEnterWhereby ? (
          <iframe
            src={roomEmbedUrl}
            title="Whereby live interview"
            allow="camera; microphone; fullscreen; speaker"
            className="w-full h-[calc(100vh-4rem)] border-0"
          />
        ) : (
          <div className="h-[calc(100vh-4rem)] grid place-items-center p-6">
            <Card className="max-w-lg w-full text-center">
              <Badge status={room?.status}>{room?.status}</Badge>
              <h2 className="text-2xl font-bold mt-4 mb-3">Room is ready to start</h2>
              <p className="text-gray-400 mb-6">
                Start the room when HR and the candidate are ready. Whereby will handle camera, mic, mute, camera toggle, and call controls.
              </p>
              {isHr && <Button onClick={handleStart} disabled={starting}>{starting ? 'Starting...' : 'Start Room'}</Button>}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveInterviewRoom;
