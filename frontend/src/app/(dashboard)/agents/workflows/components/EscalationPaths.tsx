"use client";

import React from 'react';
import { ArrowUpFromLine, User, GitFork, Clock } from 'lucide-react';

interface EscalationEvent {
  id: string;
  workflowName: string;
  trigger: string;
  handoffTo: string;
  reason: string;
  escalatedAt: string;
  resolved: boolean;
}

export default function EscalationPaths({ escalations }: { escalations?: EscalationEvent[] }) {
  if (!escalations) {
    return <div className="h-64 animate-pulse bg-[var(--surface)] rounded-2xl" />;
  }

  const unresolvedCount = escalations.filter(e => !e.resolved).length;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 rounded-xl">
            <ArrowUpFromLine className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Escalation Paths</h2>
            <p className="text-xs text-[var(--text-secondary)]">Human override and review handoff branches</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {unresolvedCount} Unresolved
        </span>
      </div>

      {/* Events */}
      <div className="p-4 space-y-3">
        {escalations.map((event) => (
          <div
            key={event.id}
            className={`p-4 rounded-xl border transition-colors ${
              event.resolved
                ? 'border-[var(--border)] bg-transparent opacity-60'
                : 'border-rose-500/20 bg-rose-500/5'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <GitFork className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[260px]">
                  {event.workflowName}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  event.resolved
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {event.resolved ? 'Resolved' : 'Active'}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed pl-6">
              {event.reason}
            </p>

            <div className="pl-6 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <GitFork className="w-3 h-3" /> Trigger:{' '}
                <strong className="text-amber-400">{event.trigger}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3" /> Handed to:{' '}
                <strong className="text-indigo-400">{event.handoffTo}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />{' '}
                {new Date(event.escalatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
