import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login";
import Home from "./components/Home-page";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import HrDashboard from "./components/Hr-dashboard";
import HrLogin from "./pages/HR/HrLogin";
import HrLanding from "./pages/HR/HrLanding";
import PublicAIInterviewInvite from "./pages/HR/PublicAIInterviewInvite";
import LiveInterviewRoom from "./pages/HR/LiveInterviewRoom";
import Profile from "./pages/Profile";
import InterviewHistory from "./pages/InterviewHistory";
import InterviewDetail from "./pages/InterviewDetail";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import CVAssistant from "./pages/CVAssistant";

// @ts-ignore
import Setup from "./interview_module/components/Setup";
// @ts-ignore
import Chat from "./interview_module/components/Chat";
// @ts-ignore
import FeedbackDisplay from "./interview_module/components/FeedbackDisplay";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/" /> : <>{children}</>;
};

const HrProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('hr_token');
  const isValid = token && token !== 'null' && token !== 'undefined';
  return isValid ? <>{children}</> : <Navigate to="/hr-login" />;
};

const App = () => {
  const [isWakingUp, setIsWakingUp] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const attemptAutoLogin = async () => {
      const NODE_BASE_URL = import.meta.env.VITE_NODE_URL || 'http://localhost:5000';

      try {
        const csrfRes = await fetch(`${NODE_BASE_URL}/auth/csrf`, { credentials: 'include' });
        if (!csrfRes.ok) throw new Error("Could not fetch CSRF token");
        const { csrfToken } = await csrfRes.json();

        const response = await fetch(`${NODE_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('token', data.accessToken);
        } else if (response.status === 401) {
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error("Auto-login check failed:", err);
      } finally {
        setIsWakingUp(false);
      }
    };

    attemptAutoLogin();
  }, []);

  if (isWakingUp) {
    return (
      <div className="w-full min-h-screen bg-[#11152D] text-[#2EE8F1] flex flex-col items-center justify-center font-bold text-xl">
        <svg className="animate-spin h-10 w-10 mb-4 text-[#E240CA]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Waking up CareerGenie...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <div className="relative w-full min-h-screen bg-[#0B0C1E] overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-[#22d3ee]/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-[#d946ef]/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="relative z-10 grid w-full min-h-screen place-items-center p-4">
                  <Login />
                </div>
              </div>
            </PublicRoute>
          }
        />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/hr" element={<HrLanding />} />
        <Route path="/hr-login" element={<HrLogin />} />
        <Route path="/hr-dashboard" element={<HrProtectedRoute><HrDashboard /></HrProtectedRoute>} />
        <Route path="/hr-interview/:token" element={<PublicAIInterviewInvite />} />
        <Route path="/hr-interview/session" element={<Chat />} />
        <Route path="/hr-live/:token" element={<LiveInterviewRoom role="candidate" />} />
        <Route path="/hr-live-room/:roomId" element={<HrProtectedRoute><LiveInterviewRoom role="hr" /></HrProtectedRoute>} />

        <Route path="/interview/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
        <Route path="/interview/session" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/interview/feedback" element={<ProtectedRoute><FeedbackDisplay /></ProtectedRoute>} />
        <Route path="/cv-assistant" element={<ProtectedRoute><CVAssistant /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><InterviewHistory /></ProtectedRoute>} />
        <Route path="/history/:id" element={<ProtectedRoute><InterviewDetail /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
};

export default App;
