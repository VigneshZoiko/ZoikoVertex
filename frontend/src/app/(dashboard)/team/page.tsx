"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, UserPlus, ShieldAlert, Check, X, Shield, RefreshCw, ChevronRight } from "lucide-react";
import { ROLE_ARCHITECTURE } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";

export default function TeamPage() {
  const { role: currentUserRole, isSuperAdmin, isLoading } = useRoles();
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
  const [showAdvancedRoles, setShowAdvancedRoles] = useState(false);

  const fetchData = useCallback(async () => {
    // Fetch Active Members
    try {
      const membersRes = await api.get('/api/v1/team/members');
      if (membersRes.success) setMembers(membersRes.data || []);
    } catch {
      setMembers([]);
    }
 
    // Fetch Pending Requests (Only if Admin or Superadmin)
    if (currentUserRole === 'ADMIN' || isSuperAdmin) {
      try {
        const requestsRes = await api.get('/api/v1/team/requests');
        if (requestsRes.success) setRequests(requestsRes.data || []);
      } catch {
        setRequests([]);
      }
    }
    setLoading(false);
  }, [currentUserRole, isSuperAdmin]);

  useEffect(() => {
    if (!isLoading) {
      const init = async () => {
        try {
          const result = await api.get('/api/v1/user/context');
          if (result.success) {
            setWorkspaceId(result.data.workspace_id);
          }
          fetchData();
        } catch {
          setLoading(false);
        }
      };
      init();
    }
  }, [isLoading, currentUserRole, isSuperAdmin, fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage(null);

    if (currentUserRole === 'MANAGER' && !isSuperAdmin) {
      try {
        await api.post('/api/v1/team/requests', {
          full_name: fullName,
          email,
          role,
          temporary_password: password,
        });
        setMessage({ type: 'success', text: 'Request submitted to Admin for approval.' });
        setFullName(""); setEmail(""); setPassword("");
      } catch {
        setMessage({ type: 'error', text: 'Failed to submit request. Please try again.' });
      }
    } else if (currentUserRole === 'ADMIN' || isSuperAdmin) {
      // Provision immediately via backend API
      try {
        await api.post('/api/v1/users/provision', {
          workspace_id: workspaceId || '00000000-0000-0000-0000-000000000000',
          full_name: fullName,
          email: email,
          role: role,
          password: password
        });
        
        setMessage({ type: 'success', text: 'User provisioned successfully!' });
        setFullName(""); setEmail(""); setPassword("");
        fetchData(); // Refresh tables
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
    
    try {
      await api.put(`/api/v1/team/requests/${requestId}`, { status: action });
    } catch {
      // fallback
    }
    fetchData();
  };

  if (loading) return <div className="text-[var(--foreground)] p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Team Access</h1>
          <p className="text-[var(--foreground-muted)] text-sm">Provision and manage RBAC roles for your workspace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mr-3">
                <UserPlus className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Provision User</h2>
            </div>

            {message && (
              <div className={`mb-4 p-3 text-sm rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                {message.text}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1.5">Full Name</label>
                <input 
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1.5">Corporate Email</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[var(--foreground-muted)]">Assign Role</label>
                  <button 
                    type="button"
                    onClick={() => setShowAdvancedRoles(!showAdvancedRoles)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1"
                  >
                    {showAdvancedRoles ? "Standard Roles" : "Enterprise Roles"}
                    <ChevronRight className={`w-2.5 h-2.5 transition-transform ${showAdvancedRoles ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                <select 
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 text-sm"
                >
                  {!showAdvancedRoles ? (
                    <>
                      <optgroup label="— Build Layer">
                        <option value="CREATOR">Contributor — drafts only</option>
                        <option value="CAMPAIGN_MANAGER">Campaign Manager — campaign execution</option>
                        <option value="AGENT_OPERATOR">Agent Operator — live agent supervision</option>
                        <option value="KNOWLEDGE_MANAGER">Knowledge Manager — RAG & sources</option>
                      </optgroup>
                      <optgroup label="— Output Layer">
                        <option value="REVIEWER">Reviewer — general content review</option>
                        <option value="VALIDATOR">Validator — HITL accuracy validation</option>
                        <option value="APPROVER">Approver — formal approval authority</option>
                        <option value="PUBLISHER">Publisher — live publishing</option>
                      </optgroup>
                      {currentUserRole === 'ADMIN' && (
                        <optgroup label="— Administration">
                          <option value="ADMIN">Administrator — full workspace control</option>
                          <option value="GOVERNANCE_ADMIN">Governance Lead — policies & rules</option>
                        </optgroup>
                      )}
                    </>
                  ) : (
                    [
                      { group: "Build Control", roles: ["WORKSPACE_OWNER","ADMIN","AGENT_ARCHITECT","AGENT_OPERATOR","KNOWLEDGE_MANAGER","CAMPAIGN_MANAGER","CREATOR","DEVELOPER"] },
                      { group: "Governance Control", roles: ["GOVERNANCE_ADMIN","SECURITY_ADMIN","PRIVACY_ADMIN","COMPLIANCE_REVIEWER","AUDITOR"] },
                      { group: "Output Control", roles: ["BRAND_REVIEWER","REVIEWER","VALIDATOR","APPROVER","PUBLISHER","ANALYST"] },
                      { group: "External", roles: ["EXTERNAL_COLLABORATOR","VIEWER"] },
                    ].map(({ group, roles }) => (
                      <optgroup key={group} label={`— ${group}`}>
                        {ROLE_ARCHITECTURE.filter(r => roles.includes(r.id)).map(r => (
                          <option key={r.id} value={r.id}>{r.name} — {r.description.slice(0, 50)}</option>
                        ))}
                      </optgroup>
                    ))
                  )}
                </select>

              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1.5">Temporary Password</label>
                <input 
                  type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 text-sm"
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
          
          {/* Pending Approvals Table (Admin or Superadmin Only) */}
          {(currentUserRole === 'ADMIN' || isSuperAdmin) && (
            <div className="bg-[var(--card)] border border-amber-500/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <ShieldAlert className="w-32 h-32 text-amber-500" />
              </div>
              
              <h2 className="text-lg font-bold text-[var(--foreground)] mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Pending Account Approvals
              </h2>
              <p className="text-sm text-[var(--foreground-muted)] mb-6">Users provisioned by Managers requiring your authorization.</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[var(--foreground-muted)]">
                  <thead className="text-xs text-[var(--foreground-muted)] uppercase bg-[var(--surface)]/50">
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
                      <tr key={req.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-[var(--foreground)] font-medium">{req.full_name}</div>
                          <div className="text-xs text-[var(--foreground-muted)]">{req.email}</div>
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
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Active Workspace Members
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--foreground-muted)]">
                <thead className="text-xs text-[var(--foreground-muted)] uppercase bg-[var(--surface)]/50">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-[var(--foreground)] font-medium">{member.full_name || 'Zoiko Employee'}</div>
                        <div className="text-xs text-[var(--foreground-muted)]">{member.email}</div>
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
