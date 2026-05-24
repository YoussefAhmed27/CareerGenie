// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Upload, RefreshCw, Zap, BarChart2, CheckCircle } from 'lucide-react';
import { Button, Card, Badge, Avatar } from '../../components/HR/HrUIComponents';
import { fetchCandidates, deleteCandidate, hireCandidate, uploadCVs } from '../../services/hrService';

const CandidateListView = ({ setView, activeJob, selected, setSelected, setActiveCandidate, globalSearch = '' }: any) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeJob) return;
    fetchCandidates(activeJob.job_id)
      .then(setCandidates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeJob]);

  const isSelected = (cand: any) =>
    selected.some((c: any) => c.job_candidate_id === cand.job_candidate_id);

  const toggleSelect = (cand: any) => {
    if (isSelected(cand)) {
      setSelected(selected.filter((c: any) => c.job_candidate_id !== cand.job_candidate_id));
    } else {
      setSelected([...selected, cand]);
    }
  };

  const handleHire = async () => {
    try {
      for (const cand of selected) await hireCandidate(cand.job_candidate_id);
      setView('hired');
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    await deleteCandidate(id);
    setCandidates(prev => prev.filter(c => c.job_candidate_id !== id));
    setSelected(selected.filter((c: any) => c.job_candidate_id !== id));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('cvs', files[i]);
    }

    try {
      await uploadCVs(activeJob.job_id, formData);
      const freshCandidates = await fetchCandidates(activeJob.job_id);
      setCandidates(freshCandidates);
    } catch (err) {
      console.error("Failed to upload CVs:", err);
      alert("Failed to parse and upload CVs. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const filteredCandidates = candidates.filter(c => {
    const query = globalSearch.toLowerCase();
    return !query ||
      c.name?.toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.stage || '').toLowerCase().includes(query) ||
      (c.status || '').toLowerCase().includes(query);
  });

  if (!activeJob) return <div className="text-gray-400 text-center py-20">No job selected.</div>;
  if (loading) return <div className="text-gray-400 text-center py-20">Loading candidates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Briefcase size={14} /><span>{activeJob.title}</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Pipeline</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            multiple
            accept=".pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            icon={uploading ? RefreshCw : Upload}
            className={`flex-1 md:flex-none ${uploading ? 'animate-pulse' : ''}`}
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? 'ATS Screening...' : 'Upload CVs'}
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="bg-[#22d3ee]/5 border border-[#22d3ee]/20 p-6 rounded-xl flex items-center justify-center gap-4 animate-pulse">
          <RefreshCw size={24} className="text-[#22d3ee] animate-spin" />
          <div>
            <h4 className="text-[#22d3ee] font-bold">ATS Processing & Screening Active</h4>
            <p className="text-xs text-gray-400 mt-1">Analyzing candidate resumes against job opening requirements and matching skill densities...</p>
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/20 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[#22d3ee] font-bold">{selected.length} candidates selected</span>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button size="sm" variant="success" icon={CheckCircle} onClick={handleHire}>Hire Selected</Button>
            <Button size="sm" icon={Zap} onClick={() => setView('ai-schedule')} fullWidth>Send AI Invite</Button>
            <Button size="sm" variant="secondary" icon={BarChart2} onClick={() => setView('compare')} fullWidth>Compare</Button>
          </div>
        </div>
      )}

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#151632] text-xs font-bold text-gray-500 uppercase border-b border-white/5">
              <tr>
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={filteredCandidates.length > 0 && filteredCandidates.every(c => isSelected(c))}
                    onChange={() => {
                      if (filteredCandidates.every(c => isSelected(c))) {
                        setSelected(selected.filter((s: any) => !filteredCandidates.some(c => c.job_candidate_id === s.job_candidate_id)));
                      } else {
                        const newSelection = [...selected];
                        filteredCandidates.forEach(c => {
                          if (!newSelection.some(s => s.job_candidate_id === c.job_candidate_id)) {
                            newSelection.push(c);
                          }
                        });
                        setSelected(newSelection);
                      }
                    }}
                    className="rounded bg-[#0B0C1E] border-white/20 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3">Candidate</th>
                <th className="px-6 py-3">AI Score</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    {candidates.length === 0 ? "No candidates yet for this job." : "No matching candidates found."}
                  </td>
                </tr>
              )}
              {filteredCandidates.map(c => (
                <tr key={c.job_candidate_id} className={`hover:bg-white/5 transition-colors ${isSelected(c) ? 'bg-white/5' : ''}`}>
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={isSelected(c)}
                      onChange={() => toggleSelect(c)}
                      className="rounded bg-[#0B0C1E] border-white/20 cursor-pointer" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <Avatar initials={getInitials(c.name)} />
                      <div>
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.email || activeJob.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-lg font-bold text-white">{c.score != null ? `${c.score}%` : '—'}</div>
                  </td>
                  <td className="px-6 py-4"><Badge status={c.status}>{c.stage}</Badge></td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}<br />
                    <span className="text-xs text-gray-600">{c.source}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setActiveCandidate(c); setView('ai-results'); }}>Review</Button>
                      <button className="p-2 text-gray-400 hover:text-red-400" onClick={() => handleDelete(c.job_candidate_id)}>✕</button>
                    </div>
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

export default CandidateListView;
