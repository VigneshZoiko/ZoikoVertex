"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import RoutingStats from "./components/RoutingStats";
import WorkflowCanvas from "./components/WorkflowCanvas";
import ActiveOrchestrations from "./components/ActiveOrchestrations";
import EscalationPaths from "./components/EscalationPaths";
import { RefreshCw, GitBranch, ShieldCheck, FileCheck2, AlertTriangle } from "lucide-react";

interface WorkflowRecord {
  id: string;
  name: string;
  status: string;
  nodes: number;
  conditionalGates: number;
  lastRun: string | null;
}

interface ApprovalStats {
  counts?: {
    total_pending?: number;
    pending_validation?: number;
    pending_authorization?: number;
    pending_governance?: number;
  };
}

export default function WorkflowsPage() {
  const [stats, setStats] = useState<any>(undefined);
  const [graph, setGraph] = useState<any>(undefined);
  const [active, setActive] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[] | undefined>(undefined);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, graphRes, activeRes, escalationsRes, workflowsRes, approvalsRes] = await Promise.all([
        api.get("/api/v1/agents/workflows/stats"),
        api.get("/api/v1/agents/workflows/graph"),
        api.get("/api/v1/agents/workflows/active"),
        api.get("/api/v1/agents/workflows/escalations"),
        api.get("/api/v1/agents/workflows"),
        api.get("/api/v1/approvals/stats"),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (graphRes.success) setGraph(graphRes.data);
      if (activeRes.success) setActive(activeRes.data);
      if (escalationsRes.success) setEscalations(escalationsRes.data);
      if (workflowsRes.success) setWorkflows(workflowsRes.data || []);
      if (approvalsRes.success) setApprovalStats(approvalsRes.data || null);
    } catch (err) {
      console.error("Failed to load workflows data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 20000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <GitBranch className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Agent Workflows</h1>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">Governed execution circuits with chained actions, decision gates, approvals, and escalation paths.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Auto-refresh every 20s
          </div>
          <button onClick={fetchAll} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <RoutingStats data={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Governed Workflow Registry</h2>
          </div>
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{workflow.name}</p>
                  <span className="text-[10px] uppercase tracking-widest text-indigo-400">{workflow.status}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  {workflow.nodes} nodes, {workflow.conditionalGates} conditional gates, last run {workflow.lastRun ? new Date(workflow.lastRun).toLocaleString() : "not executed"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileCheck2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Approval Gates</h2>
          </div>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p>Total pending: <span className="text-[var(--text-primary)] font-semibold">{approvalStats?.counts?.total_pending ?? 0}</span></p>
            <p>Validation: <span className="text-[var(--text-primary)] font-semibold">{approvalStats?.counts?.pending_validation ?? 0}</span></p>
            <p>Authorization: <span className="text-[var(--text-primary)] font-semibold">{approvalStats?.counts?.pending_authorization ?? 0}</span></p>
            <p>Governance: <span className="text-[var(--text-primary)] font-semibold">{approvalStats?.counts?.pending_governance ?? 0}</span></p>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Execution Doctrine</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Every workflow acts as a machine-readable operating agreement: who may act, what knowledge may be used,
            which approvals are required, and what evidence must be captured before execution continues.
          </p>
        </div>
      </div>

      <WorkflowCanvas graph={graph} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <ActiveOrchestrations data={active} />
        </div>
        <div className="xl:col-span-2">
          <EscalationPaths escalations={escalations} />
        </div>
      </div>
    </div>
  );
}
