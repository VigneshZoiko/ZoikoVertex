import React from 'react';
import { Network } from 'lucide-react';

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

interface GraphData {
  nodes: { id: string; type: string; label: string; x: number; y: number }[];
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
  // legacy aliases
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

export default function WorkflowCanvas({ graph }: { graph?: GraphData }) {
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

  const getDisplayLabel = (node: { type: string; label: string }) => {
    // Show canonical label for diamond nodes (conditions/approvals/policy/branch)
    if (isDiamond(node.type)) return NODE_LABELS[node.type] ?? node.label;
    return node.label;
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col h-[520px] overflow-hidden relative group">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 bg-gradient-to-b from-[var(--surface)] to-transparent flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Workflow Canvas</h2>
          <p className="text-xs text-[var(--text-secondary)]">Multi-agent orchestration logic — 15 governed node types</p>
        </div>
        {/* Legend pills */}
        <div className="hidden xl:flex items-center gap-2 flex-wrap justify-end">
          {[
            { label: 'Trigger', cls: 'bg-indigo-500' },
            { label: 'Agent', cls: 'bg-emerald-500' },
            { label: 'Policy?', cls: 'bg-amber-500' },
            { label: 'Human', cls: 'bg-rose-500' },
            { label: 'Approval?', cls: 'bg-pink-500' },
            { label: 'Evidence', cls: 'bg-cyan-600' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span className={`w-2 h-2 rounded-sm ${l.cls}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 w-full relative overflow-auto bg-[var(--surface-hover)]/20 mt-14"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)',
          backgroundSize: '24px 24px',
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

            // Curved path for better readability
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
                  <text
                    x={cx}
                    y={cy - 8}
                    fill="rgb(156 163 175)"
                    fontSize="9"
                    textAnchor="middle"
                    className="font-medium"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {graph.nodes.map((node) => {
          const style  = getNodeStyle(node.type);
          const diamond = style.shape === 'diamond';

          return (
            <div
              key={node.id}
              className={`absolute flex items-center justify-center shadow-lg border-2 text-xs font-semibold transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 cursor-pointer ${style.cls} ${
                diamond ? 'rotate-45 w-12 h-12 rounded-lg' : 'px-3 py-2 rounded-xl'
              }`}
              style={{ left: node.x, top: node.y }}
              title={node.label}
            >
              <span className={diamond ? '-rotate-45 text-[10px]' : ''}>
                {getDisplayLabel(node)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}