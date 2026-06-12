import React from 'react';
import { Activity, Clock, ShieldAlert, GitMerge, BarChart2, PackageCheck, Zap, Users } from 'lucide-react';

interface Stats {
  completionRate: number;
  avgHandoffDelay: string;
  escalationRate: number;
  activeOrchestrations: number;
  // Extended fields per doc section 14
  avgApprovalTime?: string;
  blockedRunRate?: number;
  slaBreachRate?: number;
  policyFailureRate?: number;
  overrideRate?: number;
  evidenceComplete?: number;
}

export default function RoutingStats({ data }: { data?: Stats }) {
  if (!data) return <div className="h-32 animate-pulse bg-[var(--surface)] rounded-2xl" />;

  const cards = [
    {
      title: 'Workflow Completion Rate',
      value: `${data.completionRate}%`,
      icon: Activity,
      color: 'text-success-text',
      bg: 'bg-success-text/10',
      desc: 'Instances completed successfully'
    },
    {
      title: 'Active Orchestrations',
      value: data.activeOrchestrations,
      icon: GitMerge,
      color: 'text-info-text',
      bg: 'bg-info-text/10',
      desc: 'Live workflow instances running'
    },
    {
      title: 'Avg. Handoff Delay',
      value: data.avgHandoffDelay,
      icon: Clock,
      color: 'text-warning-text',
      bg: 'bg-warning-text/10',
      desc: 'Step-to-step transition time'
    },
    {
      title: 'Escalation Rate',
      value: `${data.escalationRate}%`,
      icon: ShieldAlert,
      color: 'text-error-text',
      bg: 'bg-error-text/10',
      desc: 'Runs routed to higher authority'
    },
    {
      title: 'Avg. Approval Time',
      value: data.avgApprovalTime ?? '—',
      icon: Users,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
      desc: 'From request to decision'
    },
    {
      title: 'Blocked-Run Rate',
      value: data.blockedRunRate != null ? `${data.blockedRunRate}%` : '—',
      icon: Zap,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      desc: 'Policy or dependency blocks'
    },
    {
      title: 'SLA Breach Rate',
      value: data.slaBreachRate != null ? `${data.slaBreachRate}%` : '—',
      icon: BarChart2,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      desc: 'Steps completed after deadline'
    },
    {
      title: 'Evidence Completeness',
      value: data.evidenceComplete != null ? `${data.evidenceComplete}%` : '—',
      icon: PackageCheck,
      color: 'text-teal-500',
      bg: 'bg-teal-500/10',
      desc: 'Runs with full evidence bundles'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 hover:border-[var(--border-hover)] transition-all"
        >
          <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} w-fit mb-3`}>
            <card.icon className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{typeof card.value === 'object' ? '—' : card.value}</p>
          <h3 className="text-[var(--text-secondary)] text-[10px] font-semibold mt-1 leading-snug">{card.title}</h3>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5 leading-snug">{card.desc}</p>
        </div>
      ))}
    </div>
  );
}