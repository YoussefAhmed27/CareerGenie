// @ts-nocheck
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Briefcase,
  Building2,
  CalendarCheck,
  Check,
  Clock,
  ClipboardList,
  Cpu,
  Eye,
  FileSearch,
  Mail,
  Monitor,
  Play,
  Shield,
  Star,
  Upload,
  Users,
  Video,
} from 'lucide-react';
import { Button } from '../../components/HR/HrUIComponents';

const features = [
  {
    title: 'Company Workspace',
    desc: 'A dedicated hiring workspace with controlled access for HR users and company members.',
    icon: Building2,
  },
  {
    title: 'CV Screening',
    desc: 'Batch filter candidate CVs against job requirements, then review evaluations and rankings.',
    icon: FileSearch,
  },
  {
    title: 'AI Interviews',
    desc: 'Send candidates customized avatar-led AI interview links built around each opening.',
    icon: Monitor,
  },
  {
    title: 'Proctoring',
    desc: 'Detect suspicious behavior, illegal objects, and integrity risks during candidate sessions.',
    icon: Eye,
  },
  {
    title: 'Review Evaluations',
    desc: 'Assess technical and behavioral feedback, scores, recordings, and candidate evidence.',
    icon: BarChart2,
  },
  {
    title: 'Decision Control',
    desc: 'Manage hiring decisions, rejections, candidates, and opening states under HR supervision.',
    icon: Shield,
  },
];

const workflowStages = [
  { label: 'Workspace', icon: Building2, x: 120, y: 130 },
  { label: 'Job Opening', icon: Briefcase, x: 380, y: 130 },
  { label: 'CV Filter', icon: FileSearch, x: 640, y: 130 },
  { label: 'Shortlist', icon: Upload, x: 900, y: 130 },
  { label: 'Email Invite', icon: Mail, x: 900, y: 320 },
  { label: 'AI Interview', icon: Video, x: 640, y: 320 },
  { label: 'Proctoring', icon: Eye, x: 380, y: 320 },
  { label: 'Evaluation', icon: ClipboardList, x: 120, y: 320 },
  { label: 'Comparison', icon: BarChart2, x: 120, y: 510 },
  { label: 'Live Interview', icon: CalendarCheck, x: 380, y: 510 },
  { label: 'Final Decision', icon: Check, x: 640, y: 510 },
  { label: 'Opening Closed', icon: Shield, x: 900, y: 510 },
];

const whyStats = [
  { title: '70% Time Saved', sub: 'Automate repetitive screening work.', icon: Clock },
  { title: '2x Candidate Quality', sub: 'Receive the best candidates for the job.', icon: Star },
  { title: 'Human in the Loop', sub: 'Review the evidence and make the final decision yourself.', icon: Cpu },
];

const candidateScores = [
  { initials: 'MA', score: 92 },
  { initials: 'YK', score: 88 },
  { initials: 'NS', score: 74 },
  { initials: 'RH', score: 81 },
];

const testimonials = [
  {
    quote: 'CareerGenie helped us turn a crowded CV intake into a clear review pipeline.',
    name: 'Maya Haddad',
    role: 'Talent Acquisition Lead',
  },
  {
    quote: 'The interview evidence gives our hiring managers a sharper starting point.',
    name: 'Omar Kamal',
    role: 'Recruiting Operations',
  },
  {
    quote: 'Async AI interviews made early screening more consistent across remote applicants.',
    name: 'Lina Farouk',
    role: 'People Partner',
  },
];

const pricingPlans = [
  {
    name: 'Business Monthly',
    price: '$400',
    suffix: '/month',
    desc: 'Flexible company access for teams hiring on an active monthly cycle.',
    points: ['Company workspace access', 'CV screening and ranking', 'AI interview invitations', 'Candidate review workflow'],
    cta: 'Request monthly license',
  },
  {
    name: 'Business Annual',
    price: '$4,000',
    suffix: '/year',
    previous: '$4,800',
    desc: 'Annual access for companies running repeated hiring cycles with a reduced yearly rate.',
    points: ['Everything in Business Monthly', 'Annual license discount', 'Workspace continuity across openings', 'Best for recurring recruitment'],
    cta: 'Request annual license',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Contact us',
    suffix: '',
    desc: 'For organizations that need long-term access, larger team usage, or custom commercial terms.',
    points: ['Long-term licensing discussion', 'Expanded workspace access', 'Commercial terms handled externally', 'Sales-led onboarding conversation'],
    cta: 'Contact sales',
  },
];

const SectionHeader = ({ eyebrow, title, desc }: any) => (
  <div className="max-w-3xl mx-auto text-center mb-10">
    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#22d3ee] mb-3">{eyebrow}</p>
    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">{title}</h2>
    {desc && <p className="text-gray-400 text-base md:text-lg leading-relaxed">{desc}</p>}
  </div>
);

const HrLanding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visibleSections, setVisibleSections] = useState({ top: true });
  const onLogin = () => navigate('/hr-login');
  const onRegister = () => navigate('/hr-login?mode=register');
  const revealStyle = (id: string, delay = 0) => ({
    opacity: visibleSections[id] ? 1 : 0,
    transform: visibleSections[id] ? 'translateY(0px)' : 'translateY(38px)',
    filter: visibleSections[id] ? 'blur(0px)' : 'blur(4px)',
    transition: `opacity 720ms ease ${delay}ms, transform 720ms ease ${delay}ms, filter 720ms ease ${delay}ms`,
    willChange: 'opacity, transform, filter',
  });
  const scrollToSection = (id: string) => {
    setVisibleSections((current) => ({ ...current, [id]: false }));
    window.history.replaceState(null, '', `#${id}`);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        setVisibleSections((current) => ({ ...current, [id]: true }));
      }, 260);
    });
  };
  const onWatchDemo = () => scrollToSection('how-it-works');

  useEffect(() => {
    if (location.state?.scrollToTop || location.hash === '#top' || (location.pathname === '/hr' && !location.hash)) {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
    }
  }, [location.pathname, location.hash, location.state]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('[data-hr-section]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisibleSections((current) => ({ ...current, [entry.target.id]: entry.isIntersecting }));
        });
      },
      { threshold: 0.18, rootMargin: '-8% 0px -8% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0C1E] text-white overflow-y-auto scroll-smooth">
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#0B0C1E]/90 backdrop-blur-md border-b border-white/10 h-20 flex items-center justify-between px-4 sm:px-6 lg:px-10 xl:px-12 shadow-[0_10px_35px_rgba(0,0,0,0.28)]">
        <div className="flex-1 flex items-center justify-start gap-3 cursor-pointer" onClick={() => navigate('/hr#top')}>
          <img src="/logo.png" alt="careerGenie logo" className="w-32 sm:w-36 object-contain" />
          <span className="text-xs font-bold text-gray-400 border border-white/10 rounded-full px-2 py-0.5">HR</span>
        </div>
        <div className="hidden lg:flex items-center justify-center gap-8 xl:gap-10 text-[15px] font-medium text-gray-300">
          <button type="button" onClick={() => scrollToSection('top')} className="border-b-2 border-transparent py-7 hover:text-white hover:border-[#22d3ee]/70 transition-all">Home</button>
          <button type="button" onClick={() => scrollToSection('features')} className="border-b-2 border-transparent py-7 hover:text-white hover:border-[#22d3ee]/70 transition-all">Features</button>
          <button type="button" onClick={() => scrollToSection('how-it-works')} className="border-b-2 border-transparent py-7 hover:text-white hover:border-[#22d3ee]/70 transition-all">How It Works</button>
          <button type="button" onClick={() => scrollToSection('why-us')} className="border-b-2 border-transparent py-7 hover:text-white hover:border-[#22d3ee]/70 transition-all">Why Us</button>
          <button type="button" onClick={() => scrollToSection('pricing')} className="border-b-2 border-transparent py-7 hover:text-white hover:border-[#22d3ee]/70 transition-all">Pricing</button>
        </div>
        <div className="flex-1 flex justify-end gap-3">
          <Button variant="ghost" onClick={onLogin}>Log In</Button>
          <Button onClick={onRegister}>Get Started</Button>
        </div>
      </nav>

      <section id="top" data-hr-section className="min-h-screen flex flex-col justify-center px-6 pt-24 pb-12 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[52rem] h-[52rem] bg-[#22d3ee]/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[36rem] h-[36rem] bg-[#d946ef]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto w-full text-center relative z-10" style={revealStyle('top')}>
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-[#22d3ee] animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">AI-powered hiring command center</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-bold mb-8 leading-tight">
            Hire the best,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22d3ee] to-[#d946ef]">
              automate the rest
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-3xl mx-auto">
            Automate the hiring lifecycle in one workspace, from job openings to final evaluations. Stay in the loop through every phase; all final decisions are yours.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Button size="lg" onClick={onRegister}>Request Access</Button>
            <Button size="lg" variant="secondary" icon={Play} onClick={onWatchDemo}>Watch Demo</Button>
          </div>
          <div className="border-y border-white/5 py-7 max-w-5xl mx-auto">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.22em] mb-5">Trusted by top companies</p>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-lg font-bold text-gray-400 grayscale opacity-60">
              {['Microsoft', 'Google', 'Amazon', 'IBM', 'Siemens'].map((brand) => (
                <span key={brand}>{brand}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" data-hr-section className="min-h-screen flex flex-col justify-center px-6 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto w-full" style={revealStyle('features')}>
          <SectionHeader
            eyebrow="Features"
            title="Everything HR needs"
            desc="A practical workspace for managing openings, screening applicants, evaluating interviews, and keeping decisions under human control."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#11152D]/80 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-1 hover:border-[#22d3ee]/50 hover:bg-[#151936]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#22d3ee]/20 bg-[#22d3ee]/10 text-[#22d3ee]">
                  <feature.icon size={22} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" data-hr-section className="min-h-screen flex flex-col justify-center px-6 py-24 bg-[#151632]/25 border-t border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full" style={revealStyle('how-it-works')}>
          <SectionHeader
            eyebrow="How It Works"
            title="One comprehensive pipeline to make your hiring easier"
          />
          <div className="relative mx-auto h-[640px] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#070918] shadow-[0_35px_100px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_86%_20%,rgba(217,70,239,0.12),transparent_26%),radial-gradient(circle_at_52%_86%,rgba(34,211,238,0.10),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent_42%)]" />
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.42)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.42)_1px,transparent_1px)] [background-size:44px_44px]" />
            <div className="absolute inset-x-16 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute inset-y-12 left-1/2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1100 640" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="roadmapLine" x1="90" y1="130" x2="930" y2="510" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22d3ee" stopOpacity="0.2" />
                  <stop offset="0.45" stopColor="#22d3ee" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#d946ef" stopOpacity="0.7" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                id="roadmapPath"
                d="M120 130 H900 C970 130 970 320 900 320 H120 C50 320 50 510 120 510 H900"
                stroke="#22d3ee"
                strokeWidth="18"
                strokeLinecap="round"
                opacity="0.055"
              />
              <path
                d="M120 130 H900 C970 130 970 320 900 320 H120 C50 320 50 510 120 510 H900"
                stroke="url(#roadmapLine)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="10 14"
                opacity="0.56"
              />
              <path
                d="M120 130 H900 C970 130 970 320 900 320 H120 C50 320 50 510 120 510 H900"
                stroke="url(#roadmapLine)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="90 820"
                opacity="0.85"
                filter="url(#glow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-910" dur="6s" repeatCount="indefinite" />
              </path>
            </svg>

            {workflowStages.map((stage, index) => (
              <div
                key={stage.label}
                className="absolute z-20 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center lg:flex"
                style={{ left: `${(stage.x / 1100) * 100}%`, top: `${(stage.y / 640) * 100}%` }}
              >
                <div className="relative grid h-20 w-20 place-items-center rounded-full border border-[#22d3ee]/35 bg-[#0B0C1E] text-[#22d3ee] shadow-[0_0_38px_rgba(34,211,238,0.22)] transition-all hover:scale-110 hover:border-[#d946ef]/50 hover:text-white">
                  <div className="absolute inset-2 rounded-full border border-white/10" />
                  <stage.icon size={24} />
                  <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-[#11152D] text-[10px] font-bold text-gray-400 border border-white/10">
                    {index + 1}
                  </span>
                </div>
                <p className="mt-3 max-w-28 text-xs font-bold uppercase tracking-[0.12em] text-gray-300">{stage.label}</p>
              </div>
            ))}

            <div className="absolute inset-x-5 bottom-5 z-20 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur md:grid-cols-4 lg:hidden">
              {workflowStages.map((stage) => (
                <div key={stage.label} className="flex items-center gap-2 text-xs font-bold text-gray-300">
                  <stage.icon className="text-[#22d3ee]" size={15} />
                  <span>{stage.label}</span>
                </div>
              ))}
            </div>

            <div className="absolute left-1/2 top-1/2 z-10 hidden h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#22d3ee]/10 bg-[#22d3ee]/5 blur-xl lg:block" />
          </div>
        </div>
      </section>

      <section id="why-us" data-hr-section className="min-h-screen flex flex-col justify-center px-6 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto w-full" style={revealStyle('why-us')}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#22d3ee] mb-4">Why Us</p>
              <h2 className="text-3xl md:text-5xl font-bold mb-7 leading-tight">Built for faster, clearer hiring decisions</h2>
              <div className="space-y-7">
                {whyStats.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#d946ef] flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(34,211,238,0.18)]">
                      <item.icon size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{item.title}</h3>
                      <p className="text-gray-400">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#22d3ee] to-[#d946ef] rounded-2xl opacity-20 blur-2xl" />
              <div className="relative bg-[#151632]/80 backdrop-blur-xl border border-white/10 rounded-xl p-8">
                <div className="space-y-4">
                  {candidateScores.map((item) => (
                    <div key={item.initials} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22d3ee]/30 to-[#d946ef]/30 flex items-center justify-center font-bold text-sm text-white">
                        {item.initials}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#22d3ee] to-[#d946ef] rounded-full" style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                      <span className="text-[#22d3ee] font-bold text-sm">{item.score}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">AI-Ranked Candidates</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-xl border border-white/10 bg-[#151632]/65 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.18)]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#22d3ee]/25 to-[#d946ef]/25 text-sm font-bold text-white">
                    {item.name.split(' ').map((part) => part[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.role}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">"{item.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" data-hr-section className="min-h-screen flex flex-col justify-center px-6 py-24 bg-[#151632]/25 border-t border-white/5">
        <div className="max-w-7xl mx-auto w-full" style={revealStyle('pricing')}>
          <SectionHeader
            eyebrow="Pricing"
            title="Licensing plans for company hiring teams"
            desc="Choose a business license for regular recruiting cycles, or speak with our team about enterprise access."
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-7 flex flex-col min-h-[470px] shadow-[0_22px_50px_rgba(0,0,0,0.22)] ${
                  plan.featured
                    ? 'bg-[#11152D] border-[#22d3ee]/45'
                    : 'bg-[#0B0C1E]/90 border-white/10'
                }`}
              >
                {plan.featured && (
                  <div className="absolute right-5 top-5 rounded-full border border-[#22d3ee]/30 bg-[#22d3ee]/10 px-3 py-1 text-xs font-bold text-[#22d3ee]">
                    Save $800
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-3 pr-24">{plan.name}</h3>
                <div className="mb-5">
                  {plan.previous && <span className="mr-3 text-sm text-gray-500 line-through">{plan.previous}</span>}
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.suffix && <span className="text-gray-500 font-semibold"> {plan.suffix}</span>}
                </div>
                <p className="text-sm text-gray-400 mb-7 leading-relaxed">{plan.desc}</p>
                <div className="space-y-3 mb-8">
                  {plan.points.map((point) => (
                    <div key={point} className="flex gap-3 text-sm text-gray-300">
                      <Check size={16} className="text-[#22d3ee] shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
                <Button className="mt-auto" variant={plan.featured ? 'primary' : 'secondary'} fullWidth onClick={onRegister}>
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" data-hr-section className="min-h-screen flex flex-col justify-center px-6 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center" style={revealStyle('contact')}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#22d3ee] mb-4">Contact Us</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">Start a licensing conversation</h2>
            <p className="text-gray-400 text-lg mb-8">
              Tell us about your company, hiring volume, and preferred access model. Our team will help match the right license to your recruitment workflow.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-[#151632]/70 p-5">
                <Users className="text-[#22d3ee] mb-4" size={22} />
                <h3 className="font-bold mb-2">Business access</h3>
                <p className="text-sm text-gray-400">Monthly or annual licensing for company recruiting teams.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#151632]/70 p-5">
                <Shield className="text-[#22d3ee] mb-4" size={22} />
                <h3 className="font-bold mb-2">Enterprise terms</h3>
                <p className="text-sm text-gray-400">Long-term access discussions for larger organizations.</p>
              </div>
            </div>
          </div>
          <form className="rounded-2xl border border-white/10 bg-[#151632]/75 p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.25)]" onSubmit={(event) => event.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input className="bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#22d3ee]" placeholder="Full name" />
              <input className="bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#22d3ee]" placeholder="Work email" />
            </div>
            <input className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#22d3ee] mb-4" placeholder="Company name" />
            <select className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-gray-300 outline-none focus:border-[#22d3ee] mb-4">
              <option>Business monthly license</option>
              <option>Business annual license</option>
              <option>Enterprise access</option>
            </select>
            <textarea className="w-full min-h-32 bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#22d3ee] resize-none mb-5" placeholder="Tell us about your hiring needs" />
            <Button fullWidth onClick={() => {}}>Submit inquiry</Button>
          </form>
        </div>
      </section>

      <footer className="px-6 py-10 border-t border-white/5 text-sm text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="careerGenie logo" className="w-28 object-contain opacity-80" />
            <span className="text-xs font-bold text-gray-500 border border-white/10 rounded-full px-2 py-0.5">HR</span>
          </div>
          <p>(c) 2026 CareerGenie. All rights reserved.</p>
          <button onClick={() => navigate('/')} className="text-[#22d3ee] hover:text-white transition-colors">
            Candidate Portal
          </button>
        </div>
      </footer>
    </div>
  );
};

export default HrLanding;
