import React, { useEffect, useState, useRef } from 'react'; 
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// ── COMPONENTS ──
import Login from "./components/Login";
import Home from "./components/Home-page";
import HrDashboard from "./components/Hr-dashboard";
// @ts-ignore
import Setup from "./interview_module/components/Setup";
// @ts-ignore
import Chat from "./interview_module/components/Chat";
// @ts-ignore
import FeedbackDisplay from "./interview_module/components/FeedbackDisplay";

// ── AUTH GUARDS ──
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token'); 
  return token ? <>{children}</> : <Navigate to="/login" />; 
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/" /> : <>{children}</>;
};

const App = () => {
  const [isWakingUp, setIsWakingUp] = useState(true);
  const hasFetched = useRef(false); // <-- THIS FIXES THE RANDOM LOGOUTS

  // ── AUTO-LOGIN VERIFICATION ──
  useEffect(() => {
    // Prevent React Strict Mode from double-firing and killing the refresh token
    if (hasFetched.current) return;
    hasFetched.current = true;

    const attemptAutoLogin = async () => {
      try {
        const csrfRes = await fetch('/auth/csrf', { credentials: 'include' });
        if (!csrfRes.ok) throw new Error("Could not fetch CSRF token");
        const { csrfToken } = await csrfRes.json();

        const response = await fetch('/auth/refresh', {
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
              <div className="relative w-full min-h-screen">
                <div className="absolute inset-0 bg-[url('/Login.png')] bg-cover bg-center">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-xs"></div>
                </div>
                <div className="relative z-10 grid w-full min-h-screen place-items-center p-4">
                  <Login />
                </div>
              </div>
            </PublicRoute>
          }
        />

        <Route path="/hr-dashboard" element={<ProtectedRoute><HrDashboard /></ProtectedRoute>} />
        <Route path="/interview/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
        <Route path="/interview/session" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/interview/feedback" element={<ProtectedRoute><FeedbackDisplay /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
};

export default App;