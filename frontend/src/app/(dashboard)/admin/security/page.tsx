"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock, Users, FileSearch, ShieldCheck, AlertCircle,
  Loader2, RefreshCw, User, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface AuditEvent {
  id: string;
  action: string;
  actor_id: string;
  actor_email?: string;
  object_type: string;
  object_id?: string;
  outcome?: string;
  severity?: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
  status?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  HIGH:   "text-error-text bg-error-text/10 border border-error-border/20",
  MEDIUM: "text-warning-text bg-warning-text/10 border border-warning-border/20",
  LOW:    "text-info-text bg-info-text/10 border border-info-border/20",
  INFO:   "text-slate-400 bg-slate-400/10 border border-slate-400/20",
};

export default function SecurityCenterPage() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [members, setMembers]         = useState<TeamMember[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auditRes, membersRes] = await Promise.all([
        api.get("/api/v1/governance/audit/trail?limit=25"),
        api.get("/api/v1/team/members"),
      ]);
      setAuditEvents(auditRes.data || []);
      setMembers(membersRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load security data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const highCount = auditEvents.filter(e => (e.severity || "").toUpperCase() === "HIGH").length;

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-info-text" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Lock className="w-8 h-8 text-info-text" />
            Security Center
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">Monitor authentication events, audit activity, and workspace access.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-surface-hover hover:bg-surface-hover text-foreground-muted rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-error-text/10 border border-error-border/20 rounded-xl text-error-text text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-card border border-border rounded-2xl">
          <Users className="w-5 h-5 text-info-text mb-3" />
          <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">Team Members</p>
          <p className="text-3xl font-black text-foreground mt-1">{members.length}</p>
        </div>
        <div className="p-5 bg-card border border-border rounded-2xl">
          <FileSearch className="w-5 h-5 text-success-text mb-3" />
          <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">Recent Events</p>
          <p className="text-3xl font-black text-foreground mt-1">{auditEvents.length}</p>
        </div>
        <div className="p-5 bg-card border border-border rounded-2xl">
          <ShieldCheck className={`w-5 h-5 mb-3 ${highCount > 0 ? "text-error-text" : "text-success-text"}`} />
          <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">High Severity</p>
          <p className={`text-3xl font-black mt-1 ${highCount > 0 ? "text-error-text" : "text-foreground"}`}>{highCount}</p>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">Team Members &amp; Access</h2>
          <Link href="/team" className="flex items-center gap-1 text-xs text-info-text hover:underline">
            Manage <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {members.length === 0 ? (
            <p className="px-6 py-8 text-center text-foreground-muted text-sm">No members found</p>
          ) : members.map((m, i) => (
            <div key={m.id || i} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-info-text/10 border border-info-border/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-info-text" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.full_name || m.email || m.user_id}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">{m.email || m.user_id}</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-info-text/10 text-info-text border border-info-border/20">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Events */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">Recent Audit Events</h2>
          <Link href="/governance/audit" className="flex items-center gap-1 text-xs text-info-text hover:underline">
            Full trail <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {auditEvents.length === 0 ? (
            <p className="px-6 py-8 text-center text-foreground-muted text-sm">No recent audit events</p>
          ) : auditEvents.slice(0, 20).map((event, i) => {
            const sev = (event.severity || "INFO").toUpperCase();
            const style = SEVERITY_STYLES[sev] || SEVERITY_STYLES.INFO;
            return (
              <div key={event.id || i} className="px-6 py-3 flex items-start gap-3">
                <span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${style}`}>
                  {sev}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{event.action}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {event.object_type}
                    {event.outcome ? ` · ${event.outcome}` : ""}
                    {" · "}
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
