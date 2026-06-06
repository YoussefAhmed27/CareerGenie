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
          Recruitment
        </span>
      </h1>
      <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
        Automate sourcing, screening, and interviewing with multimodal AI. Save time, keep decisions structured, and find stronger talent faster.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button size="lg" onClick={onEnterDashboard}>Start Free Trial</Button>
        <Button size="lg" variant="secondary" icon={Play}>Watch Demo</Button>
      </div>
    </section>

    {/* TRUST BAR */}
    <section className="py-10 border-y border-white/5 bg-[#151632]/20">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-8">Built for modern hiring teams</p>
        <div className="flex flex-wrap justify-center gap-12 grayscale opacity-50">
          {['Talent Acquisition', 'Engineering Hiring', 'Graduate Programs', 'Remote Teams', 'People Ops'].map((brand, i) => (
            <span key={i} className="text-xl font-bold text-gray-400">{brand}</span>
          ))}
        </div>
      </div>
    </section>

    {/* FEATURES */}
    <section id="features" className="py-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for Modern Recruiting</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to streamline your hiring pipeline, from CV upload to final review.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: "Bulk CV Screening", desc: "Upload CVs and rank candidates against the actual job description.", icon: Upload },
          { title: "AI Interview Invites", desc: "Generate secure interview links candidates can complete asynchronously.", icon: Monitor },
          { title: "Structured Reports", desc: "Review consistent scores, recordings, and interview feedback in one place.", icon: BarChart2 },
          { title: "Job-Based Context", desc: "Use each opening's requirements to guide screening and interview context.", icon: FileText },
          { title: "Controlled Workflow", desc: "Keep HR decisions explicit with clear candidate and job states.", icon: Shield },
          { title: "Separate Portals", desc: "Keep recruiter workflows separate from candidate practice flows.", icon: Globe },
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
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Why HR teams choose CareerGenie</h2>
            <div className="space-y-8">
              {[
                { title: "70% Time Saved", sub: "Automate the repetitive screening work before manual review.", icon: Clock },
                { title: "2x Candidate Quality", sub: "Focus interviews on candidates with stronger role alignment.", icon: Star },
                { title: "Seamless Integration", sub: "Add AI screening to the hiring workflow without touching candidate practice.", icon: Cpu },
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22d3ee]/30 to-[#d946ef]/30 flex items-center justify-center font-bold text-sm text-white">{['AI','BE','DA','PM'][i]}</div>
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

    {/* WORKFLOWS */}
    <section id="testimonials" className="py-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Hiring Workflows</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { quote: "Upload CVs, rank them against a specific opening, and focus review time on the strongest matches.", name: "CV Screening", role: "Bulk candidate intake" },
          { quote: "Generate secure interview links and let candidates complete first-round AI interviews asynchronously.", name: "AI Interview Invites", role: "Remote evaluation" },
          { quote: "Review interview scores, recordings, technical feedback, and behavioral feedback from the candidate profile.", name: "Structured Review", role: "Decision support" },
        ].map((t, i) => (
          <div key={i} className="p-8 rounded-2xl bg-[#151632]/60 border border-white/10">
            <p className="text-gray-300 mb-6">{t.quote}</p>
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
        <p className="text-gray-400 mb-8">Start with a workspace, create a job opening, upload CVs, and invite shortlisted candidates.</p>
        <Button size="lg" onClick={onEnterDashboard}>Get Started Free</Button>
        <button onClick={() => navigate('/')} className="block mx-auto mt-5 text-sm text-[#22d3ee] hover:text-white transition-colors">
          Looking for candidate interview practice? Go to Candidate Portal
        </button>
      </div>
    </section>

    {/* FOOTER */}
    <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-sm">
      <p>(c) 2026 CareerGenie. All rights reserved.</p>
    </footer>
  </div>
  );
};

export default HrLanding;
