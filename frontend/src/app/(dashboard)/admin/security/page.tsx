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
  HIGH:   "text-rose-400 bg-rose-400/10 border border-rose-400/20",
  MEDIUM: "text-amber-400 bg-amber-400/10 border border-amber-400/20",
  LOW:    "text-indigo-400 bg-indigo-400/10 border border-indigo-400/20",
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Lock className="w-8 h-8 text-indigo-500" />
            Security Center
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1 text-sm">Monitor authentication events, audit activity, and workspace access.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl">
          <Users className="w-5 h-5 text-indigo-400 mb-3" />
          <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium uppercase tracking-wider">Team Members</p>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{members.length}</p>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl">
          <FileSearch className="w-5 h-5 text-emerald-400 mb-3" />
          <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium uppercase tracking-wider">Recent Events</p>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{auditEvents.length}</p>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl">
          <ShieldCheck className={`w-5 h-5 mb-3 ${highCount > 0 ? "text-rose-400" : "text-emerald-400"}`} />
          <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium uppercase tracking-wider">High Severity</p>
          <p className={`text-3xl font-black mt-1 ${highCount > 0 ? "text-rose-400" : "text-gray-900 dark:text-white"}`}>{highCount}</p>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">Team Members &amp; Access</h2>
          <Link href="/team" className="flex items-center gap-1 text-xs text-indigo-400 hover:underline">
            Manage <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-zinc-800/50">
          {members.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400 dark:text-zinc-600 text-sm">No members found</p>
          ) : members.map((m, i) => (
            <div key={m.id || i} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.full_name || m.email || m.user_id}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{m.email || m.user_id}</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Events */}
      <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">Recent Audit Events</h2>
          <Link href="/governance/audit" className="flex items-center gap-1 text-xs text-indigo-400 hover:underline">
            Full trail <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-zinc-800/50">
          {auditEvents.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400 dark:text-zinc-600 text-sm">No recent audit events</p>
          ) : auditEvents.slice(0, 20).map((event, i) => {
            const sev = (event.severity || "INFO").toUpperCase();
            const style = SEVERITY_STYLES[sev] || SEVERITY_STYLES.INFO;
            return (
              <div key={event.id || i} className="px-6 py-3 flex items-start gap-3">
                <span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${style}`}>
                  {sev}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-zinc-200 font-medium truncate">{event.action}</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">
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
