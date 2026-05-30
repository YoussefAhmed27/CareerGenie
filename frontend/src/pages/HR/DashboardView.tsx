// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Briefcase, Users, Calendar, Plus, RefreshCw, X } from 'lucide-react';
import { Button, Card, Badge } from '../../components/HR/HrUIComponents';
import { fetchDashboardStats, fetchJobs, updateJobStatus, deleteJob } from '../../services/hrService';

const DashboardView = ({ setView, setActiveJob, globalSearch = '' }: any) => {
  const [stats, setStats] = useState({ activeJobs: 0, totalCandidates: 0, scheduledInterviews: 0 });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchJobs()])
      .then(([s, j]) => { setStats(s); setJobs(j); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStatusToggle = async (job: any) => {
    const newStatus = job.status === 'Active' ? 'Draft' : 'Active';
    try {
      await updateJobStatus(job.job_id, newStatus);
      setJobs(prev => prev.map(j => j.job_id === job.job_id ? { ...j, status: newStatus } : j));
      const freshStats = await fetchDashboardStats();
      setStats(freshStats);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (jobId: number) => {
    try {
      await deleteJob(jobId);
      setJobs(prev => prev.filter(j => j.job_id !== jobId));
      const freshStats = await fetchDashboardStats();
      setStats(freshStats);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const query = globalSearch.toLowerCase();
    return job.title?.toLowerCase().includes(query) ||
      (job.department || '').toLowerCase().includes(query);
  });

  if (loading) return <div className="text-gray-400 text-center py-20">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Active Jobs', val: stats.activeJobs, color: 'text-[#22d3ee]', icon: Briefcase },
          { label: 'Total Candidates', val: stats.totalCandidates, color: 'text-[#d946ef]', icon: Users },
          { label: 'AI Interviews', val: stats.scheduledInterviews, color: 'text-emerald-400', icon: Calendar },
        ].map((stat, i) => (
          <Card key={i} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">{stat.label}</p>
              <h3 className="text-3xl font-bold text-white mt-1">{stat.val}</h3>
            </div>
            <div className={`p-3 bg-white/5 rounded-xl ${stat.color}`}><stat.icon size={24} /></div>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-xl font-bold text-white">Job Openings</h3>
          <div className="flex w-full sm:w-auto gap-3 items-center">
            <Button size="sm" icon={Plus} onClick={() => setView('create-job')}>New Opening</Button>
          </div>
        </div>
        <Card noPadding>
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
                {filteredJobs.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No matching job openings found.</td></tr>
                )}
                {filteredJobs.map(job => (
                  <tr key={job.job_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{job.title}</td>
                    <td className="px-6 py-4 text-gray-400">{job.department || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-white">{job.candidates} total</span>
                      <span className="text-xs text-[#22d3ee] ml-2">({job.screened} screened)</span>
                    </td>
                    <td className="px-6 py-4"><Badge status={job.status}>{job.status}</Badge></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => { setActiveJob(job); setView('candidate-list'); }}>Manage</Button>
                        <button className="p-2 text-gray-400 hover:text-white" onClick={() => handleStatusToggle(job)}><RefreshCw size={14} /></button>
                        <button className="p-2 text-gray-400 hover:text-red-400" onClick={() => handleDelete(job.job_id)}><X size={14} /></button>
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
};

export default DashboardView;
