"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import RoutingStats from './components/RoutingStats';
import WorkflowCanvas from './components/WorkflowCanvas';
import ActiveOrchestrations from './components/ActiveOrchestrations';
import EscalationPaths from './components/EscalationPaths';
import { RefreshCw, GitBranch } from 'lucide-react';

export default function WorkflowsPage() {
  const [stats, setStats] = useState<any>(undefined);
  const [graph, setGraph] = useState<any>(undefined);
  const [active, setActive] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, graphRes, activeRes, escalationsRes] = await Promise.all([
        api.get('/api/v1/agents/workflows/stats'),
        api.get('/api/v1/agents/workflows/graph'),
        api.get('/api/v1/agents/workflows/active'),
        api.get('/api/v1/agents/workflows/escalations'),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (graphRes.success) setGraph(graphRes.data);
      if (activeRes.success) setActive(activeRes.data);
      if (escalationsRes.success) setEscalations(escalationsRes.data);
    } catch (err) {
      console.error('Failed to load workflows data', err);
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

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <GitBranch className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Agent Workflows
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">
              Multi-agent orchestration, chained actions, conditional logic, and escalation paths
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Auto-refresh every 20s
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Routing Stats ── */}
      <RoutingStats data={stats} />

      {/* ── Workflow Canvas ── */}
      <WorkflowCanvas graph={graph} />

      {/* ── Live Feed + Escalations ── */}
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
