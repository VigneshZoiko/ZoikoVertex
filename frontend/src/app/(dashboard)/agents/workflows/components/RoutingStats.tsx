import React from 'react';
import { Activity, Clock, ShieldAlert, GitMerge } from 'lucide-react';

interface Stats {
  completionRate: number;
  avgHandoffDelay: string;
  escalationRate: number;
  activeOrchestrations: number;
}

export default function RoutingStats({ data }: { data?: Stats }) {
  if (!data) return <div className="h-32 animate-pulse bg-[var(--surface)] rounded-2xl" />;

  const cards = [
    {
      title: 'Workflow Completion Rate',
      value: `${data.completionRate}%`,
      icon: Activity,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Active Orchestrations',
      value: data.activeOrchestrations,
      icon: GitMerge,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    },
    {
      title: 'Avg. Handoff Delay',
      value: data.avgHandoffDelay,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Escalation Rate',
      value: `${data.escalationRate}%`,
      icon: ShieldAlert,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-hover)] transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">{card.title}</h3>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
