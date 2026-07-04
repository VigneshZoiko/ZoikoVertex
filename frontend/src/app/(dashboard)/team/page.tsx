"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Users, UserPlus, ShieldAlert, Check, X, Shield,
  RefreshCw, Trash2, AlertTriangle, Lock, ChevronDown,
} from "lucide-react";
import { ROLE_ARCHITECTURE } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import { useRoleContext } from "@/lib/context/RoleContext";

/* ── Plan → available roles ───────────────────────────────────────────────── */
const PLAN_ROLES: Record<string, string[]> = {
  FREE: [
    "CREATOR", "REVIEWER", "VIEWER", "ANALYST",
  ],
  GROWTH: [
    "CREATOR", "REVIEWER", "VIEWER", "ANALYST",
    "CAMPAIGN_MANAGER", "AGENT_OPERATOR", "KNOWLEDGE_MANAGER",
    "APPROVER", "PUBLISHER", "VALIDATOR", "BRAND_REVIEWER", "DEVELOPER",
  ],
  SCALE: [
    "CREATOR", "REVIEWER", "VIEWER", "ANALYST",
    "CAMPAIGN_MANAGER", "AGENT_OPERATOR", "KNOWLEDGE_MANAGER",
    "APPROVER", "PUBLISHER", "VALIDATOR", "BRAND_REVIEWER", "DEVELOPER",
    "AGENT_ARCHITECT", "GOVERNANCE_ADMIN", "AUDITOR", "COMPLIANCE_REVIEWER", "ADMIN",
  ],
  ENTERPRISE: [
    "WORKSPACE_OWNER", "ADMIN", "SECURITY_ADMIN", "GOVERNANCE_ADMIN",
    "AGENT_ARCHITECT", "AGENT_OPERATOR", "KNOWLEDGE_MANAGER", "CAMPAIGN_MANAGER",
    "CREATOR", "BRAND_REVIEWER", "REVIEWER", "VALIDATOR", "APPROVER", "PUBLISHER",
    "COMPLIANCE_REVIEWER", "AUDITOR", "ANALYST", "PRIVACY_ADMIN", "DEVELOPER",
    "VIEWER",
  ],
};

const PLAN_ORDER  = ["FREE", "GROWTH", "SCALE", "ENTERPRISE"] as const;
const PLAN_LABELS: Record<string, string> = {
  FREE: "Starter", GROWTH: "Growth", SCALE: "Scale", ENTERPRISE: "Enterprise",
};

const ROLE_GROUPS = [
  { group: "Build Control",      roles: ["WORKSPACE_OWNER","ADMIN","AGENT_ARCHITECT","AGENT_OPERATOR","KNOWLEDGE_MANAGER","CAMPAIGN_MANAGER","CREATOR","DEVELOPER"] },
  { group: "Governance Control", roles: ["GOVERNANCE_ADMIN","SECURITY_ADMIN","PRIVACY_ADMIN","COMPLIANCE_REVIEWER","AUDITOR"] },
  { group: "Output Control",     roles: ["BRAND_REVIEWER","REVIEWER","VALIDATOR","APPROVER","PUBLISHER","ANALYST"] },
  { group: "External",           roles: ["VIEWER"] },
];

export default function TeamPage() {
  const { role: currentUserRole, isSuperAdmin, isLoading } = useRoles();
  const { planType } = useRoleContext();
  const [workspaceId, setWorkspaceId]     = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [members,  setMembers]  = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Provision form
  const [fullName, setFullName]               = useState("");
  const [email, setEmail]                     = useState("");
  const [role, setRole]                       = useState("CREATOR");
  const [password, setPassword]               = useState("");
  const [formLoading, setFormLoading]         = useState(false);
  const [message, setMessage]                 = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role dropdown
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const dropdownRef                           = useRef<HTMLDivElement>(null);

  // Delete confirm
  const [confirmDelete, setConfirmDelete]     = useState<string | null>(null); // user id
  const [deleting, setDeleting]               = useState<string | null>(null);

  // Inline role change
  const [editingRoleFor, setEditingRoleFor]   = useState<string | null>(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState<string | null>(null);
  const roleEditRef                           = useRef<HTMLDivElement>(null);

  // Plan-gating helpers
  const effectivePlan = isSuperAdmin ? "ENTERPRISE" : (planType?.toUpperCase() ?? "FREE");
  const availableRoles = new Set(PLAN_ROLES[effectivePlan] ?? PLAN_ROLES.FREE);
  const isRoleLocked = (roleId: string) => !availableRoles.has(roleId);
  const getRequiredPlan = (roleId: string) => {
    for (const p of PLAN_ORDER) {
      if (PLAN_ROLES[p].includes(roleId)) return PLAN_LABELS[p];
    }
    return "Enterprise";
  };
  const selectedRoleName = ROLE_ARCHITECTURE.find(r => r.id === role)?.name ?? role;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (roleEditRef.current && !roleEditRef.current.contains(e.target as Node)) {
        setEditingRoleFor(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const membersRes = await api.get("/api/v1/team/members");
      if (membersRes.success) setMembers(membersRes.data || []);
    } catch {
      setMembers([]);
    }
    if (currentUserRole === "ADMIN" || isSuperAdmin) {
      try {
        const requestsRes = await api.get("/api/v1/team/requests");
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
          const result = await api.get("/api/v1/user/context");
          if (result?.success) {
            setWorkspaceId(result?.data?.workspace_id);
            setCurrentUserId(result?.data?.id);
          }
          fetchData();
        } catch {
          setLoading(false);
        }
      };
      init();
    }
  }, [isLoading, currentUserRole, isSuperAdmin, fetchData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setEditingRoleFor(null);
    setRoleChangeLoading(userId);
    try {
      const res = await api.patch(`/api/v1/team/members/${userId}/role`, { role: newRole });
      if (res.success) {
        setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
        setMessage({ type: "success", text: `Role updated to ${newRole.replace(/_/g, " ")}.` });
      } else {
        setMessage({ type: "error", text: res.error?.message || "Failed to update role." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update role. Please try again." });
    } finally {
      setRoleChangeLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMembers) return;
    if (password.length < 8) { setMessage({ type: "error", text: "Password must be at least 8 characters" }); return; }
    setFormLoading(true);
    setMessage(null);
    try {
      const r = await api.post("/api/v1/users/provision", {
        full_name: fullName, email, role, password,
      });
      if (r.success === false) { setMessage({ type: "error", text: r.error || "Failed" }); setFormLoading(false); return; }
      setMessage({ type: "success", text: "User provisioned successfully!" });
      setFullName(""); setEmail(""); setPassword("");
      fetchData();
    } catch {
      setMessage({ type: "error", text: "Failed to provision user. Ensure server is running." });
    }
    setFormLoading(false);
  };

  const handleRequestAction = async (requestId: string, action: "APPROVED" | "REJECTED") => {
    if (action === "APPROVED") {
      const req = requests.find(r => r.id === requestId);
      if (req) {
        setFormLoading(true);
        try {
          const r = await api.post("/api/v1/users/provision", {
            full_name: req.full_name,
            email: req.email,
            role: req.role,
            password: req.temporary_password || "TempPass123!",
          });
          if (r.success === false) { setMessage({ type: "error", text: r.error || "Failed" }); setFormLoading(false); return; }
        } catch {
          setMessage({ type: "error", text: "Backend connection failed." });
          setFormLoading(false);
          return;
        }
        setFormLoading(false);
      }
    }
    try {
      await api.put(`/api/v1/team/requests/${requestId}`, { status: action });
    } catch { /* fallback */ }
    fetchData();
  };

  const handleDeleteMember = async (userId: string) => {
    setConfirmDelete(null);
    setDeleting(userId);
    try {
      const res = await api.delete(`/api/v1/team/members/${userId}`);
      if (res.success) {
        setMembers(prev => prev.filter(m => m.id !== userId));
        setMessage({ type: "success", text: "Member account permanently deleted." });
      } else {
        setMessage({ type: "error", text: res.error?.message || "Failed to delete member." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete member. Please try again." });
    } finally {
      setDeleting(null);
    }
  };

  const canManageMembers = currentUserRole === "ADMIN" || currentUserRole === "WORKSPACE_OWNER" || isSuperAdmin;

  if (loading) return <div className="text-[var(--foreground)] p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Access & Organization</h1>
          <p className="text-[var(--foreground-muted)] text-sm">Provision and manage RBAC roles for your workspace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Provision Form ── */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 rounded-lg bg-info-text/10 flex items-center justify-center mr-3">
                <UserPlus className="w-4 h-4 text-info-text" />
              </div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Provision User</h2>
            </div>

            {!canManageMembers && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <Lock className="w-8 h-8 text-[var(--foreground-muted)]" />
                <p className="text-sm font-medium text-[var(--foreground)]">Admin access required</p>
                <p className="text-xs text-[var(--foreground-muted)]">Only Administrators and Workspace Owners can provision users. Contact your admin.</p>
              </div>
            )}

            {canManageMembers && (<>

            {message && (
              <div className={`mb-4 p-3 text-sm rounded-lg border ${
                message.type === "success"
                  ? "bg-success-text/10 border-success-border/20 text-success-text"
                  : "bg-error-text/10 border-error-border/20 text-error-text"
              }`}>
                {message.text}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1.5">Full Name</label>
                <input
                  type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-info-border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1.5">Corporate Email</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-info-border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1.5">Assign Role</label>
                <div ref={dropdownRef} className="relative">
                  {/* Trigger */}
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(o => !o)}
                    className="w-full flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-info-border text-sm hover:border-info-border/50 transition-colors"
                  >
                    <span>{selectedRoleName}</span>
                    <ChevronDown className={`w-4 h-4 text-[var(--foreground-muted)] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Panel */}
                  {dropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto py-1">
                        {ROLE_GROUPS.map(({ group, roles: groupRoles }) => (
                          <div key={group}>
                            {/* Group header */}
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] bg-[var(--surface)]/60 border-b border-[var(--border)]/50">
                              {group}
                            </div>
                            {ROLE_ARCHITECTURE.filter(r => groupRoles.includes(r.id) && r.id !== "WORKSPACE_OWNER" && (isSuperAdmin || r.id !== "ADMIN")).map(r => {
                              const locked = isRoleLocked(r.id);
                              const reqPlan = locked ? getRequiredPlan(r.id) : null;
                              const isOwner = r.id === "WORKSPACE_OWNER";
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  disabled={locked}
                                  onClick={() => { if (!locked) { setRole(r.id); setDropdownOpen(false); } }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors
                                    ${locked
                                      ? "opacity-40 cursor-not-allowed"
                                      : role === r.id
                                        ? "bg-info-text/15 text-info-text"
                                        : "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                                    }`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{r.name}</span>
                                    {isOwner && (
                                      <span className="text-[9px] text-[var(--foreground-muted)]">Workspace-level only · Not Platform Owner</span>
                                    )}
                                  </div>
                                  {locked ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-warning-text/80 bg-warning-text/10 border border-warning-border/20 rounded px-1.5 py-0.5 shrink-0">
                                      <Lock className="w-2.5 h-2.5" />
                                      {reqPlan}+
                                    </span>
                                  ) : role === r.id ? (
                                    <Check className="w-3.5 h-3.5 text-info-text shrink-0" />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {/* Upgrade nudge */}
                      {effectivePlan !== "ENTERPRISE" && (
                        <div className="px-3 py-2 border-t border-[var(--border)]/50 bg-[var(--surface)]/40 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-warning-text/70 shrink-0" />
                          <span className="text-[10px] text-[var(--foreground-muted)]">
                            Locked roles require a higher plan. Upgrade in{" "}
                            <span className="text-warning-text/90 font-semibold">Settings → Billing</span>.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1.5">Temporary Password</label>
                <input
                  type="text" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-info-border text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit" disabled={formLoading}
                  className="w-full flex items-center justify-center py-2.5 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Provision Account Immediately"}
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-[var(--surface)]/60 border border-[var(--border)]/50 rounded-lg">
              <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">
                <span className="font-semibold text-[var(--foreground)]">Workspace Owner</span> grants full workspace-level authority.{" "}
                <span className="font-semibold text-[var(--foreground)]">Platform Owner</span> is a separate platform-level role managed outside this form.
              </p>
            </div>
            </>)}
          </div>
        </div>

        {/* ── Right: Tables ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Pending Approvals — Admin / Superadmin only */}
          {(currentUserRole === "ADMIN" || isSuperAdmin) && (
            <div className="bg-[var(--card)] border border-warning-border/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <ShieldAlert className="w-32 h-32 text-warning-text" />
              </div>
              <h2 className="text-lg font-bold text-[var(--foreground)] mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-warning-text" />
                Pending Account Approvals
              </h2>
              <p className="text-sm text-[var(--foreground-muted)] mb-6">Users provisioned by Managers requiring your authorization.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm text-[var(--foreground-muted)]">
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
                    ) : requests.map(req => (
                      <tr key={req.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-[var(--foreground)] font-medium">{req.full_name}</div>
                          <div className="text-xs text-[var(--foreground-muted)]">{req.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-info-text/10 text-info-text px-2 py-1 rounded-md text-xs font-semibold">{req.role}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">{req.users?.full_name || "Manager"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleRequestAction(req.id, "APPROVED")} className="p-1.5 text-success-text hover:bg-success-text/10 rounded-md transition-colors" title="Approve">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleRequestAction(req.id, "REJECTED")} className="p-1.5 text-error-text hover:bg-error-text/10 rounded-md transition-colors" title="Reject">
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

          {/* Active Members Table */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-info-text" />
              Active Workspace Members
              <span className="ml-auto text-xs text-[var(--foreground-muted)] font-normal">{members.length} members</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm text-[var(--foreground-muted)]">
                <thead className="text-xs text-[var(--foreground-muted)] uppercase bg-[var(--surface)]/50">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    {canManageMembers && (
                      <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={canManageMembers ? 4 : 3} className="px-4 py-8 text-center text-[var(--foreground-muted)]">
                        No active members found.
                      </td>
                    </tr>
                  ) : members.map((member, i) => {
                    const isSelf = member.id === currentUserId;
                    const isOwner = member.role === "WORKSPACE_OWNER";
                    const canDelete = canManageMembers && !isSelf && !isOwner;

                    return (
                      <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-hover)] transition-colors group">

                        {/* Name + email */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-sm font-bold text-foreground shadow-inner shrink-0">
                              {(member.full_name || member.email || "Z").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--foreground)] font-bold text-sm group-hover:text-info-text transition-colors">
                                  {member.full_name || "Zoiko Employee"}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-info-text/10 border border-info-border/20 text-info-text rounded font-semibold">You</span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--foreground-muted)]">{member.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role badge — click to change for eligible members */}
                        <td className="px-4 py-4">
                          {canManageMembers && !isSelf && !isOwner ? (
                            <div className="relative inline-block" ref={editingRoleFor === member.id ? roleEditRef : null}>
                              <button
                                onClick={() => setEditingRoleFor(editingRoleFor === member.id ? null : member.id)}
                                disabled={roleChangeLoading === member.id}
                                title="Click to change role"
                                className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${
                                  member.role === "ADMIN" || member.role?.includes("ADMIN") || member.role?.includes("OWNER")
                                    ? "bg-error-text/10 border border-error-border/20 text-error-text"
                                    : member.role?.includes("MANAGER") || member.role?.includes("REVIEWER")
                                    ? "bg-warning-text/10 border border-warning-border/20 text-warning-text"
                                    : "bg-info-text/10 border border-info-border/20 text-info-text"
                                }`}
                              >
                                {roleChangeLoading === member.id
                                  ? <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  : <>{(member.role || "MEMBER").replace(/_/g, " ")} <ChevronDown className="w-2.5 h-2.5 opacity-60" /></>}
                              </button>
                              {editingRoleFor === member.id && (
                                <div className="absolute z-50 left-0 top-full mt-1 w-52 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
                                  <div className="max-h-56 overflow-y-auto py-1">
                                    {ROLE_GROUPS.map(({ group, roles: groupRoles }) => (
                                      <div key={group}>
                                        <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] bg-[var(--surface)]/60 border-b border-[var(--border)]/50">{group}</div>
                                        {ROLE_ARCHITECTURE.filter(r => groupRoles.includes(r.id) && r.id !== "WORKSPACE_OWNER" && (isSuperAdmin || r.id !== "ADMIN")).map(r => {
                                          const locked = isRoleLocked(r.id);
                                          return (
                                            <button
                                              key={r.id}
                                              type="button"
                                              disabled={locked}
                                              onClick={() => handleRoleChange(member.id, r.id)}
                                              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                                                locked ? "opacity-40 cursor-not-allowed" :
                                                member.role === r.id ? "bg-info-text/15 text-info-text" :
                                                "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                                              }`}
                                            >
                                              <span>{r.name}</span>
                                              {member.role === r.id && <Check className="w-3 h-3 text-info-text shrink-0" />}
                                              {locked && <Lock className="w-2.5 h-2.5 text-warning-text/60 shrink-0" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${
                              member.role === "ADMIN" || member.role?.includes("ADMIN") || member.role?.includes("OWNER")
                                ? "bg-error-text/10 border border-error-border/20 text-error-text"
                                : member.role?.includes("MANAGER") || member.role?.includes("REVIEWER")
                                ? "bg-warning-text/10 border border-warning-border/20 text-warning-text"
                                : "bg-info-text/10 border border-info-border/20 text-info-text"
                            }`}>
                              {(member.role || "MEMBER").replace(/_/g, " ")}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-text/10 border border-success-border/20 text-success-text text-xs font-bold">
                            <div className="w-1.5 h-1.5 rounded-full bg-success-text animate-pulse" />
                            Active
                          </span>
                        </td>

                        {/* Delete action */}
                        {canManageMembers && (
                          <td className="px-4 py-4 text-right w-20">
                            {canDelete ? (
                              <button
                                onClick={() => setConfirmDelete(member.id)}
                                disabled={deleting === member.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-error-text/10 hover:bg-error-text/20 border border-error-border/20 text-error-text text-[11px] font-semibold rounded-lg transition-all disabled:opacity-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                {deleting === member.id
                                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                                  : <Trash2 className="w-3 h-3" />}
                                Remove
                              </button>
                            ) : (
                              <span className="text-[10px] text-[var(--foreground-muted)] opacity-40 select-none">
                                {isSelf ? "You" : isOwner ? "Owner" : ""}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {canManageMembers && (
              <p className="text-[11px] text-[var(--foreground-muted)] mt-4 opacity-60">
                Deleting a member permanently removes their account and access. Their name will appear as &quot;Name (ex-Role)&quot; in audit logs.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (() => {
        const target = members.find(m => m.id === confirmDelete);
        if (!target) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[var(--card)] border border-error-border/30 rounded-2xl w-full max-w-sm shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-error-text/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-error-text" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Delete Member Account</h3>
                  <p className="text-xs text-[var(--foreground-muted)] mt-0.5">This action is permanent and cannot be undone.</p>
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                    {(target.full_name || target.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{target.full_name || "Unknown"}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{target.email}</p>
                  </div>
                  <span className="ml-auto text-[10px] px-2 py-0.5 bg-info-text/10 border border-info-border/20 text-info-text rounded font-bold">
                    {(target.role || "MEMBER").replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--foreground-muted)] mb-5 leading-relaxed">
                Their account will be permanently deleted. In audit logs they will appear as{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {target.full_name?.split(" ")[0] || target.email?.split("@")[0]} (ex-{(target.role || "Member").replace(/_/g, " ")})
                </span>.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMember(target.id)}
                  disabled={deleting === target.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-error-text hover:bg-error-text text-foreground rounded-xl transition-all disabled:opacity-50"
                >
                  {deleting === target.id
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <><Trash2 className="w-4 h-4" /> Delete Account</>
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
