"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Brain,
  Palette,
  BookOpen,
  Plus,
  Trash2,
  Link as LinkIcon,
  FileText,
  ChevronRight,
  Loader2,
  Globe,
  ShieldCheck,
  Search,
  X,
  PlusCircle,
  FileCode,
  Info,
  Upload,
  FileDigit,
  HelpCircle,
  Sparkles,
  Mic2,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Type,
  Layers,
  ShieldAlert,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Lock,
  Archive,
  ActivitySquare,
  Users,
  GitBranch,
  Database,
  Settings2,
  Filter,
  RefreshCw,
  ClipboardList,
  BadgeCheck,
  Skull,
  TrendingUp,
  BarChart3,
  Tag,
  Zap,
  AlertOctagon,
  FlaskConical,
} from "lucide-react";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────
// Types — aligned to Data Model (Section 15)
// ─────────────────────────────────────────────

type SourceStatus =
  | "DRAFT"
  | "PROCESSING"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "ACTIVE"
  | "RESTRICTED"
  | "EXPIRED"
  | "RETIRED"
  | "QUARANTINED"
  | "REJECTED";

type RetrievalPolicy =
  | "ALLOWED"
  | "BLOCKED"
  | "MANDATORY"
  | "OPTIONAL"
  | "CITATION_REQUIRED"
  | "APPROVAL_GATED"
  | "FALLBACK_ONLY";

type RiskTier = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type AuthorityLevel =
  | "OFFICIAL"
  | "LEGAL_APPROVED"
  | "PRODUCT_APPROVED"
  | "CUSTOMER_APPROVED"
  | "THIRD_PARTY_REFERENCE"
  | "DRAFT_INTERNAL";

type SensitivityLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

type ConflictSeverity = "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";

type PrimaryTab =
  | "COLLECTIONS"
  | "SOURCES"
  | "REVIEW_QUEUE"
  | "CONFLICTS"
  | "RETRIEVAL_LOGS"
  | "AGENT_ACCESS"
  | "TAXONOMY"
  | "SETTINGS";

// Legacy KB type kept for backward compat with existing API
type KBType = "AI_LIBRARY" | "BRAND_GUIDELINES" | "SOP";

// ─────────────────────────────────────────────
// Data model interfaces
// ─────────────────────────────────────────────

interface KnowledgeCollection {
  id: string;
  name: string;
  description: string;
  owner_id?: string;
  owner_name?: string;
  scope?: string;
  risk_tier?: RiskTier;
  status: SourceStatus | "ACTIVE" | "INACTIVE";
  retrieval_policy?: RetrievalPolicy;
  review_cadence?: string;
  source_count?: number;
  agent_count?: number;
  workflow_count?: number;
  last_reviewed?: string;
  next_review?: string;
  type: KBType; // mapped from legacy
  created_at: string;
  updated_at?: string;
}

interface KnowledgeSource {
  id: string;
  collection_id: string;
  kb_id?: string; // legacy compat
  title: string;
  content: string;
  source_type?: string;
  source_url?: string;
  file_path?: string;
  status?: SourceStatus;
  authority_level?: AuthorityLevel;
  sensitivity_level?: SensitivityLevel;
  risk_tier?: RiskTier;
  retrieval_policy?: RetrievalPolicy;
  locale?: string;
  jurisdiction?: string;
  product?: string;
  brand?: string;
  channel?: string;
  review_date?: string;
  expiry_date?: string;
  evidence_id?: string;
  version?: number;
  owner_name?: string;
  chunk_count?: number;
  citation_count?: number;
  conflict_count?: number;
  created_at: string;
  metadata?: {
    visual_identity?: {
      primary_color?: string;
      secondary_color?: string;
      visual_style?: string;
      font_family?: string;
    };
    original_filename?: string;
    file_size?: number;
    mime_type?: string;
  };
}

interface KnowledgeConflict {
  id: string;
  source_ids: string[];
  chunk_ids?: string[];
  severity: ConflictSeverity;
  summary: string;
  owner_id?: string;
  owner_name?: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "ESCALATED";
  resolution?: string;
  created_at: string;
  resolved_at?: string;
  source_titles?: string[];
}

interface RetrievalEvent {
  id: string;
  agent_id?: string;
  agent_name?: string;
  prompt_id?: string;
  workflow_id?: string;
  query: string;
  returned_chunks?: number;
  blocked_chunks?: number;
  reason_codes?: string[];
  latency_ms?: number;
  output_id?: string;
  evidence_id?: string;
  created_at: string;
}

interface KBSummaryStats {
  total_sources: number;
  approved_sources: number;
  stale_sources: number;
  review_required: number;
  active_collections: number;
  retrieval_errors: number;
  conflict_flags: number;
  high_risk_restricted: number;
}

interface AIContextResponse {
  brand_voice: { title: string; guideline: string; base_name: string }[] | null;
  brand_visual: {
    primary_color?: string;
    secondary_color?: string;
    visual_style?: string;
    font_family?: string;
  } | null;
  sop_rules: { title: string; rule: string; base_name: string }[];
  ai_library: { title: string; content: string; base_name: string }[];
  meta?: { generated_at?: string; entries_loaded?: number; bases_loaded?: number };
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SourceStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  DRAFT: { label: "Draft", color: "text-zinc-400", bg: "bg-zinc-800/60", icon: FileText },
  PROCESSING: { label: "Processing", color: "text-blue-400", bg: "bg-blue-500/10", icon: Loader2 },
  REVIEW_REQUIRED: { label: "Review Required", color: "text-amber-400", bg: "bg-amber-500/10", icon: ClipboardList },
  APPROVED: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: BadgeCheck },
  ACTIVE: { label: "Active", color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 },
  RESTRICTED: { label: "Restricted", color: "text-purple-400", bg: "bg-purple-500/10", icon: Lock },
  EXPIRED: { label: "Expired", color: "text-orange-400", bg: "bg-orange-500/10", icon: Clock3 },
  RETIRED: { label: "Retired", color: "text-zinc-500", bg: "bg-zinc-800/40", icon: Archive },
  QUARANTINED: { label: "Quarantined", color: "text-rose-400", bg: "bg-rose-500/10", icon: AlertOctagon },
  REJECTED: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
};

const RISK_CONFIG: Record<RiskTier, { label: string; color: string; bg: string }> = {
  LOW: { label: "Low", color: "text-green-400", bg: "bg-green-500/10" },
  MEDIUM: { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/10" },
  HIGH: { label: "High", color: "text-orange-400", bg: "bg-orange-500/10" },
  CRITICAL: { label: "Critical", color: "text-rose-400", bg: "bg-rose-500/10" },
};

const CONFLICT_SEVERITY_CONFIG: Record<ConflictSeverity, { color: string; bg: string }> = {
  LOW: { color: "text-green-400", bg: "bg-green-500/10" },
  MEDIUM: { color: "text-amber-400", bg: "bg-amber-500/10" },
  HIGH: { color: "text-orange-400", bg: "bg-orange-500/10" },
  BLOCKING: { color: "text-rose-400", bg: "bg-rose-500/10" },
};

const PRIMARY_TABS: { id: PrimaryTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "COLLECTIONS", label: "Collections", icon: Database, desc: "Governed knowledge collections" },
  { id: "SOURCES", label: "Sources", icon: FileText, desc: "All ingested sources" },
  { id: "REVIEW_QUEUE", label: "Review Queue", icon: ClipboardList, desc: "Pending approvals" },
  { id: "CONFLICTS", label: "Conflicts", icon: AlertTriangle, desc: "Conflicting knowledge" },
  { id: "RETRIEVAL_LOGS", label: "Retrieval Logs", icon: ActivitySquare, desc: "Agent retrieval trace" },
  { id: "AGENT_ACCESS", label: "Agent Access", icon: Users, desc: "Agent–collection permissions" },
  { id: "TAXONOMY", label: "Taxonomy", icon: Tag, desc: "Classification values" },
  { id: "SETTINGS", label: "Settings", icon: Settings2, desc: "KB governance config" },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: SourceStatus }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function RiskBadge({ tier }: { tier?: RiskTier }) {
  if (!tier) return null;
  const cfg = RISK_CONFIG[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg}`}>
      {cfg.label} risk
    </span>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 space-y-2">
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black ${accent || "text-white"}`}>{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Panels
// ─────────────────────────────────────────────

function CollectionsPanel({
  collections,
  loading,
  selectedCollection,
  onSelect,
  onCreateClick,
  sources,
  fetchingEntries,
  entrySearch,
  setEntrySearch,
  onAddSourceClick,
  onDeleteSource,
  onApproveSource,
  onRetireSource,
  onUpdateCollection,
  onDeleteCollection,
}: {
  collections: KnowledgeCollection[];
  loading: boolean;
  selectedCollection: KnowledgeCollection | null;
  onSelect: (c: KnowledgeCollection) => void;
  onCreateClick: () => void;
  sources: KnowledgeSource[];
  fetchingEntries: boolean;
  entrySearch: string;
  setEntrySearch: (v: string) => void;
  onAddSourceClick: () => void;
  onDeleteSource: (id: string) => void;
  onApproveSource: (id: string) => void;
  onRetireSource: (id: string) => void;
  onUpdateCollection?: (id: string, data: Partial<KnowledgeCollection>) => void;
  onDeleteCollection?: (id: string) => void;
}) {
  const filtered = sources.filter(
    (s) =>
      s.title.toLowerCase().includes(entrySearch.toLowerCase()) ||
      s.content?.toLowerCase().includes(entrySearch.toLowerCase()),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: collection list */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Collections</h2>
          <button onClick={onCreateClick} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
            </div>
          ) : collections.length > 0 ? (
            collections.map((col) => (
              <div key={col.id} className="group relative">
                <button
                  onClick={() => onSelect(col)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedCollection?.id === col.id ? "bg-indigo-500/5 border-indigo-500/30" : "bg-zinc-900/20 border-zinc-800/50 hover:bg-zinc-800/20"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${selectedCollection?.id === col.id ? "text-white" : "text-zinc-300"}`}>{col.name}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedCollection?.id === col.id ? "translate-x-1 text-indigo-400" : "text-zinc-600"}`} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    {col.risk_tier && <RiskBadge tier={col.risk_tier} />}
                    <span className="text-[10px] text-zinc-600 font-medium">{col.source_count ?? 0} sources</span>
                    {(col.agent_count ?? 0) > 0 && (
                      <span className="text-[10px] text-zinc-600">{col.agent_count} agents</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium line-clamp-1 mt-1">{col.description || "No description."}</p>
                </button>
                {onDeleteCollection && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteCollection(col.id); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-600 hover:text-rose-400 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete collection">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-10 text-center border border-dashed border-zinc-800 rounded-3xl">
              <p className="text-xs text-zinc-600 font-medium">No collections defined.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: source entries */}
      <div className="lg:col-span-8">
        {selectedCollection ? (
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-8 border-b border-zinc-800/50 bg-zinc-900/20 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{selectedCollection.name}</h2>
                  {selectedCollection.risk_tier && <RiskBadge tier={selectedCollection.risk_tier} />}
                </div>
                <p className="text-xs text-zinc-500 font-medium">{selectedCollection.description}</p>
                {selectedCollection.retrieval_policy && (
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">
                    Retrieval: {selectedCollection.retrieval_policy.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <button
                onClick={onAddSourceClick}
                className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                ADD SOURCE
              </button>
            </div>

            <div className="flex-1 p-8">
              <div className="mb-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                <input
                  value={entrySearch}
                  onChange={(e) => setEntrySearch(e.target.value)}
                  placeholder="Search sources, guidelines, or SOP text..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              {fetchingEntries ? (
                <div className="flex flex-col items-center justify-center h-48 gap-4 text-zinc-600">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest">Loading sources...</span>
                </div>
              ) : filtered.length > 0 ? (
                <div className="space-y-4">
                  {filtered.map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onDelete={onDeleteSource}
                      onApprove={onApproveSource}
                      onRetire={onRetireSource}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center space-y-4 opacity-40">
                  <div className="p-6 bg-zinc-800/50 rounded-full">
                    <FileCode className="w-12 h-12 text-zinc-600" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="text-sm font-bold text-white mb-1">Collection is empty</h3>
                    <p className="text-xs text-zinc-500">Ingest approved documents, manual articles, or approved URLs.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[600px] border border-dashed border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-zinc-900/50 rounded-3xl flex items-center justify-center text-zinc-700">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="max-w-sm space-y-2">
              <h2 className="text-xl font-bold text-white">Select a Collection</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">Choose a governed knowledge collection to manage evidence-backed sources, approval status, and agent access.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SourceCard({
  source,
  onDelete,
  onApprove,
  onRetire,
  onActivate,
  onPublish,
  onRestrict,
  onQuarantine,
}: {
  source: KnowledgeSource;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onRetire: (id: string) => void;
  onActivate?: (id: string) => void;
  onPublish?: (id: string) => void;
  onRestrict?: (id: string) => void;
  onQuarantine?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = source.status ?? "DRAFT";

  return (
    <div className="group bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {source.source_url ? <Globe className="w-4 h-4 text-emerald-400 shrink-0" /> : <FileText className="w-4 h-4 text-blue-400 shrink-0" />}
            <h3 className="font-bold text-white">{source.title}</h3>
            <StatusBadge status={status as SourceStatus} />
            {source.risk_tier && <RiskBadge tier={source.risk_tier} />}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {source.authority_level && (
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                {source.authority_level.replace(/_/g, " ")}
              </span>
            )}
            {source.sensitivity_level && (
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                {source.sensitivity_level}
              </span>
            )}
            {source.retrieval_policy && (
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                {source.retrieval_policy.replace(/_/g, " ")}
              </span>
            )}
            {source.version && (
              <span className="text-[10px] text-zinc-600 font-medium">v{source.version}</span>
            )}
          </div>

          {source.content && !expanded && (
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{source.content}</p>
          )}
          {expanded && source.content && (
            <p className="text-sm text-zinc-400 leading-relaxed">{source.content}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap text-[10px] text-zinc-600 font-medium">
            {source.chunk_count !== undefined && <span>{source.chunk_count} chunks</span>}
            {source.citation_count !== undefined && <span>{source.citation_count} citations</span>}
            {source.conflict_count !== undefined && source.conflict_count > 0 && (
              <span className="text-rose-400">{source.conflict_count} conflicts</span>
            )}
            {source.review_date && <span>Review: {new Date(source.review_date).toLocaleDateString()}</span>}
            {source.expiry_date && <span className="text-orange-400">Expires: {new Date(source.expiry_date).toLocaleDateString()}</span>}
            {source.locale && <span>{source.locale}</span>}
          </div>

          {source.source_url && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg w-fit">
              <LinkIcon className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-500 font-medium">{source.source_url}</span>
            </div>
          )}

          {source.metadata?.visual_identity && (
            <div className="flex flex-wrap gap-2">
              {source.metadata.visual_identity.primary_color && (
                <span className="px-2 py-1 rounded-lg bg-zinc-900 text-[10px] text-zinc-400 font-bold">
                  Primary {source.metadata.visual_identity.primary_color}
                </span>
              )}
              {source.metadata.visual_identity.font_family && (
                <span className="px-2 py-1 rounded-lg bg-zinc-900 text-[10px] text-zinc-400 font-bold">
                  {source.metadata.visual_identity.font_family}
                </span>
              )}
              {source.metadata.visual_identity.visual_style && (
                <span className="px-2 py-1 rounded-lg bg-zinc-900 text-[10px] text-zinc-400 font-bold">
                  {source.metadata.visual_identity.visual_style}
                </span>
              )}
            </div>
          )}

          {source.evidence_id && (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              Evidence: {source.evidence_id}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={() => setExpanded((v) => !v)} className="p-2 text-zinc-600 hover:text-white transition-colors" title="Expand">
            <Eye className="w-4 h-4" />
          </button>
          {(status === "DRAFT" || status === "REVIEW_REQUIRED") && (
            <button onClick={() => onApprove(source.id)} className="p-2 text-zinc-600 hover:text-emerald-400 transition-colors" title="Approve source">
              <BadgeCheck className="w-4 h-4" />
            </button>
          )}
          {status === "APPROVED" && onActivate && (
            <button onClick={() => onActivate(source.id)} className="p-2 text-zinc-600 hover:text-green-400 transition-colors" title="Activate for retrieval">
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {status === "ACTIVE" && (
            <button onClick={() => onRetire(source.id)} className="p-2 text-zinc-600 hover:text-orange-400 transition-colors" title="Retire source">
              <Archive className="w-4 h-4" />
            </button>
          )}
          {(status === "ACTIVE" || status === "APPROVED") && onPublish && (
            <button onClick={() => onPublish(source.id)} className="p-2 text-zinc-600 hover:text-indigo-400 transition-colors" title="Publish to production">
              <Globe className="w-4 h-4" />
            </button>
          )}
          {(status === "ACTIVE" || status === "APPROVED") && onRestrict && (
            <button onClick={() => onRestrict(source.id)} className="p-2 text-zinc-600 hover:text-purple-400 transition-colors" title="Restrict access">
              <Lock className="w-4 h-4" />
            </button>
          )}
          {(status === "ACTIVE" || status === "APPROVED") && onQuarantine && (
            <button onClick={() => onQuarantine(source.id)} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors" title="Quarantine">
              <AlertTriangle className="w-4 h-4" />
            </button>
          )}
          {status !== "ACTIVE" && status !== "APPROVED" && (
            <button onClick={() => onDelete(source.id)} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewQueuePanel({
  sources,
  loading,
  onApprove,
  onReject,
}: {
  sources: KnowledgeSource[];
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const reviewItems = sources.filter((s) =>
    ["REVIEW_REQUIRED", "PROCESSING", "DRAFT"].includes(s.status ?? ""),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-wider">
          Review Queue
          {reviewItems.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-black">
              {reviewItems.length}
            </span>
          )}
        </h2>
        <p className="text-xs text-zinc-500 font-medium">Pending approval — sources blocked from runtime until reviewed</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : reviewItems.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-3 opacity-50">
          <CheckCircle2 className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-sm font-bold text-zinc-400">No items pending review</p>
          <p className="text-xs text-zinc-600">All sources are approved, active, or in a terminal state.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviewItems.map((source) => (
            <div key={source.id} className="bg-zinc-900/40 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white">{source.title}</h3>
                    <StatusBadge status={(source.status ?? "DRAFT") as SourceStatus} />
                    {source.risk_tier && <RiskBadge tier={source.risk_tier} />}
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2">{source.content}</p>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                    {source.owner_name && <span>Owner: {source.owner_name}</span>}
                    {source.authority_level && <span>{source.authority_level.replace(/_/g, " ")}</span>}
                    <span>Added {new Date(source.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onApprove(source.id)}
                    className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-black hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    APPROVE
                  </button>
                  <button
                    onClick={() => onReject(source.id)}
                    className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-black hover:bg-rose-500/20 transition-all flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    REJECT
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConflictsPanel({
  conflicts,
  loading,
  onResolve,
}: {
  conflicts: KnowledgeConflict[];
  loading: boolean;
  onResolve: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-wider">
          Conflict Registry
          {conflicts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-black">
              {conflicts.length}
            </span>
          )}
        </h2>
        <p className="text-xs text-zinc-500">Contradictory or duplicate knowledge — agents must not improvise</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : conflicts.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-3 opacity-50">
          <CheckCircle2 className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-sm font-bold text-zinc-400">No conflicts detected</p>
          <p className="text-xs text-zinc-600">Knowledge base is consistent across all active sources.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((conflict) => {
            const cfg = CONFLICT_SEVERITY_CONFIG[conflict.severity];
            return (
              <div key={conflict.id} className={`bg-zinc-900/40 border rounded-2xl p-6 border-l-4 ${cfg.color.replace("text", "border")}`} style={{ borderLeftColor: "currentColor" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                      <h3 className="font-bold text-white text-sm">{conflict.summary}</h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${cfg.color} ${cfg.bg} uppercase tracking-widest`}>
                        {conflict.severity}
                      </span>
                    </div>
                    {conflict.source_titles && (
                      <div className="flex flex-wrap gap-1">
                        {conflict.source_titles.map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                      <span>Status: {conflict.status}</span>
                      {conflict.owner_name && <span>Owner: {conflict.owner_name}</span>}
                      <span>Detected {new Date(conflict.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {conflict.status !== "RESOLVED" && (
                    <button
                      onClick={() => onResolve(conflict.id)}
                      className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-black hover:bg-indigo-500/20 transition-all shrink-0"
                    >
                      RESOLVE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RetrievalLogsPanel({ logs, loading }: { logs: RetrievalEvent[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Retrieval Logs</h2>
        <p className="text-xs text-zinc-500">Agent retrieval trace — every knowledge access recorded</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-3 opacity-50">
          <ActivitySquare className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-sm font-bold text-zinc-400">No retrieval events yet</p>
          <p className="text-xs text-zinc-600">Retrieval events are written here when agents access knowledge.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.agent_name && (
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{log.agent_name}</span>
                    )}
                    <span className="text-xs text-zinc-300 font-medium">{log.query}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                    {log.returned_chunks !== undefined && <span>{log.returned_chunks} chunks returned</span>}
                    {(log.blocked_chunks ?? 0) > 0 && (
                      <span className="text-rose-400">{log.blocked_chunks} blocked</span>
                    )}
                    {log.latency_ms !== undefined && <span>{log.latency_ms}ms</span>}
                    {log.evidence_id && (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-indigo-500" />
                        {log.evidence_id}
                      </span>
                    )}
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.reason_codes && log.reason_codes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.reason_codes.map((code) => (
                        <span key={code} className="text-[10px] px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded">{code}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentAccessPanel({ collections, accessPolicy }: { collections: KnowledgeCollection[]; accessPolicy: any }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Agent Access Map</h2>
        <p className="text-xs text-zinc-500">Which agents can retrieve which collections</p>
      </div>
      <div className="space-y-3">
        {collections.map((col) => (
          <div key={col.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-white text-sm">{col.name}</h3>
                {col.retrieval_policy && (
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">
                    {col.retrieval_policy.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              {col.risk_tier && <RiskBadge tier={col.risk_tier} />}
            </div>
            <div className="flex items-center gap-4 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {col.agent_count ?? 0} agents
              </span>
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> {col.workflow_count ?? 0} workflows
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> {col.source_count ?? 0} sources
              </span>
            </div>
          </div>
        ))}
        {collections.length === 0 && (
          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl opacity-50">
            <p className="text-sm text-zinc-500">No collections available to display.</p>
          </div>
        )}
      </div>

      {/* Access Policy */}
      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
        <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Global Access Policy</h3>
        {accessPolicy ? (
          <div className="space-y-3 text-xs text-zinc-400">
            {Object.entries(accessPolicy).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest min-w-[160px]">{key.replace(/_/g, ' ')}</span>
                <span className="text-zinc-300">{String(val)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 italic">No global access policy configured. Collections use their individual retrieval policies.</p>
        )}
      </div>
    </div>
  );
}

function TaxonomyPanel() {
  const taxonomyGroups = [
    {
      label: "Source Status Lifecycle",
      color: "text-indigo-400",
      items: ["DRAFT", "PROCESSING", "REVIEW_REQUIRED", "APPROVED", "ACTIVE", "RESTRICTED", "EXPIRED", "RETIRED", "QUARANTINED", "REJECTED"],
    },
    {
      label: "Retrieval Policy",
      color: "text-emerald-400",
      items: ["ALLOWED", "BLOCKED", "MANDATORY", "OPTIONAL", "CITATION_REQUIRED", "APPROVAL_GATED", "FALLBACK_ONLY"],
    },
    {
      label: "Risk Tier",
      color: "text-amber-400",
      items: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    {
      label: "Authority Level",
      color: "text-purple-400",
      items: ["OFFICIAL", "LEGAL_APPROVED", "PRODUCT_APPROVED", "CUSTOMER_APPROVED", "THIRD_PARTY_REFERENCE", "DRAFT_INTERNAL"],
    },
    {
      label: "Sensitivity Level",
      color: "text-rose-400",
      items: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
    },
    {
      label: "Source Type",
      color: "text-blue-400",
      items: ["PDF", "DOCX", "PPTX", "TXT", "CSV", "MARKDOWN", "HTML", "MANUAL_ARTICLE", "APPROVED_URL", "CONNECTOR"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Taxonomy & Classification Values</h2>
        <p className="text-xs text-zinc-500">Controlled vocabulary for all knowledge objects</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {taxonomyGroups.map((group) => (
          <div key={group.label} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5">
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${group.color}`}>{group.label}</h3>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <span key={item} className="text-[10px] px-2 py-1 bg-zinc-800/60 text-zinc-400 rounded-lg font-bold tracking-wide">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Knowledge Governance Settings</h2>
        <p className="text-xs text-zinc-500">Chunking, embedding, review cadence, citation policy</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Default Review Cadence", value: "90 days", icon: Clock3 },
          { label: "Default Chunking Strategy", value: "Semantic structure", icon: Layers },
          { label: "Embedding Model", value: "text-embedding-3-large", icon: Brain },
          { label: "Citation Policy", value: "Required for claim-sensitive outputs", icon: ShieldCheck },
          { label: "Stale Source Threshold", value: "30 days past review date", icon: AlertTriangle },
          { label: "Duplicate Detection", value: "Enabled — fingerprint + near-duplicate", icon: FlaskConical },
          { label: "PII Scan", value: "Enabled — blocks publication", icon: Lock },
          { label: "Retention Policy", value: "Retired sources: 7 years", icon: Archive },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 flex items-start gap-3">
            <div className="p-2 bg-zinc-800/60 rounded-lg text-zinc-400 shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
        <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Governance Reminder</p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Modifications to chunking strategy, embedding model, or citation policy require all affected sources to be re-processed and re-approved. Changes write to the Evidence Vault and notify AI Operations.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Collection Modal
// ─────────────────────────────────────────────

function CreateCollectionModal({
  onClose,
  onCreate,
  creating,
}: {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    type: KBType;
    risk_tier: RiskTier;
    retrieval_policy: RetrievalPolicy;
    scope: string;
  }) => void;
  creating: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<KBType>("AI_LIBRARY");
  const [riskTier, setRiskTier] = useState<RiskTier>("MEDIUM");
  const [retrievalPolicy, setRetrievalPolicy] = useState<RetrievalPolicy>("ALLOWED");
  const [scope, setScope] = useState("");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">New Knowledge Collection</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Collection Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q4 Brand Voice Guidelines" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Purpose of this collection and what agents use it..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all h-20 resize-none text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Scope / Brand</label>
            <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g. Global / North America / Brand X" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Category</label>
              <select value={type} onChange={(e) => setType(e.target.value as KBType)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                <option value="AI_LIBRARY">AI Library</option>
                <option value="BRAND_GUIDELINES">Brand Guidelines</option>
                <option value="SOP">Operations / SOP</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Risk Tier</label>
              <select value={riskTier} onChange={(e) => setRiskTier(e.target.value as RiskTier)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Retrieval</label>
              <select value={retrievalPolicy} onChange={(e) => setRetrievalPolicy(e.target.value as RetrievalPolicy)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                <option value="ALLOWED">Allowed</option>
                <option value="MANDATORY">Mandatory</option>
                <option value="OPTIONAL">Optional</option>
                <option value="CITATION_REQUIRED">Citation Required</option>
                <option value="APPROVAL_GATED">Approval Gated</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => onCreate({ name, description, type, risk_tier: riskTier, retrieval_policy: retrievalPolicy, scope })}
            disabled={creating || !name}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />CREATING...</>
            ) : (
              <><Plus className="w-4 h-4" />CREATE COLLECTION</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Source Modal (aligned to Section 7 ingestion requirements)
// ─────────────────────────────────────────────

function CreateSourceModal({
  collectionType,
  onClose,
  onCreate,
  creating,
}: {
  collectionType?: KBType;
  onClose: () => void;
  onCreate: (formData: FormData) => void;
  creating: boolean;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [authorityLevel, setAuthorityLevel] = useState<AuthorityLevel>("OFFICIAL");
  const [sensitivityLevel, setSensitivityLevel] = useState<SensitivityLevel>("INTERNAL");
  const [riskTier, setRiskTier] = useState<RiskTier>("MEDIUM");
  const [locale, setLocale] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [fontFamily, setFontFamily] = useState("");

  const handleSubmit = () => {
    if (!title && !selectedFile) return;
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("source_url", sourceUrl);
    formData.append("authority_level", authorityLevel);
    formData.append("sensitivity_level", sensitivityLevel);
    formData.append("risk_tier", riskTier);
    formData.append("locale", locale);
    formData.append("review_date", reviewDate);
    formData.append("expiry_date", expiryDate);
    if (selectedFile) formData.append("file", selectedFile);

    const metadataObj: Record<string, unknown> = {};
    if (collectionType === "BRAND_GUIDELINES") {
      metadataObj.visual_identity = {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        visual_style: visualStyle,
        font_family: fontFamily,
      };
    }
    formData.append("metadata", JSON.stringify(metadataObj));
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ingest Knowledge Source</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Source will be blocked from agents until approved</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Title / Headline *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tone of Voice — Professional Markets" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all" />
          </div>

          {/* Governance metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Authority Level</label>
              <select value={authorityLevel} onChange={(e) => setAuthorityLevel(e.target.value as AuthorityLevel)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                <option value="OFFICIAL">Official</option>
                <option value="LEGAL_APPROVED">Legal Approved</option>
                <option value="PRODUCT_APPROVED">Product Approved</option>
                <option value="CUSTOMER_APPROVED">Customer Approved</option>
                <option value="THIRD_PARTY_REFERENCE">Third-Party Reference</option>
                <option value="DRAFT_INTERNAL">Draft / Internal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Sensitivity</label>
              <select value={sensitivityLevel} onChange={(e) => setSensitivityLevel(e.target.value as SensitivityLevel)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="CONFIDENTIAL">Confidential</option>
                <option value="RESTRICTED">Restricted</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Risk Tier</label>
              <select value={riskTier} onChange={(e) => setRiskTier(e.target.value as RiskTier)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Locale / Market</label>
              <input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="e.g. en-US, en-GB" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Review Date</label>
              <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Expiry Date</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs" />
            </div>
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Source URL (Approved URLs only)</label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
              <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs" />
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
              Document Upload (PDF, DOCX, PPTX, TXT, CSV, MD)
            </label>
            <div className="relative group">
              <input type="file" accept=".pdf,.docx,.pptx,.txt,.csv,.md" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={`w-full bg-zinc-950 border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${selectedFile ? "border-indigo-500/50 bg-indigo-500/5" : "border-zinc-800 group-hover:border-zinc-700"}`}>
                {selectedFile ? (
                  <>
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <FileDigit className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase font-black tracking-tighter">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Will be parsed, chunked, and indexed
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-zinc-900 rounded-xl text-zinc-500">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-zinc-400">Click to upload or drag & drop</p>
                      <p className="text-[10px] text-zinc-600 mt-1 uppercase font-black tracking-tighter max-w-[240px]">
                        Source will be scanned for duplicates, PII, and offensive content before processing
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Brand visual identity — BRAND_GUIDELINES only */}
          {collectionType === "BRAND_GUIDELINES" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="relative py-4 flex items-center gap-4">
                <div className="flex-1 h-px bg-zinc-800/50" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Visual Identity</span>
                <div className="flex-1 h-px bg-zinc-800/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Primary HEX</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-zinc-800" style={{ backgroundColor: primaryColor || "transparent" }} />
                    <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#000000" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Secondary HEX</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-zinc-800" style={{ backgroundColor: secondaryColor || "transparent" }} />
                    <input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="#FFFFFF" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Typography</label>
                  <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                    <input value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} placeholder="e.g. Inter, Roboto" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Style Keywords</label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                    <input value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} placeholder="e.g. Minimal, Vibrant" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual content fallback */}
          <div className="relative py-4 flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-800/50" />
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em]">OR ENTER MANUALLY</span>
            <div className="flex-1 h-px bg-zinc-800/50" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Content / Body</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter guidelines, policy text, or instructions if not uploading a file..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all h-32 resize-none text-sm"
              disabled={!!selectedFile}
            />
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-400 leading-relaxed font-medium">
              This source will enter <strong>DRAFT</strong> status and be blocked from agent retrieval until reviewed and approved by an authorized reviewer.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={creating || (!title && !selectedFile)}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />INGESTING SOURCE...</>
            ) : (
              <><Plus className="w-4 h-4" />INGEST SOURCE TO COLLECTION</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Conflict Modal
// ─────────────────────────────────────────────

function CreateConflictModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { summary: string; severity: ConflictSeverity; source_ids: string[] }) => void;
}) {
  const [summary, setSummary] = useState("");
  const [severity, setSeverity] = useState<ConflictSeverity>("MEDIUM");
  const [sourceIds, setSourceIds] = useState("");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Report Knowledge Conflict</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Conflict Summary *</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Describe the contradictory or duplicate knowledge..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all h-24 resize-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as ConflictSeverity)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                {(["LOW","MEDIUM","HIGH","BLOCKING"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Source IDs (comma-sep)</label>
              <input value={sourceIds} onChange={(e) => setSourceIds(e.target.value)} placeholder="src-001, src-002"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs" />
            </div>
          </div>
          <button onClick={() => onCreate({ summary, severity, source_ids: sourceIds.split(",").map(s => s.trim()).filter(Boolean) })}
            disabled={!summary}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20">
            <Plus className="w-4 h-4" /> REPORT CONFLICT
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<PrimaryTab>("COLLECTIONS");
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<KnowledgeCollection | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [allSources, setAllSources] = useState<KnowledgeSource[]>([]);
  const [conflicts, setConflicts] = useState<KnowledgeConflict[]>([]);
  const [retrievalLogs, setRetrievalLogs] = useState<RetrievalEvent[]>([]);
  const [aiContext, setAiContext] = useState<AIContextResponse | null>(null);
  const [summaryStats, setSummaryStats] = useState<KBSummaryStats | null>(null);
  const [fetchingEntries, setFetchingEntries] = useState(false);
  const [entrySearch, setEntrySearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showCreateSource, setShowCreateSource] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeSource[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [accessPolicy, setAccessPolicy] = useState<any>(null);
  const [showCreateConflict, setShowCreateConflict] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const [basesResult, collectionsResult, contextResult, statsResult] = await Promise.all([
        api.get("/api/v1/knowledge/bases"),
        api.get("/api/v1/knowledge/collections").catch(() => ({ success: false, data: null })),
        api.get("/api/v1/knowledge/ai-context"),
        api.get("/api/v1/knowledge/stats").catch(() => ({ success: false, data: null })),
      ]);
      // Prefer governed collections endpoint, fall back to legacy bases
      if (collectionsResult.success && Array.isArray(collectionsResult.data)) {
        setCollections(collectionsResult.data);
      } else if (basesResult.success) {
        const mapped: KnowledgeCollection[] = (basesResult.data || []).map((b: KnowledgeCollection) => ({
          ...b,
          risk_tier: b.risk_tier ?? "MEDIUM",
          retrieval_policy: b.retrieval_policy ?? "ALLOWED",
        }));
        setCollections(mapped);
      }
      if (contextResult.success) {
        setAiContext(contextResult.data);
        // Derive summary stats from context if backend stats not available
        if (!statsResult.success) {
          const ctx = contextResult.data as AIContextResponse;
          setSummaryStats({
            total_sources: (ctx.ai_library?.length ?? 0) + (ctx.sop_rules?.length ?? 0) + (ctx.brand_voice?.length ?? 0),
            approved_sources: (ctx.ai_library?.length ?? 0) + (ctx.sop_rules?.length ?? 0) + (ctx.brand_voice?.length ?? 0),
            stale_sources: 0,
            review_required: 0,
            active_collections: 0,
            retrieval_errors: 0,
            conflict_flags: 0,
            high_risk_restricted: 0,
          });
        }
      }
      if (statsResult.success && statsResult.data) {
        setSummaryStats(statsResult.data);
      }

      // Fetch conflicts and retrieval logs
      const [conflictsResult, logsResult] = await Promise.all([
        api.get("/api/v1/knowledge/conflicts").catch(() => ({ success: false, data: [] })),
        api.get("/api/v1/knowledge/retrieval-logs").catch(() => ({ success: false, data: [] })),
      ]);
      if (conflictsResult.success) setConflicts(conflictsResult.data ?? []);
      if (logsResult.success) setRetrievalLogs(logsResult.data ?? []);
    } catch (fetchError) {
      console.error("Failed to fetch knowledge data", fetchError);
      setError("Knowledge authority data could not be fully loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEntries = async (collectionId: string) => {
    setFetchingEntries(true);
    try {
      const result = await api.get(`/api/v1/knowledge/bases/${collectionId}/entries`);
      if (result.success) setSources(result.data ?? []);
    } catch (fetchError) {
      console.error("Failed to fetch entries", fetchError);
      setError("Failed to load collection sources.");
    } finally {
      setFetchingEntries(false);
    }
  };

  const fetchAllSources = useCallback(async () => {
    try {
      const result = await api.get("/api/v1/knowledge/sources").catch(() => ({ success: false, data: [] }));
      if (result.success) setAllSources(result.data ?? []);
    } catch {
      // no-op — optional endpoint
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAllSources();
  }, [fetchData, fetchAllSources]);

  const handleCreateCollection = async (data: {
    name: string;
    description: string;
    type: KBType;
    risk_tier: RiskTier;
    retrieval_policy: RetrievalPolicy;
    scope: string;
  }) => {
    if (!data.name) return;
    setCreatingCollection(true);
    try {
      const result = await api.post("/api/v1/knowledge/collections", data).catch(() => api.post("/api/v1/knowledge/bases", data));
      if (result.success) {
        const newCol: KnowledgeCollection = { ...result.data, risk_tier: data.risk_tier, retrieval_policy: data.retrieval_policy };
        setCollections((prev) => [newCol, ...prev]);
        setShowCreateCollection(false);
      }
    } catch (createError) {
      console.error("Failed to create collection", createError);
      setError("Failed to create knowledge collection.");
    } finally {
      setCreatingCollection(false);
    }
  };

  const handleCreateSource = async (formData: FormData) => {
    if (!selectedCollection) return;
    setCreatingSource(true);
    try {
      const result = await api.postMultipart(`/api/v1/knowledge/bases/${selectedCollection.id}/entries`, formData);
      if (result.success) {
        setSources((prev) => [result.data, ...prev]);
        setShowCreateSource(false);
        fetchData();
      }
    } catch (createError) {
      console.error("Failed to create source", createError);
      setError("Failed to ingest knowledge source.");
    } finally {
      setCreatingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm("Remove this source from the knowledge base? Evidence record will be preserved.")) return;
    try {
      await api.delete(`/api/v1/knowledge/entries/${sourceId}`);
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      fetchData();
    } catch (deleteError) {
      console.error("Failed to delete source", deleteError);
      setError("Failed to remove knowledge source.");
    }
  };

  const handleApproveSource = async (sourceId: string) => {
    try {
      await api.post(`/api/v1/knowledge/entries/${sourceId}/approve`, {});
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: "APPROVED" as SourceStatus } : s));
    } catch {
      setError("Failed to approve source. Only authorized reviewers can approve.");
    }
  };

  const handleRetireSource = async (sourceId: string) => {
    if (!confirm("Retire this source? It will no longer be retrievable by agents. Evidence history is preserved.")) return;
    try {
      await api.post(`/api/v1/knowledge/entries/${sourceId}/retire`, {}).catch(() => api.post(`/api/v1/knowledge/sources/${sourceId}/retire`, {}));
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: "RETIRED" as SourceStatus } : s));
    } catch {
      setError("Failed to retire source.");
    }
  };

  const handleRejectSource = async (sourceId: string) => {
    try {
      await api.post(`/api/v1/knowledge/entries/${sourceId}/reject`, {}).catch(() => api.post(`/api/v1/knowledge/sources/${sourceId}/reject`, {}));
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: "REJECTED" as SourceStatus } : s));
    } catch {
      setError("Failed to reject source.");
    }
  };

  const handleActivateSource = async (sourceId: string) => {
    try {
      await api.post(`/api/v1/knowledge/sources/${sourceId}/activate`, {});
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: "ACTIVE" as SourceStatus } : s));
    } catch {
      setError("Failed to activate source.");
    }
  };

  const handlePublishSource = async (sourceId: string) => {
    try {
      await api.post(`/api/v1/knowledge/sources/${sourceId}/publish`, {});
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: "ACTIVE" as SourceStatus } : s));
    } catch {
      setError("Failed to publish source.");
    }
  };

  const handleRestrictSource = async (sourceId: string) => {
    if (!confirm("Restrict this source? It will be blocked from non-privileged agent retrieval.")) return;
    try {
      await api.post(`/api/v1/knowledge/sources/${sourceId}/restrict`, {});
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: "RESTRICTED" as SourceStatus } : s));
    } catch {
      setError("Failed to restrict source.");
    }
  };

  const handleQuarantineSource = async (sourceId: string) => {
    if (!confirm("Quarantine this source? It will be blocked from ALL agent retrieval pending investigation.")) return;
    try {
      await api.post(`/api/v1/knowledge/sources/${sourceId}/quarantine`, {});
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: "QUARANTINED" as SourceStatus } : s));
    } catch {
      setError("Failed to quarantine source.");
    }
  };

  const handleUpdateCollection = async (collectionId: string, data: Partial<KnowledgeCollection>) => {
    try {
      await api.patch(`/api/v1/knowledge/collections/${collectionId}`, data);
      setCollections((prev) => prev.map((c) => c.id === collectionId ? { ...c, ...data } : c));
      setError(null);
    } catch {
      setError("Failed to update collection.");
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm("Delete this collection? All associated sources will remain but the collection association will be removed.")) return;
    try {
      await api.delete(`/api/v1/knowledge/collections/${collectionId}`).catch(() => api.delete(`/api/v1/knowledge/bases/${collectionId}`));
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
      if (selectedCollection?.id === collectionId) setSelectedCollection(null);
    } catch {
      setError("Failed to delete collection.");
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await api.get(`/api/v1/knowledge/search?q=${encodeURIComponent(query)}`).catch(() => api.get(`/api/v1/knowledge/search?query=${encodeURIComponent(query)}`));
      if (res.success) setSearchResults(res.data?.results || res.data?.sources || res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const fetchAccessPolicy = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/knowledge/access-policy").catch(() => ({ success: false, data: null }));
      if (res.success) setAccessPolicy(res.data);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => { fetchAccessPolicy(); }, [fetchAccessPolicy]);

  const handleCreateConflict = async (data: { summary: string; severity: ConflictSeverity; source_ids: string[] }) => {
    try {
      const res = await api.post("/api/v1/knowledge/conflicts", data);
      if (res.success) {
        setConflicts((prev) => [res.data, ...prev]);
        setShowCreateConflict(false);
      }
    } catch (e: any) {
      setError(e.message || "Failed to create conflict report.");
    }
  };

  const handleResolveConflict = async (conflictId: string) => {
    try {
      await api.post(`/api/v1/knowledge/conflicts/${conflictId}/resolve`, {});
      setConflicts((prev) => prev.map((c) => c.id === conflictId ? { ...c, status: "RESOLVED" } : c));
    } catch {
      setError("Failed to resolve conflict.");
    }
  };

  // Render active panel
  const renderPanel = () => {
    switch (activeTab) {
      case "COLLECTIONS":
        return (
          <CollectionsPanel
            collections={collections}
            loading={loading}
            selectedCollection={selectedCollection}
            onSelect={(col) => { setSelectedCollection(col); fetchEntries(col.id); }}
            onCreateClick={() => setShowCreateCollection(true)}
            sources={sources}
            fetchingEntries={fetchingEntries}
            entrySearch={entrySearch}
            setEntrySearch={setEntrySearch}
            onAddSourceClick={() => setShowCreateSource(true)}
            onDeleteSource={handleDeleteSource}
            onApproveSource={handleApproveSource}
            onRetireSource={handleRetireSource}
            onUpdateCollection={handleUpdateCollection}
            onDeleteCollection={handleDeleteCollection}
          />
        );
      case "SOURCES":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">All Sources</h2>
              <p className="text-xs text-zinc-500">Full ingested source inventory across all collections</p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.length > 2) handleSearch(e.target.value); else setSearchResults(null); }}
                placeholder="Search across all sources (3+ characters)..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-sm"
              />
            </div>
            {searchResults !== null ? (
              searchResults.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl opacity-50">
                  <Search className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">No results found for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Search Results ({searchResults.length})</p>
                  {searchResults.map((s) => (
                    <SourceCard key={s.id} source={s} onDelete={handleDeleteSource} onApprove={handleApproveSource} onRetire={handleRetireSource} onActivate={handleActivateSource} onPublish={handlePublishSource} onRestrict={handleRestrictSource} onQuarantine={handleQuarantineSource} />
                  ))}
                </div>
              )
            ) : allSources.length === 0 ? (
              <div className="p-16 text-center border border-dashed border-zinc-800 rounded-3xl opacity-50">
                <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">No sources indexed yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allSources.map((s) => (
                  <SourceCard key={s.id} source={s} onDelete={handleDeleteSource} onApprove={handleApproveSource} onRetire={handleRetireSource} onActivate={handleActivateSource} onPublish={handlePublishSource} onRestrict={handleRestrictSource} onQuarantine={handleQuarantineSource} />
                ))}
              </div>
            )}
          </div>
        );
      case "REVIEW_QUEUE":
        return (
          <ReviewQueuePanel
            sources={allSources.length > 0 ? allSources : sources}
            loading={loading}
            onApprove={handleApproveSource}
            onReject={handleRejectSource}
          />
        );
      case "CONFLICTS":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Conflict Registry</h2>
                <p className="text-xs text-zinc-500 mt-1">Contradictory or duplicate knowledge — agents must not improvise</p>
              </div>
              <button onClick={() => setShowCreateConflict(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all">
                <Plus className="w-3.5 h-3.5" /> Report Conflict
              </button>
            </div>
            <ConflictsPanel conflicts={conflicts} loading={loading} onResolve={handleResolveConflict} />
          </div>
        );
      case "RETRIEVAL_LOGS":
        return <RetrievalLogsPanel logs={retrievalLogs} loading={loading} />;
      case "AGENT_ACCESS":
        return <AgentAccessPanel collections={collections} accessPolicy={accessPolicy} />;
      case "TAXONOMY":
        return <TaxonomyPanel />;
      case "SETTINGS":
        return <SettingsPanel />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Knowledge Base</h1>
          <p className="text-zinc-500 mt-1 font-medium">
            Governed source-of-truth layer — ingest, approve, and control what agents are allowed to know, cite, and retrieve.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-xs ${showGuide ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}
          >
            <HelpCircle className="w-4 h-4" />
            QUICK GUIDE
            {showGuide ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </button>
        </div>
      </div>

      {/* ── Quick Guide ── */}
      {showGuide && (
        <div className="bg-zinc-900/50 border border-indigo-500/20 rounded-[2rem] p-8 animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
                title: "AI Library (The Brain)",
                body: "Upload approved business knowledge so governed agents answer from source truth instead of improvising.",
              },
              {
                icon: Mic2,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
                title: "Brand Center (The Voice)",
                body: "Define tone, visual identity, and language constraints so the authority layer enforces brand consistency.",
              },
              {
                icon: ListChecks,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                title: "Operations (The Rules)",
                body: "Store SOPs and workflow rules so all agent actions route through approved operating procedures.",
              },
              {
                icon: ShieldCheck,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                title: "Approval Gate",
                body: "Every source starts as DRAFT and is blocked from agents until reviewed and approved by an authorized reviewer.",
              },
              {
                icon: Zap,
                color: "text-rose-400",
                bg: "bg-rose-500/10",
                title: "Conflict Control",
                body: "Contradictory sources are flagged automatically. Agents must not improvise — they escalate until the conflict is resolved.",
              },
              {
                icon: ActivitySquare,
                color: "text-indigo-400",
                bg: "bg-indigo-500/10",
                title: "Evidence Vault",
                body: "Every upload, approval, retrieval, and citation writes an immutable evidence record for audit and compliance.",
              },
            ].map(({ icon: Icon, color, bg, title, body }) => (
              <div key={title} className="space-y-3">
                <div className={`p-3 ${bg} rounded-2xl w-fit ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">{title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-amber-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Summary Stats (Section 5 — Top summary cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <SummaryCard label="Total Sources" value={summaryStats?.total_sources ?? collections.length} />
        <SummaryCard label="Approved Sources" value={summaryStats?.approved_sources ?? 0} accent="text-emerald-400" />
        <SummaryCard label="Stale Sources" value={summaryStats?.stale_sources ?? 0} accent={(summaryStats?.stale_sources ?? 0) > 0 ? "text-orange-400" : "text-white"} />
        <SummaryCard label="Review Required" value={summaryStats?.review_required ?? 0} accent={(summaryStats?.review_required ?? 0) > 0 ? "text-amber-400" : "text-white"} />
        <SummaryCard label="Active Collections" value={summaryStats?.active_collections ?? collections.length} accent="text-indigo-400" />
        <SummaryCard label="Retrieval Errors" value={summaryStats?.retrieval_errors ?? 0} accent={(summaryStats?.retrieval_errors ?? 0) > 0 ? "text-rose-400" : "text-white"} />
        <SummaryCard label="Conflict Flags" value={summaryStats?.conflict_flags ?? conflicts.length} accent={(summaryStats?.conflict_flags ?? 0) > 0 ? "text-rose-400" : "text-white"} />
        <SummaryCard label="High-Risk Restricted" value={summaryStats?.high_risk_restricted ?? 0} accent={(summaryStats?.high_risk_restricted ?? 0) > 0 ? "text-rose-400" : "text-white"} />
      </div>

      {/* ── Primary Tabs (Section 5 — Collections, Sources, Review Queue, Conflicts, Retrieval Logs, Agent Access, Taxonomy, Settings) ── */}
      <div className="flex gap-1 flex-wrap bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-1.5">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasBadge =
            (tab.id === "REVIEW_QUEUE" && (summaryStats?.review_required ?? 0) > 0) ||
            (tab.id === "CONFLICTS" && (summaryStats?.conflict_flags ?? conflicts.length) > 0);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-wider flex-1 justify-center min-w-fit ${isActive ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {hasBadge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active Panel ── */}
      {renderPanel()}

      {/* ── AI Context Summary (Brand Voice / Visual Identity / Operational Rules) ── */}
      {activeTab === "COLLECTIONS" && aiContext && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Brand Voice Context</h3>
            <div className="space-y-3">
              {(aiContext.brand_voice || []).slice(0, 3).map((rule) => (
                <div key={`${rule.base_name}-${rule.title}`} className="rounded-2xl border border-zinc-800/60 p-4">
                  <p className="text-xs font-bold text-white">{rule.title}</p>
                  <p className="text-[10px] text-zinc-500 mt-2 line-clamp-3">{rule.guideline}</p>
                </div>
              ))}
              {!aiContext.brand_voice?.length && (
                <p className="text-xs text-zinc-600 italic">No brand voice rules approved yet.</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Visual Identity</h3>
            <div className="space-y-3 text-xs text-zinc-400">
              <p>Primary color: <span className="text-white font-bold">{aiContext.brand_visual?.primary_color || "Not set"}</span></p>
              <p>Secondary color: <span className="text-white font-bold">{aiContext.brand_visual?.secondary_color || "Not set"}</span></p>
              <p>Typography: <span className="text-white font-bold">{aiContext.brand_visual?.font_family || "Not set"}</span></p>
              <p>Style: <span className="text-white font-bold">{aiContext.brand_visual?.visual_style || "Not set"}</span></p>
              {aiContext.meta?.generated_at && (
                <p className="flex items-center gap-1.5 text-zinc-600 pt-2 border-t border-zinc-800/50">
                  <Clock3 className="w-3 h-3 text-indigo-400" />
                  Context snapshot: {new Date(aiContext.meta.generated_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Operational Rules</h3>
            <div className="space-y-3">
              {aiContext.sop_rules.slice(0, 3).map((rule) => (
                <div key={`${rule.base_name}-${rule.title}`} className="rounded-2xl border border-zinc-800/60 p-4">
                  <p className="text-xs font-bold text-white">{rule.title}</p>
                  <p className="text-[10px] text-zinc-500 mt-2 line-clamp-3">{rule.rule}</p>
                </div>
              ))}
              {!aiContext.sop_rules.length && (
                <p className="text-xs text-zinc-600 italic">No SOP rules approved yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showCreateCollection && (
        <CreateCollectionModal
          onClose={() => setShowCreateCollection(false)}
          onCreate={handleCreateCollection}
          creating={creatingCollection}
        />
      )}

      {showCreateSource && (
        <CreateSourceModal
          collectionType={selectedCollection?.type}
          onClose={() => setShowCreateSource(false)}
          onCreate={handleCreateSource}
          creating={creatingSource}
        />
      )}

      {showCreateConflict && (
        <CreateConflictModal
          onClose={() => setShowCreateConflict(false)}
          onCreate={handleCreateConflict}
        />
      )}
    </div>
  );
}