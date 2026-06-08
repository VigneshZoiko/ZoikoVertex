"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Network, X, Info, AlertTriangle, AlertCircle, Clock, User, ShieldCheck, FileText,
  GitBranch, Zap, BookOpen, Bell, ArrowUpCircle, PackageCheck, Timer,
  CheckCircle2, Plus, Trash2, Save, Pencil, Eye, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

type NodeType =
  | 'trigger' | 'agent' | 'prompt' | 'knowledge' | 'policy' | 'human'
  | 'approval' | 'schedule' | 'publish' | 'notify' | 'escalate' | 'evidence'
  | 'branch' | 'delay' | 'end' | 'condition' | 'action';

interface CanvasNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
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
  warnings?: string[];
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  default_path?: boolean;
  fail_safe_path?: boolean;
}

interface GraphData {
  nodes: CanvasNode[];
  edges: GraphEdge[];
}

interface WorkflowCanvasProps {
  graph?: GraphData;
  versionId?: string | null;
  readOnly?: boolean;
  onGraphChange?: (graph: GraphData) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

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
  trigger: 'Trigger', agent: 'Agent', prompt: 'Prompt', knowledge: 'Knowledge',
  policy: 'Policy?', human: 'Human Review', approval: 'Approval?',
  schedule: 'Schedule', publish: 'Publish', notify: 'Notify', escalate: 'Escalate',
  evidence: 'Evidence', branch: 'Branch?', delay: 'Delay', end: 'End',
  condition: '?', action: 'Action',
};

const NODE_TYPE_FIELDS: Record<string, { label: string; key: keyof CanvasNode; fallback?: string }[]> = {
  trigger: [
    { label: 'Description', key: 'description' },
    { label: 'Owner Role', key: 'owner_role' },
    { label: 'SLA (min)', key: 'sla_minutes' },
    { label: 'Conditions', key: 'conditions' },
  ],
  agent: [
    { label: 'Agent ID', key: 'agent_id' },
    { label: 'Description', key: 'description' },
    { label: 'Owner Role', key: 'owner_role' },
    { label: 'SLA (min)', key: 'sla_minutes' },
    { label: 'Fallback Owner', key: 'fallback_owner' },
    { label: 'Escalation Rule', key: 'escalation_rule' },
  ],
  prompt: [
    { label: 'Prompt ID', key: 'prompt_id' },
    { label: 'Version', key: 'prompt_version' },
    { label: 'Description', key: 'description' },
    { label: 'SLA (min)', key: 'sla_minutes' },
  ],
  knowledge: [
    { label: 'Source Scope', key: 'knowledge_scope' },
    { label: 'Description', key: 'description' },
    { label: 'Owner Role', key: 'owner_role' },
  ],
  policy: [
    { label: 'Policy Pack', key: 'policy_pack' },
    { label: 'Description', key: 'description' },
    { label: 'Conditions', key: 'conditions' },
    { label: 'Escalation Rule', key: 'escalation_rule' },
  ],
  human: [
    { label: 'Reviewer Role', key: 'reviewer_role' },
    { label: 'Description', key: 'description' },
    { label: 'SLA (min)', key: 'sla_minutes' },
    { label: 'Fallback Owner', key: 'fallback_owner' },
    { label: 'Escalation Rule', key: 'escalation_rule' },
  ],
  approval: [
    { label: 'Approval Type', key: 'approval_type' },
    { label: 'Reviewer Role', key: 'reviewer_role' },
    { label: 'Quorum', key: 'quorum' },
    { label: 'Description', key: 'description' },
    { label: 'SLA (min)', key: 'sla_minutes' },
    { label: 'Escalation Rule', key: 'escalation_rule' },
  ],
  schedule: [
    { label: 'Description', key: 'description' },
    { label: 'Duration', key: 'duration' },
    { label: 'Owner Role', key: 'owner_role' },
  ],
  publish: [
    { label: 'Description', key: 'description' },
    { label: 'Channel', key: 'channel' },
    { label: 'Owner Role', key: 'owner_role' },
    { label: 'Required Evidence', key: 'required_evidence' },
  ],
  notify: [
    { label: 'Channel', key: 'channel' },
    { label: 'Description', key: 'description' },
    { label: 'Owner Role', key: 'owner_role' },
  ],
  escalate: [
    { label: 'Escalation Reason', key: 'escalation_reason' },
    { label: 'Target Role', key: 'target_role' },
    { label: 'Severity', key: 'severity' },
    { label: 'SLA (min)', key: 'sla_minutes' },
    { label: 'Description', key: 'description' },
  ],
  evidence: [
    { label: 'Description', key: 'description' },
    { label: 'Required Evidence', key: 'required_evidence' },
    { label: 'Escalation Rule', key: 'escalation_rule' },
  ],
  branch: [
    { label: 'Conditions', key: 'conditions' },
    { label: 'Description', key: 'description' },
    { label: 'Fallback Owner', key: 'fallback_owner' },
  ],
  delay: [
    { label: 'Duration', key: 'duration' },
    { label: 'Description', key: 'description' },
    { label: 'Escalation Rule', key: 'escalation_rule' },
  ],
  end: [
    { label: 'Completion Status', key: 'completion_status' },
    { label: 'Description', key: 'description' },
    { label: 'Required Evidence', key: 'required_evidence' },
  ],
};

NODE_TYPE_FIELDS.condition = NODE_TYPE_FIELDS.branch;
NODE_TYPE_FIELDS.action    = NODE_TYPE_FIELDS.publish;

const NODE_TYPE_ICON: Record<string, React.ElementType> = {
  trigger: Zap, agent: User, prompt: FileText, knowledge: BookOpen,
  policy: ShieldCheck, human: User, approval: CheckCircle2, schedule: Timer,
  publish: ArrowUpCircle, notify: Bell, escalate: AlertTriangle,
  evidence: PackageCheck, branch: GitBranch, delay: Clock, end: CheckCircle2,
  condition: GitBranch, action: ArrowUpCircle,
};

const PALETTE_ITEMS: { type: NodeType; label: string }[] = [
  { type: 'trigger', label: 'Trigger' },
  { type: 'agent', label: 'Agent' },
  { type: 'prompt', label: 'Prompt' },
  { type: 'knowledge', label: 'Knowledge' },
  { type: 'policy', label: 'Policy' },
  { type: 'human', label: 'Human Review' },
  { type: 'approval', label: 'Approval Gate' },
  { type: 'schedule', label: 'Schedule' },
  { type: 'publish', label: 'Publish' },
  { type: 'notify', label: 'Notify' },
  { type: 'escalate', label: 'Escalate' },
  { type: 'evidence', label: 'Evidence' },
  { type: 'branch', label: 'Branch' },
  { type: 'delay', label: 'Delay' },
  { type: 'end', label: 'End' },
];

let nodeIdCounter = 0;
function generateNodeId(): string {
  nodeIdCounter += 1;
  return `node_${Date.now()}_${nodeIdCounter}`;
}
function generateEdgeId(): string {
  return `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Editable Step Configuration Drawer ────────────────────────────────────

function EditableStepConfigDrawer({
  node,
  onClose,
  onUpdate,
  readOnly,
}: {
  node: CanvasNode | null;
  onClose: () => void;
  onUpdate: (updates: Partial<CanvasNode>) => void;
  readOnly: boolean;
}) {
  if (!node) return null;

  const fields = NODE_TYPE_FIELDS[node.type] ?? NODE_TYPE_FIELDS.trigger;
  const IconComponent = NODE_TYPE_ICON[node.type] ?? Info;
  const style = NODE_STYLES[node.type] ?? NODE_STYLES.trigger;
  const accentBg = style.cls.split(' ')[0];

  const FIELD_RENDERERS: Partial<Record<string, 'text' | 'number' | 'textarea' | 'boolean'>> = {
    owner_role: 'text', sla_minutes: 'number', conditions: 'textarea',
    description: 'textarea', agent_id: 'text', prompt_id: 'text',
    prompt_version: 'text', knowledge_scope: 'text', policy_pack: 'text',
    reviewer_role: 'text', approval_type: 'text', quorum: 'number',
    channel: 'text', escalation_reason: 'textarea', target_role: 'text',
    severity: 'text', duration: 'text', completion_status: 'text',
    fallback_owner: 'text', escalation_rule: 'text', required_evidence: 'boolean',
  };

  return (
    <div
      className="absolute top-0 right-0 h-full w-72 bg-[var(--surface)] border-l border-[var(--border)] z-20 overflow-y-auto shadow-2xl flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-start justify-between gap-2 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg ${accentBg}/20 shrink-0`}>
            <IconComponent className={`w-4 h-4 text-white`} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {readOnly ? 'Step Configuration' : 'Edit Step'}
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">{node.label}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0 mt-0.5" aria-label="Close step config">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white ${accentBg}`}>
            {NODE_LABELS[node.type] ?? node.type}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{node.id}</span>
        </div>

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

        {/* Node name (always editable) */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Node Label</p>
          {readOnly ? (
            <p className="text-xs font-medium text-[var(--text-primary)]">{node.label}</p>
          ) : (
            <input
              type="text"
              value={node.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/40"
            />
          )}
        </div>

        <div className="space-y-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Configuration Fields</p>
          {fields.map(({ label, key }) => {
            const raw = node[key];
            const isEmpty = raw === undefined || raw === null || raw === '';
            const value = Array.isArray(raw)
              ? raw.join(', ')
              : typeof raw === 'boolean' ? (raw ? 'Yes' : 'No')
              : String(raw ?? '');

            if (readOnly) {
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
            }

            const renderer = FIELD_RENDERERS[key] || 'text';
            const fieldKey = String(key);

            if (renderer === 'boolean') {
              return (
                <div key={fieldKey} className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!raw}
                      onChange={(e) => onUpdate({ [key]: e.target.checked } as any)}
                      className="rounded border-[var(--border)]"
                    />
                    <span className="text-xs text-[var(--text-primary)]">{raw ? 'Yes' : 'No'}</span>
                  </label>
                </div>
              );
            }

            if (renderer === 'textarea') {
              return (
                <div key={fieldKey} className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
                  <textarea
                    value={isEmpty ? '' : value}
                    onChange={(e) => onUpdate({ [key]: e.target.value || undefined } as any)}
                    rows={2}
                    className="w-full px-2 py-1 text-xs rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/40 resize-none"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                  />
                </div>
              );
            }

            if (renderer === 'number') {
              return (
                <div key={fieldKey} className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
                  <input
                    type="number"
                    value={isEmpty ? '' : value}
                    onChange={(e) => onUpdate({ [key]: e.target.value ? Number(e.target.value) : undefined } as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/40"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                  />
                </div>
              );
            }

            return (
              <div key={fieldKey} className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
                <input
                  type="text"
                  value={isEmpty ? '' : value}
                  onChange={(e) => onUpdate({ [key]: e.target.value || undefined } as any)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/40"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                />
              </div>
            );
          })}
        </div>

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

        {!readOnly && (
          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <p className="text-[10px] text-indigo-400 leading-relaxed">
              Changes apply immediately on the canvas. Remember to save the workflow to persist your edits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Context Menu ───────────────────────────────────────────────────────────

function ContextMenu({
  x, y,
  onDelete,
  onClose,
}: {
  x: number; y: number;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete Node
      </button>
    </div>
  );
}

// ── Node Palette ───────────────────────────────────────────────────────────

function NodePalette({ onAddNode }: { onAddNode: (type: NodeType) => void }) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? PALETTE_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase())
      )
    : PALETTE_ITEMS;

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="px-4 py-2 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500/40"
        />
        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
          {PALETTE_ITEMS.length} node types
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-3 max-h-24 overflow-y-auto">
        {filtered.map((item) => {
          const style = NODE_STYLES[item.type] || NODE_STYLES.trigger;
          const IconComp = NODE_TYPE_ICON[item.type] || Info;
          return (
            <button
              key={item.type}
              onClick={() => onAddNode(item.type)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white ${style.cls} hover:scale-105 transition-transform cursor-pointer shrink-0`}
              title={`Add ${item.label} node`}
            >
              <IconComp className="w-3 h-3" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main WorkflowCanvas ────────────────────────────────────────────────────

export default function WorkflowCanvas({
  graph,
  versionId,
  readOnly: externalReadOnly,
  onGraphChange,
}: WorkflowCanvasProps) {
  const [editMode, setEditMode] = useState(false);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<CanvasNode | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string } | null>(null);
  const [connectMousePos, setConnectMousePos] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const readOnly = externalReadOnly ?? !editMode;

  // Sync from graph prop
  useEffect(() => {
    if (graph) {
      setNodes(graph.nodes || []);
      setEdges(graph.edges || []);
    }
  }, [graph]);

  // Notify parent on changes
  const notifyChange = useCallback((newNodes: CanvasNode[], newEdges: GraphEdge[]) => {
    onGraphChange?.({ nodes: newNodes, edges: newEdges });
  }, [onGraphChange]);

  const updateNodeField = useCallback((id: string, updates: Partial<CanvasNode>) => {
    setNodes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...updates } : n));
      notifyChange(next, edges);
      return next;
    });
    setEditingNode((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
  }, [edges, notifyChange]);

  // ── Add node from palette ──
  const handleAddNode = useCallback((type: NodeType) => {
    const id = generateNodeId();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const offsetX = canvasRect ? canvasRef.current!.scrollLeft + 60 : 60;
    const offsetY = canvasRect ? canvasRef.current!.scrollTop + 60 : 60;
    const newNode: CanvasNode = {
      id,
      type,
      label: NODE_LABELS[type] || type,
      x: offsetX + (nodes.length % 5) * 50,
      y: offsetY + Math.floor(nodes.length / 5) * 80,
    };
    setNodes((prev) => {
      const next = [...prev, newNode];
      notifyChange(next, edges);
      return next;
    });
    setSelectedNodeId(id);
  }, [nodes.length, edges, notifyChange]);

  // ── Node drag handlers ──
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - rect.left + scrollLeft - node.x,
      y: e.clientY - rect.top + scrollTop - node.y,
    });
  }, [readOnly, nodes]);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent) => {
    if (connectingFrom) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scrollLeft = canvasRef.current?.scrollLeft || 0;
      const scrollTop = canvasRef.current?.scrollTop || 0;
      setConnectMousePos({
        x: e.clientX - rect.left + scrollLeft,
        y: e.clientY - rect.top + scrollTop,
      });
      return;
    }
    if (!draggingNodeId || !dragOffset) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;
    const newX = Math.max(0, e.clientX - rect.left + scrollLeft - dragOffset.x);
    const newY = Math.max(0, e.clientY - rect.top + scrollTop - dragOffset.y);
    setNodes((prev) => {
      const next = prev.map((n) =>
        n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n
      );
      return next;
    });
  }, [draggingNodeId, dragOffset, connectingFrom]);

  const handleNodeMouseUp = useCallback(() => {
    if (draggingNodeId) {
      notifyChange(nodes, edges);
      setDraggingNodeId(null);
      setDragOffset(null);
    }
    if (connectingFrom) {
      setConnectingFrom(null);
      setConnectMousePos(null);
    }
  }, [draggingNodeId, connectingFrom, nodes, edges, notifyChange]);

  // ── Edge creation handlers ──
  const handleHandleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom({ nodeId });
  }, [readOnly]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    handleNodeMouseMove(e);
  }, [handleNodeMouseMove]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (connectingFrom) {
      const target = (e.target as HTMLElement).closest('[data-handle-node]');
      if (target) {
        const targetNodeId = target.getAttribute('data-handle-node');
        if (targetNodeId && targetNodeId !== connectingFrom.nodeId) {
          const exists = edges.some(
            (ed) => ed.source === connectingFrom.nodeId && ed.target === targetNodeId
          );
          if (!exists) {
            const newEdge: GraphEdge = {
              id: generateEdgeId(),
              source: connectingFrom.nodeId,
              target: targetNodeId,
            };
            setEdges((prev) => {
              const next = [...prev, newEdge];
              notifyChange(nodes, next);
              return next;
            });
          }
        }
      }
      setConnectingFrom(null);
      setConnectMousePos(null);
      return;
    }
    handleNodeMouseUp();
  }, [connectingFrom, edges, nodes, notifyChange, handleNodeMouseUp]);

  // ── Delete ──
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => {
      const next = prev.filter((n) => n.id !== nodeId);
      notifyChange(next, edges);
      return next;
    });
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (editingNode?.id === nodeId) setEditingNode(null);
  }, [edges, selectedNodeId, editingNode, notifyChange]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => {
      const next = prev.filter((e) => e.id !== edgeId);
      notifyChange(nodes, next);
      return next;
    });
  }, [nodes, notifyChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && !readOnly) {
          handleDeleteNode(selectedNodeId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setEditingNode(null);
        setCtxMenu(null);
        setConnectingFrom(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedNodeId, readOnly, handleDeleteNode]);

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!versionId) {
      setError('No version selected. Create a version draft first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post(`/api/v1/agents/workflows/versions/${versionId}/graph`, {
        nodes,
        edges,
      });
      if (res?.success) {
        notifyChange(nodes, edges);
      } else {
        setError(res?.error || 'Failed to save workflow graph.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save workflow graph.');
    } finally {
      setSaving(false);
    }
  }, [versionId, nodes, edges, notifyChange]);

  // ── Helpers ──
  const getNodeStyle = (type: string) =>
    NODE_STYLES[type] ?? { cls: 'bg-gray-500 text-white border-gray-600', shape: 'rect' as const };

  const isDiamond = (type: string) => getNodeStyle(type).shape === 'diamond';

  const getHandlePos = (node: CanvasNode, side: 'left' | 'right') => {
    const diamond = isDiamond(node.type);
    const w = diamond ? 48 : 80;
    const halfW = w / 2;
    const halfH = diamond ? 24 : 16;
    return {
      x: side === 'left' ? node.x - halfW : node.x + halfW,
      y: node.y,
    };
  };

  if (!graph && nodes.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse">
        <Network className="w-8 h-8 text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-secondary)]">Loading logic pathways…</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col overflow-hidden relative group">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Workflow Canvas
            {editMode && (
              <span className="ml-2 text-xs text-amber-400 font-medium">(Builder Mode)</span>
            )}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {readOnly
              ? 'Click any node to view step configuration'
              : 'Drag nodes, connect handles, add from palette'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {versionId && !readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {!externalReadOnly && (
            <button
              onClick={() => { setEditMode((prev) => !prev); setEditingNode(null); setSelectedNodeId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                editMode
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {editMode ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {editMode ? 'View Mode' : 'Edit Mode'}
            </button>
          )}
          {/* Legend pills */}
          {readOnly && (
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
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {typeof error === 'object' ? 'Unknown error' : error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-rose-300"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Palette in edit mode */}
      {editMode && <NodePalette onAddNode={handleAddNode} />}

      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="flex-1 w-full relative overflow-auto bg-[var(--surface-hover)]/20"
        style={{
          height: '520px',
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleNodeMouseUp}
        onClick={() => { setSelectedNodeId(null); setEditingNode(null); setCtxMenu(null); }}
        onContextMenu={(e) => { if (readOnly) return; e.preventDefault(); setCtxMenu(null); }}
      >
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ minWidth: '1100px', minHeight: '430px' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgb(156 163 175)" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgb(99 102 241)" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance === 0) return null;
            const padding = 24;
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
                {edge.label && typeof edge.label === "string" && (
                  <text x={cx} y={cy - 8} fill="rgb(156 163 175)" fontSize="9" textAnchor="middle">
                    {edge.label}
                  </text>
                )}
                {/* Edge delete area (invisible wide path) */}
                {!readOnly && (
                  <path
                    d={`M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`}
                    stroke="transparent"
                    strokeWidth="12"
                    fill="none"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteEdge(edge.id); }}
                  />
                )}
              </g>
            );
          })}

          {/* In-progress connection line */}
          {connectingFrom && connectMousePos && (() => {
            const source = nodes.find((n) => n.id === connectingFrom.nodeId);
            if (!source) return null;
            return (
              <line
                x1={source.x + 40}
                y1={source.y}
                x2={connectMousePos.x}
                y2={connectMousePos.y}
                stroke="rgb(99 102 241)"
                strokeWidth="2"
                strokeDasharray="5 3"
                fill="none"
              />
            );
          })()}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const style = getNodeStyle(node.type);
          const diamond = style.shape === 'diamond';
          const isSelected = selectedNodeId === node.id;
          const isDragging = draggingNodeId === node.id;
          const hasEdges = edges.some((e) => e.source === node.id);
          const displayLabel = diamond ? (NODE_LABELS[node.type] ?? node.label) : node.label;

          return (
            <div key={node.id}>
              {/* Source handle (right) */}
              {!readOnly && (
                <div
                  data-handle-node={node.id}
                  onMouseDown={(e) => handleHandleMouseDown(e, node.id)}
                  className={`absolute w-3 h-3 rounded-full bg-indigo-400 border-2 border-[var(--surface)] cursor-crosshair z-10 hover:scale-150 transition-transform ${
                    connectingFrom?.nodeId === node.id ? 'scale-150 bg-indigo-300' : ''
                  }`}
                  style={{
                    left: node.x + (diamond ? 24 : 40),
                    top: node.y - 6,
                    transform: 'translateX(-50%)',
                  }}
                  title="Drag to connect"
                />
              )}

              {/* Target handle (left) */}
              {!readOnly && (
                <div
                  data-handle-node={node.id}
                  className={`absolute w-3 h-3 rounded-full bg-indigo-400/60 border-2 border-[var(--surface)] z-10 ${
                    connectingFrom ? 'hover:scale-150 hover:bg-indigo-300 transition-transform' : 'opacity-40'
                  }`}
                  style={{
                    left: node.x - (diamond ? 24 : 40),
                    top: node.y - 6,
                    transform: 'translateX(-50%)',
                  }}
                  title="Drop connection here"
                />
              )}

              {/* Node body */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                  setEditingNode(node);
                  setCtxMenu(null);
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onContextMenu={(e) => {
                  if (readOnly) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
                }}
                className={`absolute flex items-center justify-center shadow-lg border-2 text-xs font-semibold transition-all ${style.cls} ${
                  isDragging ? 'scale-110 z-20 opacity-90' : 'z-1'
                } ${
                  isSelected ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-transparent z-10 scale-110' : 'hover:scale-110'
                } ${readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
                style={{
                  left: node.x,
                  top: node.y,
                  transform: `translate(-50%, -50%) ${diamond ? 'rotate(45deg)' : ''}`,
                  width: diamond ? 48 : undefined,
                  height: diamond ? 48 : undefined,
                  padding: diamond ? undefined : '8px 12px',
                  borderRadius: diamond ? '8px' : '12px',
                }}
                title={`${node.label} — click to inspect${!readOnly ? ', drag to move' : ''}`}
              >
                <span className={diamond ? '-rotate-45 text-[10px]' : ''}>
                  {displayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step config drawer */}
      {editingNode && (
        <div className="relative" style={{ height: 0 }}>
          <EditableStepConfigDrawer
            node={editingNode}
            onClose={() => { setEditingNode(null); setSelectedNodeId(null); }}
            onUpdate={(updates) => updateNodeField(editingNode.id, updates)}
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onDelete={() => handleDeleteNode(ctxMenu.nodeId)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Bottom status bar */}
      {!readOnly && (
        <div className="px-4 py-1.5 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <span>{nodes.length} nodes · {edges.length} connections</span>
          <span>
            {editMode ? (
              <span className="text-amber-400">Drag to reposition · Connect handles · <kbd className="px-1 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)]">Del</kbd> to delete</span>
            ) : (
              'View mode'
            )}
          </span>
        </div>
      )}
    </div>
  );
}
