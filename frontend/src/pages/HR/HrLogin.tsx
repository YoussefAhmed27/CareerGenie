// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { Button, Card } from '../../components/HR/HrUIComponents';
import { loginHr, registerHr } from '../../services/hrService';

const HrLogin = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    position: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await loginHr({ email: formData.email, password: formData.password });
      } else {
        await registerHr(formData);
      }
      navigate('/hr-dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C1E] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-[#22d3ee]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-[#d946ef]/10 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="careerGenie logo" className="h-6 object-contain" />
            <span className="text-xs font-bold text-gray-400 border border-white/10 rounded-full px-2 py-0.5 uppercase tracking-widest">HR</span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isLogin ? 'Recruiter Login' : 'Create HR Account'}
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            {isLogin ? 'Access your workspace and hiring pipeline.' : 'Join your company workspace automatically.'}
          </p>
        </div>

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
                    placeholder="John Doe"
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
                    className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-[#22d3ee] outline-none transition-all cursor-pointer"
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                  >
                    <option value="" disabled>Select your position</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="Technical Recruiter">Technical Recruiter</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Hiring Manager">Hiring Manager</option>
                  </select>
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
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-gray-400 text-sm">
            {isLogin ? "Don't have an HR account?" : "Already have an HR account?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-[#22d3ee] font-bold hover:underline"
            >
              {isLogin ? 'Register now' : 'Log in instead'}
            </button>
          </p>
          
          <div className="mt-6 flex flex-col gap-2">
            <button 
              onClick={() => navigate('/')}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest font-bold"
            >
              Back to Candidate Portal
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HrLogin;
