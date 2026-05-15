import React from 'react';
import { Target, AlertOctagon, RefreshCw, BarChart2, TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryData {
  globalAccuracy: number;
  accuracyTrend: number;
  failureRate: number;
  failureRateTrend: number;
  hallucinationFlags: number;
  hallucinationTrend: number;
  escalationRate: number;
  escalationTrend: number;
}

export default function PerformanceOverviewCards({ data }: { data?: SummaryData }) {
  if (!data) return <div className="animate-pulse flex gap-4 h-32 w-full bg-[var(--surface)] rounded-2xl" />;

  const cards = [
    {
      title: 'Global Accuracy',
      value: `${data.globalAccuracy}%`,
      trend: data.accuracyTrend,
      icon: Target,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Failure Rate',
      value: `${data.failureRate}%`,
      trend: data.failureRateTrend,
      icon: AlertOctagon,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      invertTrend: true
    },
    {
      title: 'Hallucination Flags',
      value: data.hallucinationFlags,
      trend: data.hallucinationTrend,
      icon: RefreshCw,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      invertTrend: true
    },
    {
      title: 'Escalation Rate',
      value: `${data.escalationRate}%`,
      trend: data.escalationTrend,
      icon: BarChart2,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      invertTrend: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => {
        const isPositiveTrend = card.invertTrend ? card.trend < 0 : card.trend > 0;
        
        return (
          <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-hover)] transition-all group overflow-hidden relative">
            {/* Subtle glow effect */}
            <div className={`absolute -inset-1 opacity-0 group-hover:opacity-10 transition duration-500 blur-xl ${card.bg}`} />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${isPositiveTrend ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {card.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{Math.abs(card.trend)}%</span>
                </div>
              </div>
              <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
