// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, ChevronDown } from 'lucide-react';
import { Button, Card } from '../../components/HR/HrUIComponents';
import { fetchWorkspaceInvitation, loginHr, registerHr } from '../../services/hrService';

const HrLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    position: ''
  });

  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    setIsLogin(false);
    fetchWorkspaceInvitation(inviteToken)
      .then((payload) => {
        const invitation = payload.invitation;
        setInvite(invitation);
        setFormData((current) => ({
          ...current,
          email: invitation.email || current.email,
          full_name: invitation.full_name || current.full_name,
          position: invitation.position || current.position,
        }));
      })
      .catch((err) => setError(err.message || 'This invitation is no longer available.'))
      .finally(() => setInviteLoading(false));
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await loginHr({ email: formData.email, password: formData.password });
      } else {
        await registerHr({ ...formData, invite_token: inviteToken || undefined });
      }
      navigate('/hr-dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C1E] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-[#22d3ee]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-[#d946ef]/10 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-lg relative z-10 p-7 sm:p-9 border border-white/10 shadow-2xl shadow-black/30">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-5">
            <img src="/logo.png" alt="careerGenie logo" className="w-40 sm:w-48 object-contain" />
            <span className="text-xs font-bold text-gray-400 border border-white/10 rounded-full px-2 py-0.5 uppercase tracking-widest">HR</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {isLogin ? 'Recruiter Login' : invite ? 'Accept Workspace Invitation' : 'Create HR Account'}
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            {isLogin
              ? 'Access your workspace and hiring pipeline.'
              : invite
                ? `Join ${invite.company_name || invite.workspace_name || 'your workspace'} on CareerGenie.`
                : 'Create or join your company workspace using your business email.'}
          </p>
        </div>

        {inviteLoading && (
          <div className="mb-6 p-4 bg-[#22d3ee]/10 border border-[#22d3ee]/20 rounded-xl text-[#22d3ee] text-sm">
            Loading your workspace invitation...
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
            <div className="shrink-0 mt-0.5 font-bold">!</div>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    required
                    type="text"
                    placeholder="Full name"
                    disabled={Boolean(invite?.full_name)}
                    className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-12 py-3.5 text-white focus:border-[#22d3ee] outline-none transition-all"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Position in Company</label>
                <div className="relative">
                  <select
                    required
                    disabled={Boolean(invite?.position)}
                    className="w-full appearance-none bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3.5 pr-11 text-gray-200 focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/10 outline-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                  >
                    <option className="bg-[#0B0C1E] text-gray-400" value="" disabled>Select your position</option>
                    <option className="bg-[#0B0C1E] text-gray-100" value="HR Manager">HR Manager</option>
                    <option className="bg-[#0B0C1E] text-gray-100" value="Recruiter">Recruiter</option>
                    <option className="bg-[#0B0C1E] text-gray-100" value="Technical Recruiter">Technical Recruiter</option>
                    <option className="bg-[#0B0C1E] text-gray-100" value="Team Lead">Team Lead</option>
                    <option className="bg-[#0B0C1E] text-gray-100" value="Hiring Manager">Hiring Manager</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Business Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                required
                type="email"
                placeholder="name@company.com"
                disabled={Boolean(invite?.email)}
                className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-12 py-3.5 text-white focus:border-[#22d3ee] outline-none transition-all"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-12 py-3.5 text-white focus:border-[#22d3ee] outline-none transition-all"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <Button 
            fullWidth 
            size="lg" 
            disabled={loading}
            className="mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? 'Sign In' : invite ? 'Accept Invitation' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-gray-400 text-sm">
            {invite ? 'Already have access?' : isLogin ? "Don't have an HR account?" : "Already have an HR account?"}
            {invite ? (
              <button
                onClick={() => navigate('/hr-login')}
                className="ml-2 text-[#22d3ee] font-bold hover:underline"
              >
                Sign in
              </button>
            ) : (
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-[#22d3ee] font-bold hover:underline"
              >
                {isLogin ? 'Register now' : 'Log in instead'}
              </button>
            )}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default HrLogin;
