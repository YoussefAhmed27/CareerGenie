// @ts-nocheck
import React from 'react';
import { 
  Users, Briefcase, Plus, Upload, ChevronRight, 
  Search, BarChart2, Video, Calendar, CheckCircle, X, 
  Settings, LogOut, Mail, Play, Mic, Monitor, Award, 
  Zap, LayoutGrid, ArrowLeft, MessageSquare, Phone,
  Star, ChevronDown, Filter, Download, MoreHorizontal,
  UserCheck, AlertCircle, RefreshCw, Shield, Link, 
  Copy, Trash2, MicOff, VideoOff, MonitorUp, PhoneOff,
  Menu, Check, Globe, Cpu, Clock, Smile
} from 'lucide-react';
import { Button, Card, Badge, Avatar, RadarChart, BarChart } from '../../components/HR/HrUIComponents';
import { JOBS, TEAM_MEMBERS, CANDIDATES } from '../../components/HR/HrMockData';

export const DashboardView = ({ setView, setActiveJob }: any) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        { label: 'Active Jobs', val: '3', color: 'text-[#22d3ee]', icon: Briefcase },
        { label: 'Candidates Screened', val: '85', color: 'text-[#d946ef]', icon: Users },
        { label: 'Interviews Scheduled', val: '12', color: 'text-emerald-400', icon: Calendar }
      ].map((stat, i) => (
        <Card key={i} className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">{stat.label}</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stat.val}</h3>
          </div>
          <div className={`p-3 bg-white/5 rounded-xl ${stat.color}`}>
            <stat.icon size={24} />
          </div>
        </Card>
      ))}
    </div>

    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h3 className="text-xl font-bold text-white">Job Openings</h3>
        <Button size="sm" icon={Plus} onClick={() => setView('create-job')}>New Opening</Button>
      </div>
      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-[#151632] text-xs uppercase text-gray-500 border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Candidates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {JOBS.map(job => (
                <tr key={job.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{job.title}</td>
                  <td className="px-6 py-4 text-gray-400">{job.dept}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{job.candidates} total</span>
                      <span className="text-xs text-[#22d3ee]">({job.screened} screened)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><Badge status={job.status}>{job.status}</Badge></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setActiveJob(job); setView('candidate-list'); }}>Manage</Button>
                      <button className="p-2 text-gray-400 hover:text-white" title="Reset Job"><RefreshCw size={14} /></button>
                      <button className="p-2 text-gray-400 hover:text-red-400" title="Close Job"><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
);

export const WorkspaceSettingsView = ({ setView }: any) => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-bold text-white">Workspace Team</h2>
      <Button icon={LogOut} variant="danger" onClick={() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }}>Sign Out</Button>
    </div>
    
    <Card>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-white">Team Members</h3>
          <p className="text-gray-400 text-sm">Manage access for TechCorp Inc.</p>
        </div>
        <Button icon={Plus} size="sm">Invite Member</Button>
      </div>
      
      <div className="space-y-4">
        {TEAM_MEMBERS.map(member => (
          <div key={member.id} className="flex items-center justify-between p-4 bg-[#0B0C1E] rounded-lg border border-white/5">
            <div className="flex items-center gap-4">
              <img src={member.img} className="w-10 h-10 rounded-full object-cover" alt={member.name} />
              <div>
                <p className="font-bold text-white">{member.name}</p>
                <p className="text-xs text-gray-500">{"email@techcorp.com"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 hidden sm:block">{member.role}</span>
              <button className="text-gray-500 hover:text-red-400"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

export const CreateJobView = ({ setView }: any) => (
  <div className="max-w-4xl mx-auto">
    <Card className="space-y-6">
      <div className="border-b border-white/10 pb-6 mb-6">
        <h2 className="text-xl font-bold text-white">Create New Opening</h2>
        <p className="text-gray-400 text-sm">Define the role and AI screening parameters.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1 md:col-span-2">
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Job Title</label>
          <input className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none" placeholder="e.g. Senior Backend Engineer" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Job Description</label>
          <textarea className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none h-32 resize-none mb-4" placeholder="Paste JD here..." />
        </div>
        
        <div className="col-span-1 md:col-span-2">
           <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Requirements</label>
           <div className="space-y-2">
             <input className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none" placeholder="Requirement 1 (e.g. 5+ Years Node.js)" />
             <input className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none" placeholder="Requirement 2" />
             <Button size="sm" variant="ghost" icon={Plus}>Add Requirement</Button>
           </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={() => setView('dashboard')}>Cancel</Button>
        <Button onClick={() => setView('candidate-list')}>Create & Activate</Button>
      </div>
    </Card>
  </div>
);

export const CandidateListView = ({ setView, activeJob, selected, setSelected }: any) => {
  const toggleSelect = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((i: number) => i !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Briefcase size={14} />
            <span>{activeJob ? activeJob.title : 'Senior React Developer'}</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Pipeline</h2>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
          <Button variant="secondary" icon={Upload} className="flex-1 md:flex-none">Upload CVs</Button>
          <Button variant="secondary" icon={Download} className="flex-1 md:flex-none">Export</Button>
          <Button variant="danger" icon={RefreshCw} className="hidden md:flex">Reset</Button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[#22d3ee] font-bold">{selected.length} candidates selected</span>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button size="sm" variant="success" icon={CheckCircle} onClick={() => setView('hired')} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Hire Selected</Button>
            <Button size="sm" icon={Zap} onClick={() => setView('ai-schedule')} fullWidth>Send AI Invite</Button>
            <Button size="sm" variant="secondary" icon={BarChart2} onClick={() => setView('compare')} fullWidth>Compare</Button>
          </div>
        </div>
      )}

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
             <thead className="bg-[#151632] text-xs font-bold text-gray-500 uppercase border-b border-white/5">
                <tr>
                  <th className="px-6 py-3 w-12">
                     <input type="checkbox" className="rounded bg-[#0B0C1E] border-white/20"/>
                  </th>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">AI Score</th>
                  <th className="px-6 py-3">Stage</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {CANDIDATES.map(c => (
                  <tr key={c.id} className={`hover:bg-white/5 transition-colors ${selected.includes(c.id) ? 'bg-white/5' : ''}`}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selected.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded bg-[#0B0C1E] border-white/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <Avatar initials={c.initials} />
                        <div>
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-bold text-white">{c.score}%</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={c.status}>{c.stage}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {c.date} <br/> <span className="text-xs text-gray-600">{c.source}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button size="sm" variant="secondary" onClick={() => setView('ai-results')}>Review</Button>
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const AIScheduleView = ({ setView, selected }: any) => (
  <div className="max-w-2xl mx-auto pt-10">
    <Card>
      <div className="border-b border-white/10 pb-6 mb-6">
        <h2 className="text-xl font-bold text-white">Schedule AI Interviews</h2>
        <p className="text-gray-400 text-sm">Send autonomous interview links to {selected.length} candidates.</p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Availability Window</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="datetime-local" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white" />
            <input type="datetime-local" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Candidates must complete the interview within this timeframe.</p>
        </div>

        <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex gap-3">
          <Link size={20} className="text-[#22d3ee] shrink-0" />
          <p className="text-sm text-[#22d3ee]">Unique secure links will be generated and emailed automatically.</p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setView('candidate-list')}>Cancel</Button>
          <Button onClick={() => setView('candidate-list')}>Generate & Send</Button>
        </div>
      </div>
    </Card>
  </div>
);

export const CompareView = ({ setView }: any) => (
  <div className="space-y-6">
    <div className="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView('candidate-list')}>Back</Button>
      <h2 className="text-2xl font-bold text-white">Candidate Comparison</h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {CANDIDATES.slice(0,3).map((c, i) => (
        <Card key={i} className="flex flex-col gap-6">
          <div className="text-center border-b border-white/10 pb-6">
            <div className="w-20 h-20 mx-auto mb-4 flex justify-center"><Avatar initials={c.initials} size="xl"/></div>
            <h3 className="text-xl font-bold text-white text-center w-full">{c.name}</h3>
            <div className="text-3xl font-bold text-[#22d3ee] mt-2">{c.score}%</div>
          </div>
          
          <div className="space-y-4 flex-1">
            <BarChart value={c.metrics.tech} label="TECHNICAL" color="bg-[#22d3ee]" />
            <BarChart value={c.metrics.comm} label="COMMUNICATION" color="bg-[#d946ef]" />
            <BarChart value={c.metrics.culture} label="CULTURE FIT" color="bg-emerald-400" />
            <div className="p-3 bg-white/5 rounded-lg mt-4">
               <p className="text-xs font-bold text-gray-400 uppercase mb-2">Key Justification</p>
               <p className="text-sm text-gray-300">Strong technical background with React. Good communicator but pacing is fast.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex gap-2">
              <Button fullWidth size="sm" onClick={() => setView('live-schedule')}>Interview</Button>
              <Button variant="danger" size="sm" icon={X}></Button>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export const AIResultsView = ({ setView }: any) => (
  <div className="flex flex-col gap-6 h-full">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView('candidate-list')}>Back to Pipeline</Button>
      <div className="flex gap-2 w-full sm:w-auto">
         <Button variant="danger" icon={X} className="flex-1 sm:flex-none">Reject</Button>
         <Button icon={Calendar} onClick={() => setView('live-schedule')} className="flex-1 sm:flex-none">Schedule Live</Button>
      </div>
    </div>

    <Card noPadding className="p-0 overflow-hidden relative aspect-video md:aspect-[21/9] bg-black group shrink-0">
       <div className="absolute inset-0 flex items-center justify-center">
          <button className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:scale-110 transition-transform">
             <Play size={32} fill="currentColor" className="ml-1"/>
          </button>
       </div>
       <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black to-transparent">
          <h3 className="text-white text-xl font-bold">Interview Recording - Alex Chen</h3>
          <p className="text-gray-400">Duration: 15:42 • Completed Oct 24</p>
       </div>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
       <div className="lg:col-span-8 space-y-6">
          <Card>
             <h3 className="text-xl font-bold text-white mb-6">Detailed Feedback</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="flex justify-center">
                   <RadarChart />
                </div>
                <div className="space-y-4">
                   <BarChart value={95} label="TECHNICAL PROFICIENCY" color="bg-[#22d3ee]" />
                   <BarChart value={88} label="COMMUNICATION" color="bg-[#d946ef]" />
                   <BarChart value={90} label="CULTURAL FIT" color="bg-emerald-400" />
                   <BarChart value={85} label="CONFIDENCE" color="bg-amber-400" />
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                   <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><CheckCircle size={16}/> Strengths</h4>
                   <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                      <li>Deep understanding of React Hooks and State Management.</li>
                      <li>Clear articulation of complex technical concepts.</li>
                      <li>Maintained strong eye contact throughout the session.</li>
                   </ul>
                </div>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                   <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2"><AlertCircle size={16}/> Areas for Improvement</h4>
                   <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                      <li>Speaking pace was slightly fast (160 wpm) during technical explanations.</li>
                      <li>Could provide more concrete examples for "Conflict Resolution" question.</li>
                   </ul>
                </div>
             </div>
          </Card>
       </div>
       <div className="lg:col-span-4">
          <Card className="sticky top-24">
             <div className="text-center mb-6">
                <div className="w-32 h-32 rounded-full border-8 border-[#22d3ee] flex items-center justify-center mx-auto mb-2">
                   <span className="text-5xl font-bold text-white">92</span>
                </div>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Overall Match</p>
             </div>
             <div className="space-y-4">
                <Button fullWidth onClick={() => setView('live-schedule')}>Proceed to Final Round</Button>
                <Button fullWidth variant="secondary" icon={Download}>Download Full Report</Button>
             </div>
          </Card>
       </div>
    </div>
  </div>
);

export const LiveScheduleView = ({ setView }: any) => (
  <div className="max-w-2xl mx-auto pt-10">
    <Card>
       <div className="border-b border-white/10 pb-6 mb-6">
          <h2 className="text-xl font-bold text-white">Schedule Final Round</h2>
          <p className="text-gray-400 text-sm">Send a live interview invite to Alex Chen.</p>
       </div>
       
       <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Date</label>
                <input type="date" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white" />
             </div>
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Time</label>
                <input type="time" className="w-full bg-[#0B0C1E] border border-white/10 rounded-lg px-4 py-3 text-white" />
             </div>
          </div>
          <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex gap-3">
             <Mail size={20} className="text-[#22d3ee] shrink-0" />
             <p className="text-sm text-[#22d3ee]">Secure video link will be emailed to the candidate.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
             <Button variant="ghost" onClick={() => setView('ai-results')}>Cancel</Button>
             <Button onClick={() => setView('live-room')}>Send Invite</Button>
          </div>
       </div>
    </Card>
  </div>
);

export const LiveRoomView = ({ setView }: any) => (
  <div className="fixed inset-0 bg-[#0B0C1E] z-[100] flex flex-col h-[100dvh]">
     <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
           <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-white text-sm font-bold shadow-black drop-shadow-md">Alex Chen (Candidate)</span>
           </div>
           <span className="bg-red-500/20 backdrop-blur-md px-2 py-0.5 rounded text-xs text-red-200 border border-red-500/30 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> REC
           </span>
        </div>
        <div className="flex items-center gap-2">
           <button className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><LayoutGrid size={20}/></button>
        </div>
     </div>

     <div className="flex-1 relative w-full h-full bg-gray-900 overflow-hidden">
        
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500">
           Candidate Video Feed
        </div>
        
        <div className="absolute bottom-6 left-6 w-48 h-32 md:w-64 md:h-40 bg-gray-700 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-40 transition-all hover:scale-105 flex items-center justify-center text-gray-400">
           Interviewer
           <div className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
              You
           </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#151632]/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-full flex items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50">
           <button className="p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all"><Mic size={24}/></button>
           <button className="p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all"><Video size={24}/></button>
           <button className="p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all"><MonitorUp size={24}/></button>
           <button className="p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all"><MessageSquare size={24}/></button>
           <div className="w-px h-8 bg-white/10 mx-2"></div>
           <button 
              className="px-8 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold whitespace-nowrap shadow-lg shadow-red-500/20 transition-all hover:scale-105" 
              onClick={() => setView('candidate-list')}
           >
              End Interview
           </button>
        </div>
     </div>
  </div>
);

export const HiredView = ({ setView }: any) => (
  <div className="h-full flex items-center justify-center p-4">
     <Card className="max-w-lg w-full text-center p-8 md:p-12 border-[#22d3ee]/30">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
           <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Candidate Hired!</h2>
        <p className="text-gray-400 mb-8">
           <strong className="text-white">Alex Chen</strong> has been marked as hired. <br/>
           Job opening marked as <strong className="text-[#22d3ee]">Completed</strong>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
           <Button variant="ghost" fullWidth onClick={() => setView('dashboard')}>Back to Dashboard</Button>
           <Button fullWidth onClick={() => setView('create-job')}>Post New Job</Button>
        </div>
     </Card>
  </div>
);
