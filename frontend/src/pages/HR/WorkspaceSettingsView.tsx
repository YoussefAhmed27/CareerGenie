// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Trash2, Mail, User, ShieldAlert, X } from 'lucide-react';
import { Button, Card, Avatar } from '../../components/HR/HrUIComponents';
import { 
  fetchWorkspace, 
  removeMember, 
  inviteMember, 
  fetchWorkspaceInvitations, 
  cancelWorkspaceInvitation 
} from '../../services/hrService';

const WorkspaceSettingsView = ({ setView }: any) => {
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    position: 'Recruiter',
    role: 'Member'
  });

  const loadData = () => {
    fetchWorkspace()
      .then(data => { 
        setWorkspace(data.workspace); 
        setMembers(data.members);
        if (data.workspace) {
          return fetchWorkspaceInvitations(data.workspace.workspace_id);
        }
      })
      .then(invs => {
        if (invs) setInvitations(invs);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemove = async (memberId: number) => {
    if (!workspace) return;
    try {
      await removeMember(workspace.workspace_id, memberId);
      setMembers(prev => prev.filter(m => m.hr_user_id !== memberId));
    } catch (e: any) { setError(e.message); }
  };

  const handleSignOut = () => {
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');
    window.location.href = '/hr-login';
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    try {
      setError('');
      await inviteMember(workspace.workspace_id, inviteForm);
      setShowInviteModal(false);
      setInviteForm({
        full_name: '',
        email: '',
        position: 'Recruiter',
        role: 'Member'
      });
      // Refresh invites list
      const freshInvs = await fetchWorkspaceInvitations(workspace.workspace_id);
      setInvitations(freshInvs);
    } catch (e: any) {
      setError(e.message || "Failed to invite member");
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    if (!workspace) return;
    try {
      setError('');
      await cancelWorkspaceInvitation(workspace.workspace_id, inviteId);
      setInvitations(prev => prev.filter(inv => inv.invite_id !== inviteId));
    } catch (e: any) {
      setError(e.message || "Failed to cancel invitation");
    }
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  if (loading) return <div className="text-gray-400 text-center py-20">Loading workspace...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Workspace Team</h2>
          <p className="text-gray-500 text-sm">{workspace?.name}</p>
        </div>
        <Button icon={LogOut} variant="danger" onClick={handleSignOut}>Sign Out</Button>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

      <Card>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-white">Team Members</h3>
            <p className="text-gray-400 text-sm">Manage access for {workspace?.name}</p>
          </div>
          <Button icon={Plus} size="sm" onClick={() => setShowInviteModal(true)}>Invite Member</Button>
        </div>

        <div className="space-y-4">
          {members.map(member => (
            <div key={member.hr_user_id} className="flex items-center justify-between p-4 bg-[#0B0C1E] rounded-lg border border-white/5">
              <div className="flex items-center gap-4">
                <Avatar initials={getInitials(member.full_name)} size="md" />
                <div>
                  <p className="font-bold text-white">{member.full_name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400 hidden sm:block">{member.role}</span>
                <button
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  onClick={() => handleRemove(member.hr_user_id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-center text-gray-500 py-8">No team members yet.</p>
          )}
        </div>
      </Card>

      {/* Pending Invitations Section */}
      <Card>
        <h3 className="font-bold text-white mb-2">Pending Invitations</h3>
        <p className="text-gray-400 text-sm mb-6">Invited users who haven't completed their registration</p>

        <div className="space-y-4">
          {invitations.map(inv => (
            <div key={inv.invite_id} className="flex items-center justify-between p-4 bg-[#0B0C1E] rounded-lg border border-white/5 border-dashed">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#22d3ee]/10 flex items-center justify-center text-[#22d3ee]">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="font-bold text-white">{inv.full_name}</p>
                  <p className="text-xs text-gray-500">{inv.email}</p>
                  <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-widest mt-0.5">{inv.position} ({inv.role})</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-yellow-500/80 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full uppercase tracking-wider">Pending</span>
                <button
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  onClick={() => handleCancelInvite(inv.invite_id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {invitations.length === 0 && (
            <p className="text-center text-gray-500 py-8">No pending invitations.</p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-white mb-4">Workspace Info</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Workspace ID</span>
            <span className="text-white font-mono">{workspace?.workspace_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Created</span>
            <span className="text-white">{workspace ? new Date(workspace.created_at).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Members</span>
            <span className="text-white">{members.length}</span>
          </div>
        </div>
      </Card>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0B0C1E] border border-white/10 rounded-2xl w-full max-w-md p-6 relative overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    required
                    type="text"
                    placeholder="Jane Doe"
                    className="w-full bg-[#151632] border border-white/10 rounded-xl px-10 py-3 text-white focus:border-[#22d3ee] outline-none transition-all text-sm"
                    value={inviteForm.full_name}
                    onChange={e => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Company Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    required
                    type="email"
                    placeholder="jane@company.com"
                    className="w-full bg-[#151632] border border-white/10 rounded-xl px-10 py-3 text-white focus:border-[#22d3ee] outline-none transition-all text-sm"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Position in Company</label>
                <select
                  required
                  className="w-full bg-[#151632] border border-white/10 rounded-xl px-3 py-3 text-white focus:border-[#22d3ee] outline-none transition-all text-sm cursor-pointer"
                  value={inviteForm.position}
                  onChange={e => setInviteForm({ ...inviteForm, position: e.target.value })}
                >
                  <option value="HR Manager">HR Manager</option>
                  <option value="Recruiter">Recruiter</option>
                  <option value="Technical Recruiter">Technical Recruiter</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Hiring Manager">Hiring Manager</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Workspace Role</label>
                <select
                  required
                  className="w-full bg-[#151632] border border-white/10 rounded-xl px-3 py-3 text-white focus:border-[#22d3ee] outline-none transition-all text-sm cursor-pointer"
                  value={inviteForm.role}
                  onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <option value="Member">Member (Standard Access)</option>
                  <option value="Admin">Admin (Can manage settings/invites)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  fullWidth
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsView;
