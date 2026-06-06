// @ts-nocheck
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card } from '../../components/HR/HrUIComponents';
import { createJob } from '../../services/hrService';

const CreateJobView = ({ setView }: any) => {
  const [form, setForm] = useState({ title: '', department: '', type: 'Remote', description: '', requirements: ['', ''] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addReq = () => setForm(f => ({ ...f, requirements: [...f.requirements, ''] }));
  const setReq = (i: number, val: string) => setForm(f => {
    const r = [...f.requirements]; r[i] = val; return { ...f, requirements: r };
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Job title is required.'); return; }
    setLoading(true); setError('');
    try {
      await createJob({ ...form, requirements: form.requirements.filter(r => r.trim()) });
      setView('dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="space-y-6">
        <div className="border-b border-white/10 pb-6">
          <h2 className="text-xl font-bold text-white">Create New Opening</h2>
          <p className="text-gray-400 text-sm">Define the role details candidates will be evaluated against.</p>
        </div>
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Job Title *</label>
            <input className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none"
              placeholder="Senior Backend Engineer" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Department</label>
            <input className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none"
              placeholder="Engineering" value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Work Type</label>
            <select className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none"
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option>Remote</option><option>Hybrid</option><option>On-site</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Job Description</label>
            <textarea className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none h-32 resize-none"
              placeholder="Paste the job description, responsibilities, and role context." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Requirements</label>
            <div className="space-y-2">
              {form.requirements.map((r, i) => (
                <input key={i} className="w-full bg-[#0B0C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22d3ee] outline-none"
                  placeholder={`Requirement ${i + 1}`} value={r} onChange={e => setReq(i, e.target.value)} />
              ))}
              <Button size="sm" variant="ghost" icon={Plus} onClick={addReq}>Add Requirement</Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setView('dashboard')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Creating...' : 'Publish Opening'}</Button>
        </div>
      </Card>
    </div>
  );
};

export default CreateJobView;
