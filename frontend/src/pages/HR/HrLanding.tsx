// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { Play, Upload, Monitor, BarChart2, FileText, Shield, Globe, Clock, Star, Cpu } from 'lucide-react';
import { Button } from '../../components/HR/HrUIComponents';

const HrLanding = () => {
  const navigate = useNavigate();
  const onEnterDashboard = () => navigate('/hr-login');

  return (
    <div className="min-h-screen bg-[#0B0C1E] text-white overflow-y-auto">
    {/* NAV */}
    <nav className="fixed w-full z-50 bg-[#0B0C1E]/80 backdrop-blur-md border-b border-white/5 h-20 flex items-center justify-between px-6 md:px-12">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="careerGenie logo" className="h-6 object-contain" />
        <span className="text-xs font-bold text-gray-400 border border-white/10 rounded-full px-2 py-0.5">HR</span>
      </div>
      <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#why-us" className="hover:text-white transition-colors">Why Us</a>
        <a href="#testimonials" className="hover:text-white transition-colors">Success Stories</a>
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onEnterDashboard}>Log In</Button>
        <Button onClick={onEnterDashboard}>Get Started</Button>
      </div>
    </nav>

    {/* HERO */}
    <section className="pt-36 pb-16 px-6 max-w-7xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1 mb-8">
        <span className="flex h-2 w-2 rounded-full bg-[#22d3ee] animate-pulse"></span>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-300">New AI Model V2.0 Live</span>
      </div>
      <h1 className="text-4xl md:text-7xl font-bold mb-8 leading-tight">
        The Future of <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22d3ee] to-[#d946ef]">
          High-Volume Hiring
        </span>
      </h1>
      <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
        Automate sourcing, screening, and interviewing with our multimodal AI.
        Save 70% of your time and find the best talent faster, without bias.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button size="lg" onClick={onEnterDashboard}>Start Free Trial</Button>
        <Button size="lg" variant="secondary" icon={Play}>Watch Demo</Button>
      </div>
    </section>

    {/* TRUSTED BY */}
    <section className="py-10 border-y border-white/5 bg-[#151632]/20">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-8">Trusted by industry leaders</p>
        <div className="flex flex-wrap justify-center gap-12 grayscale opacity-50">
          {['Acme Corp', 'GlobalTech', 'Nebula Inc', 'FutureSoft', 'InnovateX'].map((brand, i) => (
            <span key={i} className="text-xl font-bold text-gray-400">{brand}</span>
          ))}
        </div>
      </div>
    </section>

    {/* FEATURES */}
    <section id="features" className="py-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for Modern Recruiting</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to streamline your hiring pipeline, from CV to Offer.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: "Bulk Processing", desc: "Upload thousands of CVs. Our AI ranks them instantly against your job description.", icon: Upload },
          { title: "AI Avatar Interviews", desc: "Autonomous video interviews conducted by our realistic avatars, 24/7 in 30+ languages.", icon: Monitor },
          { title: "Behavioral Analytics", desc: "Detailed insights on soft skills, confidence, and cultural fit derived from facial analysis.", icon: BarChart2 },
          { title: "ATS Compatibility", desc: "Ensure your job descriptions and candidate pools are optimized for modern tracking systems.", icon: FileText },
          { title: "Bias Elimination", desc: "Our AI focuses purely on skills and merit, removing unconscious human bias from screening.", icon: Shield },
          { title: "Global Reach", desc: "Schedule and conduct interviews across any timezone without human intervention.", icon: Globe },
        ].map((f, i) => (
          <div key={i} className="p-8 rounded-2xl bg-[#0B0C1E] border border-white/10 hover:border-[#22d3ee]/50 transition-colors group">
            <div className="w-12 h-12 bg-[#22d3ee]/10 rounded-lg flex items-center justify-center text-[#22d3ee] mb-6 group-hover:scale-110 transition-transform">
              <f.icon size={22} />
            </div>
            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
            <p className="text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* WHY US */}
    <section id="why-us" className="py-24 bg-[#151632]/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Why leading HR teams choose CareerGenie</h2>
            <div className="space-y-8">
              {[
                { title: "70% Time Saved", sub: "Recruiters spend less time screening and more time closing.", icon: Clock },
                { title: "2x Candidate Quality", sub: "Data-driven matching ensures you only see the top 10%.", icon: Star },
                { title: "Seamless Integration", sub: "Works alongside your existing HRIS and workflows.", icon: Cpu },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#d946ef] flex items-center justify-center shrink-0">
                    <item.icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">{item.title}</h4>
                    <p className="text-gray-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-[#22d3ee] to-[#d946ef] rounded-2xl opacity-20 blur-2xl"></div>
            <div className="relative bg-[#151632]/80 backdrop-blur-xl border border-white/10 rounded-xl p-8">
              <div className="space-y-4">
                {[92, 88, 74, 81].map((score, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22d3ee]/30 to-[#d946ef]/30 flex items-center justify-center font-bold text-sm text-white">{['AC','SC','MR','EB'][i]}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#22d3ee] to-[#d946ef] rounded-full" style={{ width: `${score}%` }}></div>
                      </div>
                    </div>
                    <span className="text-[#22d3ee] font-bold text-sm">{score}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">AI-Ranked Candidates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* TESTIMONIALS */}
    <section id="testimonials" className="py-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Success Stories</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { quote: "We cut our screening time from 2 weeks to 2 days. CareerGenie is a game changer.", name: "Sarah Jenkins", role: "Head of Talent, Acme Corp" },
          { quote: "The AI interview quality rivals our best human interviewers. Remarkable technology.", name: "David Kim", role: "Hiring Manager, GlobalTech" },
          { quote: "Our offer acceptance rate jumped 40% because we're now only talking to top matches.", name: "Mike Ross", role: "Tech Recruiter, Nebula Inc" },
        ].map((t, i) => (
          <div key={i} className="p-8 rounded-2xl bg-[#151632]/60 border border-white/10">
            <p className="text-gray-300 mb-6 italic">"{t.quote}"</p>
            <div>
              <p className="font-bold text-white">{t.name}</p>
              <p className="text-sm text-gray-500">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="py-24 px-6 text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold mb-6">Ready to transform your hiring?</h2>
        <p className="text-gray-400 mb-8">Join hundreds of companies using CareerGenie to hire smarter.</p>
        <Button size="lg" onClick={onEnterDashboard}>Get Started Free</Button>
      </div>
    </section>

    {/* FOOTER */}
    <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-sm">
      <p>© 2025 CareerGenie Inc. All rights reserved.</p>
    </footer>
  </div>
  );
};

export default HrLanding;
