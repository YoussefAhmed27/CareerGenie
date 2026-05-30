// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar } from './HR/HrLayout';
import HrLanding from '../pages/HR/HrLanding';
import DashboardView from '../pages/HR/DashboardView';
import CreateJobView from '../pages/HR/CreateJobView';
import CandidateListView from '../pages/HR/CandidateListView';
import AIScheduleView from '../pages/HR/AIScheduleView';
import AIResultsView from '../pages/HR/AIResultsView';
import CompareView from '../pages/HR/CompareView';
import WorkspaceSettingsView from '../pages/HR/WorkspaceSettingsView';
import { LiveScheduleView, LiveRoomView, HiredView } from '../pages/HR/LiveViews';
import { fetchWorkspace } from '../services/hrService';

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  'create-job': 'Post Job',
  'candidate-list': 'Pipeline',
  'ai-schedule': 'AI Schedule',
  'ai-results': 'AI Results',
  compare: 'Compare Candidates',
  'live-schedule': 'Schedule Live',
  'live-room': 'Live Interview',
  hired: 'Hired',
  settings: 'Workspace',
};

const HrDashboard = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');
  const [activeJob, setActiveJob] = useState<any>(null);
  const [activeCandidate, setActiveCandidate] = useState<any>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  // Fetch workspace name when view changes (except live room)
  useEffect(() => {
    const token = localStorage.getItem('hr_token');
    if (!token || token === 'null' || token === 'undefined') {
      navigate('/hr-login');
      return;
    }
    if (view !== 'live-room') {
      fetchWorkspace()
        .then(data => setWorkspaceName(data.workspace?.name || 'My Workspace'))
        .catch(err => {
          // Token invalid or expired → back to login
          if (err.message?.includes('401') || err.message?.includes('Invalid')) {
            localStorage.removeItem('hr_token');
            localStorage.removeItem('hr_user');
            navigate('/hr-login');
          }
        });
    }
  }, [view]);

  // Scroll to top on view change
  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  const renderContent = () => {
    switch (view) {
      case 'dashboard': return <DashboardView setView={setView} setActiveJob={setActiveJob} globalSearch={globalSearch} />;
      case 'create-job': return <CreateJobView setView={setView} />;
      case 'candidate-list': return (
        <CandidateListView
          setView={setView}
          activeJob={activeJob}
          selected={selectedCandidates}
          setSelected={setSelectedCandidates}
          setActiveCandidate={setActiveCandidate}
          globalSearch={globalSearch}
        />
      );
      case 'ai-schedule': return <AIScheduleView setView={setView} selected={selectedCandidates} />;
      case 'ai-results': return <AIResultsView setView={setView} activeCandidate={activeCandidate} />;
      case 'compare': return (
        <CompareView
          setView={setView}
          candidates={selectedCandidates}
          setActiveCandidate={setActiveCandidate}
          setSelectedCandidates={setSelectedCandidates}
        />
      );
      case 'live-schedule': return <LiveScheduleView setView={setView} />;
      case 'live-room': return <LiveRoomView setView={setView} />;
      case 'hired': return <HiredView setView={setView} activeCandidate={activeCandidate} />;
      case 'settings': return <WorkspaceSettingsView setView={setView} />;
      default: return <DashboardView setView={setView} setActiveJob={setActiveJob} globalSearch={globalSearch} />;
    }
  };

  // Live room: fullscreen overlay
  if (view === 'live-room') return renderContent();


  return (
    <div className="min-h-screen bg-[#0B0C1E] text-white font-sans flex">
      <Sidebar
        activeView={view}
        setView={setView}
        isMobileOpen={mobileMenuOpen}
        setIsMobileOpen={setMobileMenuOpen}
        workspaceName={workspaceName}
      />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        <Topbar
          title={VIEW_TITLES[view] || view}
          onMenuClick={() => setMobileMenuOpen(true)}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          onSettingsClick={() => setView('settings')}
        />
        <main className="flex-1 mt-16 p-4 md:p-8 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default HrDashboard;