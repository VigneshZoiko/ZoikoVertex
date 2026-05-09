"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, ShieldAlert, Check, X, Shield, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function TeamPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  const [members, setMembers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CREATOR");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const fetchData = async (userId: string, currentRole: string, wId: string) => {
    // Fetch Active Members
    const { data: membersData } = await supabase
      .from('workspace_members')
      .select(`
        role,
        users ( full_name, email )
      `)
      .eq('workspace_id', wId);
      
    if (membersData) setMembers(membersData);

    // Fetch Pending Requests (Only if Admin)
    if (currentRole === 'ADMIN') {
      const { data: requestsData } = await supabase
        .from('account_requests')
        .select(`
          id, full_name, email, role,
          users!account_requests_requested_by_fkey ( full_name )
        `)
        .eq('workspace_id', wId)
        .eq('status', 'PENDING');
        
      if (requestsData) setRequests(requestsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data } = await supabase
        .from('workspace_members')
        .select('role, workspace_id')
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        setCurrentUserRole(data.role);
        setWorkspaceId(data.workspace_id);
        fetchData(user.id, data.role, data.workspace_id);
      }
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage(null);

    if (currentUserRole === 'MANAGER') {
      // Submit for Approval (Insert into account_requests)
      const { error } = await supabase.from('account_requests').insert({
        workspace_id: workspaceId,
        requested_by: currentUser.id,
        full_name: fullName,
        email: email,
        role: role,
        temporary_password: password
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Request submitted to Admin for approval.' });
        setFullName(""); setEmail(""); setPassword("");
      }
    } else if (currentUserRole === 'ADMIN') {
      // Provision immediately via backend API
      try {
        await api.post('/api/v1/users/provision', {
          workspace_id: workspaceId,
          full_name: fullName,
          email: email,
          role: role,
          password: password
        });
        
        setMessage({ type: 'success', text: 'User provisioned successfully!' });
        setFullName(""); setEmail(""); setPassword("");
        fetchData(currentUser.id, currentUserRole, workspaceId!); // Refresh tables
      } catch (err) {
        setMessage({ type: 'error', text: 'Backend connection failed. Ensure server is running.' });
      }
    }
    setFormLoading(false);
  };

  const handleRequestAction = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    if (action === 'APPROVED') {
      const req = requests.find(r => r.id === requestId);
      if (req) {
        setFormLoading(true);
        try {
          await api.post('/api/v1/users/provision', {
            workspace_id: workspaceId,
            full_name: req.full_name,
            email: req.email,
            role: req.role,
            password: req.temporary_password || 'TempPass123!'
          });
        } catch (err) {
          setMessage({ type: 'error', text: 'Backend connection failed.' });
          setFormLoading(false);
          return;
        }
        setFormLoading(false);
      }
    }
    
    await supabase.from('account_requests').update({ status: action }).eq('id', requestId);
    fetchData(currentUser.id, currentUserRole!, workspaceId!);
  };

  if (loading) return <div className="text-white p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Team Access</h1>
          <p className="text-zinc-400 text-sm">Provision and manage RBAC roles for your workspace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mr-3">
                <UserPlus className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Provision User</h2>
            </div>

            {message && (
              <div className={`mb-4 p-3 text-sm rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                {message.text}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
                <input 
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Corporate Email</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assign Role</label>
                <select 
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="CREATOR">Creator (Drafts only)</option>
                  <option value="MANAGER">Manager (Approves posts)</option>
                  {currentUserRole === 'ADMIN' && <option value="ADMIN">Admin (Full Control)</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Temporary Password</label>
                <input 
                  type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" disabled={formLoading}
                  className="w-full flex items-center justify-center py-2.5 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (currentUserRole === 'ADMIN' ? 'Provision Account Immediately' : 'Submit for Admin Approval')}
                </button>
              </div>
            </form>

            {currentUserRole === 'MANAGER' && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-500/90 leading-relaxed">
                  As a Manager, accounts you provision must be approved by an Administrator before they become active.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tables */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Pending Approvals Table (Admin Only) */}
          {currentUserRole === 'ADMIN' && (
            <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <ShieldAlert className="w-32 h-32 text-amber-500" />
              </div>
              
              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Pending Account Approvals
              </h2>
              <p className="text-sm text-zinc-400 mb-6">Users provisioned by Managers requiring your authorization.</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-tl-lg">User</th>
                      <th className="px-4 py-3 font-medium">Requested Role</th>
                      <th className="px-4 py-3 font-medium">Requested By</th>
                      <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-4 text-center">No pending requests.</td></tr>
                    ) : requests.map((req) => (
                      <tr key={req.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{req.full_name}</div>
                          <div className="text-xs text-zinc-500">{req.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md text-xs font-semibold">{req.role}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">{req.users?.full_name || 'Manager'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleRequestAction(req.id, 'APPROVED')} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors" title="Approve">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleRequestAction(req.id, 'REJECTED')} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors" title="Reject">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active Users Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Active Workspace Members
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{member.users?.full_name || 'Zoiko Employee'}</div>
                        <div className="text-xs text-zinc-500">{member.users?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          member.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400' :
                          member.role === 'MANAGER' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-emerald-500 text-xs font-medium">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
