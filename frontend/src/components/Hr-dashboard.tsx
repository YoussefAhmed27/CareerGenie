// @ts-nocheck
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const VALID_VIEWS = new Set(Object.keys(VIEW_TITLES));

const HrDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const getViewFromSearch = () => {
    const requested = new URLSearchParams(location.search).get('view') || 'dashboard';
    return VALID_VIEWS.has(requested) ? requested : 'dashboard';
  };
  const [view, setView] = useState(getViewFromSearch);
  const [activeJob, setActiveJobState] = useState<any>(() => {
    try { return JSON.parse(sessionStorage.getItem('hr_active_job') || 'null'); } catch { return null; }
  });
  const [activeCandidate, setActiveCandidateState] = useState<any>(() => {
    try { return JSON.parse(sessionStorage.getItem('hr_active_candidate') || 'null'); } catch { return null; }
  });
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  const setActiveJob = (job: any) => {
    setActiveJobState(job);
    if (job) sessionStorage.setItem('hr_active_job', JSON.stringify(job));
    else sessionStorage.removeItem('hr_active_job');
  };

  const setActiveCandidate = (candidate: any) => {
    setActiveCandidateState(candidate);
    if (candidate) sessionStorage.setItem('hr_active_candidate', JSON.stringify(candidate));
    else sessionStorage.removeItem('hr_active_candidate');
  };

  // Fetch workspace once; ordinary view transitions should not kick HR users out.
  useEffect(() => {
    const token = localStorage.getItem('hr_token');
    if (!token || token === 'null' || token === 'undefined') {
      navigate('/hr-login');
      return;
    }
    fetchWorkspace()
      .then(data => setWorkspaceName(data.workspace?.name || 'My Workspace'))
      .catch(err => {
        if (err.message?.includes('401') || err.message?.includes('Invalid')) {
          localStorage.removeItem('hr_token');
          localStorage.removeItem('hr_user');
          navigate('/hr-login');
        } else {
          setWorkspaceName('My Workspace');
          console.error('Could not load HR workspace:', err);
        }
      });
  }, []);

  // Scroll to top on view change
  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  useEffect(() => {
    const nextView = getViewFromSearch();
    if (nextView !== view) setView(nextView);
  }, [location.search]);

  const goToView = (nextView: string) => {
    const safeView = VALID_VIEWS.has(nextView) ? nextView : 'dashboard';
    setView(safeView);
    const search = safeView === 'dashboard' ? '' : `?view=${safeView}`;
    navigate(`/hr-dashboard${search}`);
  };

  const renderContent = () => {
    switch (view) {
      case 'dashboard': return <DashboardView setView={goToView} setActiveJob={setActiveJob} globalSearch={globalSearch} />;
      case 'create-job': return <CreateJobView setView={goToView} />;
      case 'candidate-list': return (
        <CandidateListView
          setView={goToView}
          activeJob={activeJob}
          selected={selectedCandidates}
          setSelected={setSelectedCandidates}
          setActiveCandidate={setActiveCandidate}
          globalSearch={globalSearch}
        />
      );
      case 'ai-schedule': return <AIScheduleView setView={goToView} selected={selectedCandidates} />;
      case 'ai-results': return <AIResultsView setView={goToView} activeCandidate={activeCandidate} activeJob={activeJob} />;
      case 'compare': return (
        <CompareView
          setView={goToView}
          candidates={selectedCandidates}
          setActiveCandidate={setActiveCandidate}
          setSelectedCandidates={setSelectedCandidates}
        />
      );
      case 'live-schedule': return <LiveScheduleView setView={goToView} activeCandidate={activeCandidate} />;
      case 'live-room': return <LiveRoomView setView={goToView} />;
      case 'hired': return <HiredView setView={goToView} activeCandidate={activeCandidate} />;
      case 'settings': return <WorkspaceSettingsView setView={goToView} />;
      default: return <DashboardView setView={goToView} setActiveJob={setActiveJob} globalSearch={globalSearch} />;
    }
  };

  // Live room: fullscreen overlay
  if (view === 'live-room') return renderContent();


  return (
    <div className="min-h-screen bg-[#0B0C1E] text-white font-sans flex">
      <Sidebar
        activeView={view}
        setView={goToView}
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
          onSettingsClick={() => goToView('settings')}
        />
        <main className="flex-1 mt-16 p-4 md:p-8 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default HrDashboard;
