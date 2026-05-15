import React from 'react';
import { Bot, ChevronRight, Activity, Zap } from 'lucide-react';

interface AgentMetrics {
  id: string;
  name: string;
  model: string;
  accuracy: number;
  totalRequests: number;
  failureRate: number;
  escalationRate: number;
  qualityTrend: string;
}

export default function AgentLeaderboard({ agents }: { agents?: AgentMetrics[] }) {
  if (!agents) return <div className="h-64 animate-pulse bg-[var(--surface)] rounded-2xl" />;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
          <Bot className="w-5 h-5 mr-2 text-indigo-500" />
          Model Fleet Leaderboard
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Comparative performance of active autonomous nodes</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[var(--surface-hover)]/50 text-[var(--text-muted)] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Agent Node</th>
              <th className="px-6 py-4 font-medium">Model Core</th>
              <th className="px-6 py-4 font-medium text-right">Accuracy</th>
              <th className="px-6 py-4 font-medium text-right">Failure Rate</th>
              <th className="px-6 py-4 font-medium text-right">Escalations</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {agents.map((agent) => (
              <tr key={agent.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center mr-3 border border-indigo-500/20">
                      <Zap className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{agent.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{agent.totalRequests.toLocaleString()} inferences</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--sidebar-hover)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {agent.model}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end font-semibold text-[var(--text-primary)]">
                    {agent.accuracy}%
                  </div>
                  {/* Visual progress bar */}
                  <div className="w-16 h-1.5 bg-[var(--border)] rounded-full ml-auto mt-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${agent.accuracy}%` }} />
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-[var(--text-secondary)]">
                  {agent.failureRate}%
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${agent.escalationRate > 5 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {agent.escalationRate}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 rounded-xl bg-transparent text-[var(--text-muted)] hover:bg-[var(--sidebar-active)] hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
