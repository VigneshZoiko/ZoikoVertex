"use client";

import React from 'react';
import { ArrowUpFromLine, User, GitFork, Clock, ShieldAlert, FileText, RotateCcw } from 'lucide-react';

// Per doc section 8 — escalations visible data:
// escalation reason, target role, SLA, severity, evidence bundle
// and doc section 7.1 — Escalate node: reason, target role, SLA, severity, evidence bundle

type EscalationSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

interface EscalationEvent {
  id: string;
  workflowName: string;
  trigger: string;
  handoffTo: string;
  reason: string;
  escalatedAt: string;
  resolved: boolean;
  severity?: EscalationSeverity;
  sla?: string;
  evidenceBundleId?: string;
  overrideReason?: string;
}

const SEVERITY_STYLES: Record<EscalationSeverity, string> = {
  Low:      'bg-zinc-500/10 text-foreground-muted border-zinc-500/20',
  Medium:   'bg-warning-text/10 text-warning-text border-warning-border/20',
  High:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Critical: 'bg-error-text/10 text-error-text border-error-border/20',
};

export default function EscalationPaths({ escalations }: { escalations?: EscalationEvent[] }) {
  if (!escalations) {
    return <div className="h-64 animate-pulse bg-[var(--surface)] rounded-2xl" />;
  }

  const unresolvedCount = escalations.filter((e) => !e.resolved).length;
  const criticalCount   = escalations.filter((e) => e.severity === 'Critical' && !e.resolved).length;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-error-text/10 rounded-xl">
            <ArrowUpFromLine className="w-5 h-5 text-error-text" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Escalation Paths</h2>
            <p className="text-xs text-[var(--text-secondary)]">Human override, review handoff, and authority escalation branches</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-text/10 text-error-text border border-error-border/20">
              {criticalCount} Critical
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-error-text/10 text-error-text border border-error-border/20">
            {unresolvedCount} Unresolved
          </span>
        </div>
      </div>

      {/* Empty state */}
      {escalations.length === 0 && (
        <div className="p-8 text-center">
          <ShieldAlert className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">No escalations active. Workflow escalation events will appear here.</p>
        </div>
      )}

      {/* Events */}
      <div className="p-4 space-y-3">
        {escalations.map((event) => (
          <div
            key={event.id}
            className={`p-4 rounded-xl border transition-colors ${
              event.resolved
                ? 'border-[var(--border)] bg-transparent opacity-60'
                : event.severity === 'Critical'
                ? 'border-error-border/30 bg-error-text/5'
                : 'border-error-border/20 bg-error-text/5'
            }`}
          >
            {/* Title row */}
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <GitFork className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{event.workflowName}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {event.severity && !event.resolved && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[event.severity]}`}>
                    {event.severity}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    event.resolved
                      ? 'bg-success-text/10 text-success-text border-success-border/20'
                      : 'bg-error-text/10 text-error-text border-error-border/20'
                  }`}
                >
                  {event.resolved ? 'Resolved' : 'Active'}
                </span>
              </div>
            </div>

            {/* Reason */}
            <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed pl-6">{event.reason}</p>

            {/* Override reason (if any) */}
            {event.overrideReason && (
              <div className="pl-6 mb-2 flex items-start gap-1.5">
                <RotateCcw className="w-3 h-3 text-warning-text mt-0.5 shrink-0" />
                <p className="text-[10px] text-warning-text leading-relaxed">Override: {event.overrideReason}</p>
              </div>
            )}

            {/* Meta row */}
            <div className="pl-6 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <GitFork className="w-3 h-3" /> Trigger:{' '}
                <strong className="text-warning-text">{event.trigger}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3" /> Handed to:{' '}
                <strong className="text-info-text">{event.handoffTo}</strong>
              </span>
              {event.sla && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> SLA: <strong className="text-[var(--text-secondary)]">{event.sla}</strong>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />{' '}
                {new Date(event.escalatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {event.evidenceBundleId && (
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />{' '}
                  <span className="text-cyan-400 font-medium">Evidence: {event.evidenceBundleId}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}