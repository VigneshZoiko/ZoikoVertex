import React from 'react';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

interface Hallucination {
  id: string;
  agentName: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  triggerContext: string;
  flaggedOutput: string;
  correctedOutput: string;
  timestamp: string;
  status: string;
}

export default function HallucinationTracker({ flags }: { flags?: Hallucination[] }) {
  if (!flags) return <div className="h-64 animate-pulse bg-[var(--surface)] rounded-2xl" />;

  const getSeverityStyle = (severity: string) => {
    switch(severity) {
      case 'HIGH': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'LOW': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-hover)]/30">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-rose-500" />
            Hallucination Radar
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Recent AI deviations flagged by validators</p>
        </div>
        <div className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-xs font-bold border border-rose-500/20">
          {flags.length} Active
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1 p-2">
        <div className="space-y-2">
          {flags.map((flag) => (
            <div key={flag.id} className="p-4 rounded-xl hover:bg-[var(--surface-hover)] transition-colors border border-transparent hover:border-[var(--border)]">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border ${getSeverityStyle(flag.severity)}`}>
                    {flag.severity}
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{flag.agentName}</span>
                </div>
                <div className="flex items-center text-xs text-[var(--text-muted)]">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(flag.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              
              <div className="bg-rose-500/5 rounded-lg p-3 mb-2 border border-rose-500/10">
                <p className="text-xs font-semibold text-rose-500 mb-1 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Flagged Output
                </p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">"{flag.flaggedOutput}"</p>
              </div>
              
              <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
                <p className="text-xs font-semibold text-emerald-500 mb-1">Corrected Baseline</p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">"{flag.correctedOutput}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
