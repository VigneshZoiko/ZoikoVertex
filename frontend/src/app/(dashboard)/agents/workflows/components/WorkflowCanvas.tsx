"use client";

import React, { useState } from 'react';
import { Network, X, Info, AlertTriangle, Clock, User, ShieldCheck, FileText, GitBranch, Zap, BookOpen, Bell, ArrowUpCircle, PackageCheck, Timer, CheckCircle2 } from 'lucide-react';

// Node types per doc section 7.1 — Trigger, Agent Action, Prompt Execution, Knowledge Lookup,
// Policy Check, Human Review, Approval Gate, Schedule, Publish/External Action, Notify,
// Escalate, Evidence Capture, Branch, Delay, End

type NodeType =
  | 'trigger'
  | 'agent'
  | 'prompt'
  | 'knowledge'
  | 'policy'
  | 'human'
  | 'approval'
  | 'schedule'
  | 'publish'
  | 'notify'
  | 'escalate'
  | 'evidence'
  | 'branch'
  | 'delay'
  | 'end'
  | 'condition'  // legacy alias for branch
  | 'action';    // legacy alias for publish

interface CanvasNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  // Optional config fields surfaced in Step Configuration Drawer (doc §7.1 + §10 Workflow Step)
  description?: string;
  owner_role?: string;
  sla_minutes?: number;
  required_policy_checks?: string[];
  required_evidence?: boolean;
  fallback_owner?: string;
  escalation_rule?: string;
  input_schema?: Record<string, string>;
  output_schema?: Record<string, string>;
  conditions?: string;
  // Node-type specific
  agent_id?: string;
  prompt_id?: string;
  prompt_version?: string;
  knowledge_scope?: string;
  policy_pack?: string;
  reviewer_role?: string;
  approval_type?: string;
  quorum?: number;
  channel?: string;
  escalation_reason?: string;
  target_role?: string;
  severity?: string;
  duration?: string;
  completion_status?: string;
  // warnings / validation
  warnings?: string[];
}

interface GraphData {
  nodes: CanvasNode[];
  edges: { id: string; source: string; target: string; label?: string }[];
}

const NODE_STYLES: Record<string, { cls: string; shape: 'rect' | 'diamond' }> = {
  trigger:   { cls: 'bg-indigo-500 text-white border-indigo-600 shadow-indigo-500/30',   shape: 'rect' },
  agent:     { cls: 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/30', shape: 'rect' },
  prompt:    { cls: 'bg-sky-500 text-white border-sky-600 shadow-sky-500/30',             shape: 'rect' },
  knowledge: { cls: 'bg-violet-500 text-white border-violet-600 shadow-violet-500/30',   shape: 'rect' },
  policy:    { cls: 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30',       shape: 'diamond' },
  human:     { cls: 'bg-rose-500 text-white border-rose-600 shadow-rose-500/30',          shape: 'rect' },
  approval:  { cls: 'bg-pink-500 text-white border-pink-600 shadow-pink-500/30',          shape: 'diamond' },
  schedule:  { cls: 'bg-cyan-500 text-white border-cyan-600 shadow-cyan-500/30',          shape: 'rect' },
  publish:   { cls: 'bg-teal-500 text-white border-teal-600 shadow-teal-500/30',          shape: 'rect' },
  notify:    { cls: 'bg-blue-400 text-white border-blue-500 shadow-blue-400/30',          shape: 'rect' },
  escalate:  { cls: 'bg-orange-500 text-white border-orange-600 shadow-orange-500/30',   shape: 'rect' },
  evidence:  { cls: 'bg-cyan-600 text-white border-cyan-700 shadow-cyan-600/30',          shape: 'rect' },
  branch:    { cls: 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30',       shape: 'diamond' },
  delay:     { cls: 'bg-gray-400 text-white border-gray-500 shadow-gray-400/30',          shape: 'rect' },
  end:       { cls: 'bg-gray-600 text-white border-gray-700 shadow-gray-600/30',          shape: 'rect' },
  condition: { cls: 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30',       shape: 'diamond' },
  action:    { cls: 'bg-teal-500 text-white border-teal-600 shadow-teal-500/30',          shape: 'rect' },
};

const NODE_LABELS: Partial<Record<string, string>> = {
  trigger:   'Trigger',
  agent:     'Agent',
  prompt:    'Prompt',
  knowledge: 'Knowledge',
  policy:    'Policy?',
  human:     'Human Review',
  approval:  'Approval?',
  schedule:  'Schedule',
  publish:   'Publish',
  notify:    'Notify',
  escalate:  'Escalate',
  evidence:  'Evidence',
  branch:    'Branch?',
  delay:     'Delay',
  end:       'End',
  condition: '?',
  action:    'Action',
};

// Per doc §7.1 — field sets shown per node type in the Step Configuration Drawer
const NODE_TYPE_FIELDS: Record<string, { label: string; key: keyof CanvasNode; fallback?: string }[]> = {
  trigger: [
    { label: 'Description',    key: 'description' },
    { label: 'Owner Role',     key: 'owner_role' },
    { label: 'SLA (min)',      key: 'sla_minutes' },
    { label: 'Conditions',     key: 'conditions' },
  ],
  agent: [
    { label: 'Agent ID',       key: 'agent_id' },
    { label: 'Description',    key: 'description' },
    { label: 'Owner Role',     key: 'owner_role' },
    { label: 'SLA (min)',      key: 'sla_minutes' },
    { label: 'Fallback Owner', key: 'fallback_owner' },
    { label: 'Escalation Rule',key: 'escalation_rule' },
  ],
  prompt: [
    { label: 'Prompt ID',      key: 'prompt_id' },
    { label: 'Version',        key: 'prompt_version' },
    { label: 'Description',    key: 'description' },
    { label: 'SLA (min)',      key: 'sla_minutes' },
  ],
  knowledge: [
    { label: 'Source Scope',   key: 'knowledge_scope' },
    { label: 'Description',    key: 'description' },
    { label: 'Owner Role',     key: 'owner_role' },
  ],
  policy: [
    { label: 'Policy Pack',    key: 'policy_pack' },
    { label: 'Description',    key: 'description' },
    { label: 'Conditions',     key: 'conditions' },
    { label: 'Escalation Rule',key: 'escalation_rule' },
  ],
  human: [
    { label: 'Reviewer Role',  key: 'reviewer_role' },
    { label: 'Description',    key: 'description' },
    { label: 'SLA (min)',      key: 'sla_minutes' },
    { label: 'Fallback Owner', key: 'fallback_owner' },
    { label: 'Escalation Rule',key: 'escalation_rule' },
  ],
  approval: [
    { label: 'Approval Type',  key: 'approval_type' },
    { label: 'Reviewer Role',  key: 'reviewer_role' },
    { label: 'Quorum',         key: 'quorum' },
    { label: 'Description',    key: 'description' },
    { label: 'SLA (min)',      key: 'sla_minutes' },
    { label: 'Escalation Rule',key: 'escalation_rule' },
  ],
  schedule: [
    { label: 'Description',    key: 'description' },
    { label: 'Duration',       key: 'duration' },
    { label: 'Owner Role',     key: 'owner_role' },
  ],
  publish: [
    { label: 'Description',    key: 'description' },
    { label: 'Channel',        key: 'channel' },
    { label: 'Owner Role',     key: 'owner_role' },
    { label: 'Required Evidence', key: 'required_evidence' },
  ],
  notify: [
    { label: 'Channel',        key: 'channel' },
    { label: 'Description',    key: 'description' },
    { label: 'Owner Role',     key: 'owner_role' },
  ],
  escalate: [
    { label: 'Escalation Reason', key: 'escalation_reason' },
    { label: 'Target Role',    key: 'target_role' },
    { label: 'Severity',       key: 'severity' },
    { label: 'SLA (min)',      key: 'sla_minutes' },
    { label: 'Description',    key: 'description' },
  ],
  evidence: [
    { label: 'Description',    key: 'description' },
    { label: 'Required Evidence', key: 'required_evidence' },
    { label: 'Escalation Rule',key: 'escalation_rule' },
  ],
  branch: [
    { label: 'Conditions',     key: 'conditions' },
    { label: 'Description',    key: 'description' },
    { label: 'Fallback Owner', key: 'fallback_owner' },
  ],
  delay: [
    { label: 'Duration',       key: 'duration' },
    { label: 'Description',    key: 'description' },
    { label: 'Escalation Rule',key: 'escalation_rule' },
  ],
  end: [
    { label: 'Completion Status', key: 'completion_status' },
    { label: 'Description',    key: 'description' },
    { label: 'Required Evidence', key: 'required_evidence' },
  ],
};

// Fallback for aliases
NODE_TYPE_FIELDS.condition = NODE_TYPE_FIELDS.branch;
NODE_TYPE_FIELDS.action    = NODE_TYPE_FIELDS.publish;

const NODE_TYPE_ICON: Record<string, React.ElementType> = {
  trigger:   Zap,
  agent:     User,
  prompt:    FileText,
  knowledge: BookOpen,
  policy:    ShieldCheck,
  human:     User,
  approval:  CheckCircle2,
  schedule:  Timer,
  publish:   ArrowUpCircle,
  notify:    Bell,
  escalate:  AlertTriangle,
  evidence:  PackageCheck,
  branch:    GitBranch,
  delay:     Clock,
  end:       CheckCircle2,
  condition: GitBranch,
  action:    ArrowUpCircle,
};

// ── Step Configuration Drawer ──────────────────────────────────────────────

function StepConfigDrawer({
  node,
  onClose,
}: {
  node: CanvasNode | null;
  onClose: () => void;
}) {
  if (!node) return null;

  const fields = NODE_TYPE_FIELDS[node.type] ?? NODE_TYPE_FIELDS.trigger;
  const IconComponent = NODE_TYPE_ICON[node.type] ?? Info;
  const style = NODE_STYLES[node.type] ?? NODE_STYLES.trigger;

  // Derive the accent color class from the node style for the header badge
  const accentBg = style.cls.split(' ')[0]; // e.g. "bg-indigo-500"

  return (
    <div
      className="absolute top-0 right-0 h-full w-72 bg-[var(--surface)] border-l border-[var(--border)] z-20 overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-start justify-between gap-2 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg ${accentBg}/20 shrink-0`}>
            <IconComponent className={`w-4 h-4 text-white`} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Step Configuration</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">{node.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0 mt-0.5"
          aria-label="Close step config"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Node type badge + ID */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white ${accentBg}`}>
            {NODE_LABELS[node.type] ?? node.type}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{node.id}</span>
        </div>

        {/* Warnings (if any) */}
        {node.warnings && node.warnings.length > 0 && (
          <div className="space-y-1.5">
            {node.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Field grid */}
        <div className="space-y-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Configuration Fields</p>
          {fields.map(({ label, key }) => {
            const raw = node[key];
            const isEmpty = raw === undefined || raw === null || raw === '';
            const value = Array.isArray(raw)
              ? raw.join(', ')
              : typeof raw === 'boolean'
              ? (raw ? 'Yes' : 'No')
              : String(raw ?? '');

            return (
              <div key={String(key)} className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
                {isEmpty ? (
                  <p className="text-xs text-[var(--text-muted)] italic mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Not configured
                  </p>
                ) : (
                  <p className="text-xs font-medium text-[var(--text-primary)] mt-1 break-words">{value}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Required policy checks */}
        {node.required_policy_checks && node.required_policy_checks.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Required Policy Checks</p>
            <div className="flex flex-wrap gap-1.5">
              {node.required_policy_checks.map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium">{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Read-only notice */}
        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-indigo-400 leading-relaxed">
            Step configuration is read-only for active workflows. To edit, create a new draft version through the workflow builder.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── WorkflowCanvas ─────────────────────────────────────────────────────────

export default function WorkflowCanvas({ graph }: { graph?: GraphData }) {
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);

  if (!graph) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse">
        <Network className="w-8 h-8 text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-secondary)]">Loading logic pathways…</p>
      </div>
    );
  }

  const getNodeStyle = (type: string) =>
    NODE_STYLES[type] ?? { cls: 'bg-gray-500 text-white border-gray-600', shape: 'rect' as const };

  const isDiamond = (type: string) =>
    getNodeStyle(type).shape === 'diamond';

  const getDisplayLabel = (node: CanvasNode) => {
    if (isDiamond(node.type)) return NODE_LABELS[node.type] ?? node.label;
    return node.label;
  };

  return (
    <div
      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col h-[520px] overflow-hidden relative group"
      onClick={() => setSelectedNode(null)}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 bg-gradient-to-b from-[var(--surface)] to-transparent flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Workflow Canvas</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Multi-agent orchestration logic — 15 governed node types
            {selectedNode && (
              <span className="ml-2 text-indigo-400 font-medium">· Click a node to inspect its configuration</span>
            )}
            {!selectedNode && (
              <span className="ml-2 text-[var(--text-muted)]">· Click any node to view step configuration</span>
            )}
          </p>
        </div>
        {/* Legend pills */}
        <div className="hidden xl:flex items-center gap-2 flex-wrap justify-end">
          {[
            { label: 'Trigger',    cls: 'bg-indigo-500' },
            { label: 'Agent',      cls: 'bg-emerald-500' },
            { label: 'Policy?',    cls: 'bg-amber-500' },
            { label: 'Human',      cls: 'bg-rose-500' },
            { label: 'Approval?',  cls: 'bg-pink-500' },
            { label: 'Evidence',   cls: 'bg-cyan-600' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span className={`w-2 h-2 rounded-sm ${l.cls}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas area — shrinks when drawer is open */}
      <div
        className="flex-1 w-full relative overflow-auto bg-[var(--surface-hover)]/20 mt-14 transition-all"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          paddingRight: selectedNode ? '288px' : '0',
        }}
      >
        <svg className="absolute inset-0 w-[1100px] h-[430px] pointer-events-none">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgb(156 163 175)" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const source = graph.nodes.find((n) => n.id === edge.source);
            const target = graph.nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance === 0) return null;

            const padding = 22;
            const startX = source.x + (dx / distance) * padding;
            const startY = source.y + (dy / distance) * padding;
            const endX   = target.x - (dx / distance) * (padding + 5);
            const endY   = target.y - (dy / distance) * (padding + 5);

            const mx = (startX + endX) / 2;
            const my = (startY + endY) / 2;
            const cx = mx - dy * 0.15;
            const cy = my + dx * 0.15;

            return (
              <g key={edge.id}>
                <path
                  d={`M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`}
                  stroke="rgb(156 163 175)"
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className="opacity-50"
                />
                {edge.label && (
                  <text x={cx} y={cy - 8} fill="rgb(156 163 175)" fontSize="9" textAnchor="middle">
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes — now clickable */}
        {graph.nodes.map((node) => {
          const style   = getNodeStyle(node.type);
          const diamond = style.shape === 'diamond';
          const isSelected = selectedNode?.id === node.id;

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(isSelected ? null : node);
              }}
              className={`absolute flex items-center justify-center shadow-lg border-2 text-xs font-semibold transform -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer ${style.cls} ${
                diamond ? 'rotate-45 w-12 h-12 rounded-lg' : 'px-3 py-2 rounded-xl'
              } ${
                isSelected
                  ? 'scale-125 ring-2 ring-white/60 ring-offset-1 ring-offset-transparent z-10'
                  : 'hover:scale-110'
              }`}
              style={{ left: node.x, top: node.y }}
              title={`${node.label} — click to inspect configuration`}
            >
              <span className={diamond ? '-rotate-45 text-[10px]' : ''}>
                {getDisplayLabel(node)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Configuration Drawer — slides in from the right inside the canvas */}
      <StepConfigDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}