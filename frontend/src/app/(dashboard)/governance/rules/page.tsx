"use client";

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import {
  Plus, Search, RefreshCcw, Trash2, CheckCircle2, AlertCircle,
  Tag, X, SlidersHorizontal, Sparkles, Zap, ChevronDown, ChevronUp,
  ArrowLeft, Ban, Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";

type KeywordAction = "BLOCK" | "REQUEST_REVIEW";

const ACTION_LABELS: Record<KeywordAction, string> = {
  BLOCK: "Block",
  REQUEST_REVIEW: "Request Review",
};

const ACTION_COLOR: Record<KeywordAction, string> = {
  BLOCK: "text-error-text bg-error-bg border-error-border",
  REQUEST_REVIEW: "text-info-text bg-info-bg border-info-border",
};

const ACTION_BORDER: Record<KeywordAction, string> = {
  BLOCK: "border-l-error-border",
  REQUEST_REVIEW: "border-l-info-border",
};

interface Rule {
  id: string;
  name: string;
  keywords: string[];
  action: KeywordAction;
  status: string;
  lastUpdated: string;
}

function mapRule(r: any): Rule {
  const krs = r.keyword_rules || r.keywordRules || [];
  const firstKr = krs[0];
  return {
    id: r.id,
    name: r.rule_name || r.name || "Untitled Rule",
    keywords: firstKr ? (Array.isArray(firstKr.keywords) ? firstKr.keywords : []) : [],
    action: (firstKr?.action as KeywordAction) || "BLOCK",
    status: r.rule_status || r.status || "DRAFT",
    lastUpdated: r.updated_at || r.lastUpdated || "",
  };
}

const AI_EXAMPLES = [
  "profanity & bad words",
  "competitor brand names",
  "violence & self-harm",
  "gambling terms",
  "drug & substance abuse",
  "hate speech & racism",
  "adult content",
  "political controversy",
];

interface ActionPickerProps {
  size?: "sm" | "md";
  editAction: KeywordAction;
  canManage: boolean;
  setEditAction: Dispatch<SetStateAction<KeywordAction>>;
}

const ActionPicker = ({ size = "md", editAction, canManage, setEditAction }: ActionPickerProps) => (
  <div className={`grid grid-cols-2 ${size === "sm" ? "gap-2" : "gap-3"}`}>
    {(["BLOCK", "REQUEST_REVIEW"] as KeywordAction[]).map(a => {
      const active = editAction === a;
      const isBlock = a === "BLOCK";
      return (
        <button
          key={a}
          disabled={!canManage}
          onClick={() => setEditAction(a)}
          className={`flex items-center gap-3 ${size === "sm" ? "p-3" : "p-3.5"} rounded-xl border-[1.5px] text-left transition-all
            ${active
              ? isBlock
                ? "bg-error-bg border-error-border"
                : "bg-info-bg border-info-border"
              : "bg-surface-hover border-border hover:border-border disabled:cursor-not-allowed"
            }`}
        >
          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            ${active ? (isBlock ? "bg-error-text/15" : "bg-info-text/15") : "bg-surface"}`}>
            {isBlock
              ? <Ban className={`w-4 h-4 ${active ? "text-error-text" : "text-foreground-muted"}`} />
              : <Eye className={`w-4 h-4 ${active ? "text-info-text" : "text-foreground-muted"}`} />
            }
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-bold leading-none mb-1 ${active ? (isBlock ? "text-error-text" : "text-info-text") : "text-foreground-muted"}`}>
              {ACTION_LABELS[a]}
            </p>
            <p className="text-[9px] text-foreground-muted leading-snug">
              {isBlock ? "Prevents publication" : "Sends to human review"}
            </p>
          </div>
        </button>
      );
    })}
  </div>
);

interface AiPanelProps {
  aiTopic: string;
  setAiTopic: Dispatch<SetStateAction<string>>;
  aiContext: string;
  setAiContext: Dispatch<SetStateAction<string>>;
  aiGenerating: boolean;
  handleAiGenerate: () => void;
  aiSuggested: string[];
  setAiSuggested: Dispatch<SetStateAction<string[]>>;
  aiSelected: Set<string>;
  setAiSelected: Dispatch<SetStateAction<Set<string>>>;
  editKeywords: string[];
  toggleAiKeyword: (kw: string) => void;
  addAiKeywords: () => void;
  showAiContext: boolean;
  setShowAiContext: Dispatch<SetStateAction<boolean>>;
  setShowAiPanel: Dispatch<SetStateAction<boolean>>;
}

const AiPanel = ({
  aiTopic, setAiTopic, aiContext, setAiContext, aiGenerating, handleAiGenerate,
  aiSuggested, setAiSuggested, aiSelected, setAiSelected, editKeywords,
  toggleAiKeyword, addAiKeywords, showAiContext, setShowAiContext, setShowAiPanel,
}: AiPanelProps) => (
  <div className="rounded-xl border border-info-border bg-info-bg p-4 space-y-3">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-lg bg-info-text/15 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-info-text" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-bold text-info-text">AI Keyword Generator</p>
        <p className="text-[9px] text-foreground-muted">Describe a topic — AI generates relevant keywords to review and add</p>
      </div>
      <button onClick={() => setShowAiPanel(false)} className="text-foreground-muted hover:text-foreground p-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>

    <div>
      <label className="text-[9px] text-info-text/60 font-semibold uppercase tracking-wider block mb-1.5">Topic</label>
      <div className="flex gap-2">
        <input
          value={aiTopic}
          onChange={e => setAiTopic(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !aiGenerating) handleAiGenerate(); }}
          placeholder="e.g. profanity, competitor brands, violence..."
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder-foreground-muted focus:outline-none focus:border-info-border transition-colors"
        />
        <button
          onClick={handleAiGenerate}
          disabled={!aiTopic.trim() || aiGenerating}
          className="px-4 py-2 bg-info-text hover:brightness-110 disabled:opacity-40 text-foreground text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
        >
          {aiGenerating ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          {aiGenerating ? "Generating..." : "Generate"}
        </button>
      </div>
    </div>

    {!aiSuggested.length && !aiGenerating && (
      <>
        <div>
          <p className="text-[9px] text-foreground-muted mb-1.5">Quick examples:</p>
          <div className="flex flex-wrap gap-1.5">
            {AI_EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setAiTopic(ex)}
                className="px-2 py-0.5 bg-surface-hover border border-border text-foreground-muted hover:text-foreground hover:border-info-border rounded-full text-[9px] transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowAiContext(p => !p)}
          className="flex items-center gap-1.5 text-[9px] text-foreground-muted hover:text-info-text transition-colors"
        >
          {showAiContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Add platform/industry context
        </button>
        {showAiContext && (
          <input
            value={aiContext}
            onChange={e => setAiContext(e.target.value)}
            placeholder="e.g. children's education platform, luxury brand, B2B SaaS..."
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder-foreground-muted focus:outline-none focus:border-info-border"
          />
        )}
      </>
    )}

    {aiGenerating && (
      <div className="flex items-center gap-2 text-[10px] text-info-text py-1">
        <div className="w-3.5 h-3.5 border border-info-text border-t-transparent rounded-full animate-spin shrink-0" />
        Analyzing topic and generating keyword variants...
      </div>
    )}

    {aiSuggested.length > 0 && (
      <>
        <div className="flex items-center justify-between">
          <p className="text-[9px] text-info-text/60">{aiSuggested.length} keywords — click to toggle selection</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setAiSelected(new Set(aiSuggested))} className="text-[9px] text-info-text">All</button>
            <span className="text-foreground-muted">·</span>
            <button onClick={() => setAiSelected(new Set())} className="text-[9px] text-foreground-muted hover:text-foreground">None</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
          {aiSuggested.map(kw => {
            const sel = aiSelected.has(kw);
            const exists = editKeywords.includes(kw);
            return (
              <button
                key={kw}
                onClick={() => !exists && toggleAiKeyword(kw)}
                disabled={exists}
                className={`font-mono px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                  exists
                    ? "bg-surface-hover text-foreground-muted border-border cursor-default"
                    : sel
                      ? "bg-info-bg text-info-text border-info-border hover:brightness-110"
                      : "bg-surface-hover text-foreground-muted border-border line-through hover:no-underline hover:text-foreground"
                }`}
              >
                {kw}{exists && <span className="ml-1 text-[7px] not-italic">exists</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={addAiKeywords}
            disabled={aiSelected.size === 0}
            className="px-4 py-1.5 bg-info-text hover:brightness-110 disabled:opacity-40 text-foreground text-xs font-bold rounded-lg transition-all"
          >
            Add {aiSelected.size} keyword{aiSelected.size !== 1 ? "s" : ""}
          </button>
          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating}
            className="px-3 py-1.5 bg-surface-hover border border-border text-foreground-muted hover:text-foreground text-xs rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCcw className="w-3 h-3" /> Regenerate
          </button>
          <button
            onClick={() => { setAiSuggested([]); setAiSelected(new Set()); setAiTopic(""); }}
            className="text-[9px] text-foreground-muted hover:text-foreground ml-auto transition-colors"
          >
            Clear
          </button>
        </div>
      </>
    )}
  </div>
);

interface KeywordsSectionProps {
  editKeywords: string[];
  canManage: boolean;
  removeKeyword: (kw: string) => void;
  kwInput: string;
  setKwInput: Dispatch<SetStateAction<string>>;
  addKeyword: () => void;
}

const KeywordsSection = ({ editKeywords, canManage, removeKeyword, kwInput, setKwInput, addKeyword }: KeywordsSectionProps) => (
  <div className="space-y-3">
    {/* Keyword cloud */}
    <div className="p-3 bg-background border border-border rounded-xl min-h-[72px] flex flex-wrap gap-2 content-start">
      {editKeywords.length === 0 ? (
        <span className="text-[10px] text-foreground-muted italic self-center">
          No keywords yet — add manually below or use AI Suggest above.
        </span>
      ) : (
        editKeywords.map(kw => (
          <span
            key={kw}
            className="inline-flex items-center gap-1.5 font-mono px-2.5 py-1 bg-info-bg text-info-text border border-info-border rounded-md text-[10px] font-medium"
          >
            {kw}
            {canManage && (
              <button onClick={() => removeKeyword(kw)} className="text-info-text/60 hover:text-error-text transition-colors ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        ))
      )}
    </div>

    {/* Manual input */}
    {canManage && (
      <div className="flex gap-2">
        <input
          type="text"
          value={kwInput}
          onChange={e => setKwInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(); } }}
          placeholder="Type a keyword and press Enter, or paste comma-separated list..."
          className="flex-1 font-mono px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder-foreground-muted focus:outline-none focus:border-info-border transition-colors"
        />
        <button
          onClick={addKeyword}
          className="px-3 py-2 bg-info-bg text-info-text border border-info-border rounded-lg text-xs font-bold hover:brightness-110 transition-all"
        >
          Add
        </button>
      </div>
    )}
  </div>
);

export default function ApprovalRulesPage() {
  const { role: currentRole, isSuperAdmin } = useRoles();
  const canManage = isSuperAdmin || ["GOVERNANCE_ADMIN", "ADMIN", "WORKSPACE_OWNER"].includes(currentRole ?? "");

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<"list" | "edit">("list");

  // Edit state
  const [editName, setEditName] = useState("");
  const [editAction, setEditAction] = useState<KeywordAction>("BLOCK");
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");

  // AI panel state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggested, setAiSuggested] = useState<string[]>([]);
  const [aiSelected, setAiSelected] = useState<Set<string>>(new Set());
  const [showAiContext, setShowAiContext] = useState(false);

  const selectedRule = rules.find(r => r.id === selectedId) ?? null;

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/governance/rules");
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map(mapRule);
        setRules(mapped);
        if (mapped.length > 0 && !selectedId) selectRule(mapped[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchRules(); }, []);

  function selectRule(rule: Rule) {
    setSelectedId(rule.id);
    setEditName(rule.name);
    setEditAction(rule.action);
    setEditKeywords([...rule.keywords]);
    setKwInput("");
    setMessage(null);
    setShowAiPanel(false);
    setAiSuggested([]);
    setAiSelected(new Set());
    setAiTopic("");
  }

  function selectRuleMobile(rule: Rule) {
    selectRule(rule);
    setMobileView("edit");
  }

  function addKeyword() {
    const tokens = kwInput.split(",").map(s => s.trim()).filter(Boolean);
    if (!tokens.length) return;
    setEditKeywords(prev => Array.from(new Set([...prev, ...tokens])));
    setKwInput("");
  }

  function removeKeyword(kw: string) {
    setEditKeywords(prev => prev.filter(k => k !== kw));
  }

  async function handleAiGenerate() {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    setAiSuggested([]);
    setAiSelected(new Set());
    try {
      const res = await api.post("/api/v1/governance/rules/ai-suggest", {
        topic: aiTopic,
        context: aiContext || undefined,
        existing_keywords: editKeywords,
        action: editAction,
      });
      if (res.success && Array.isArray(res.keywords)) {
        setAiSuggested(res.keywords);
        setAiSelected(new Set(res.keywords));
      } else {
        setMessage({ type: "error", text: "AI returned no keywords. Try a more specific topic." });
      }
    } catch {
      setMessage({ type: "error", text: "AI generation failed. Try again." });
    } finally {
      setAiGenerating(false);
    }
  }

  function toggleAiKeyword(kw: string) {
    setAiSelected(prev => {
      const next = new Set(prev);
      next.has(kw) ? next.delete(kw) : next.add(kw);
      return next;
    });
  }

  function addAiKeywords() {
    const toAdd = aiSuggested.filter(k => aiSelected.has(k));
    setEditKeywords(prev => Array.from(new Set([...prev, ...toAdd])));
    setAiSuggested([]);
    setAiSelected(new Set());
    setShowAiPanel(false);
    setAiTopic("");
    setAiContext("");
  }

  async function handleCreate() {
    setActionLoading("create");
    try {
      const res = await api.post("/api/v1/governance/rules", {
        rule_name: "New Keyword Rule",
        rule_description: "",
        rule_priority: 5,
        risk_classification: "MEDIUM",
        keyword_rules: [{ keywords: [], action: "BLOCK", scopes: ["title", "description"] }],
      });
      if (res.success && res.data) {
        const mapped = mapRule(res.data);
        setRules(prev => [mapped, ...prev]);
        selectRule(mapped);
        setMobileView("edit");
        setMessage({ type: "success", text: "Rule created." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to create rule." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    setActionLoading("save");
    try {
      const res = await api.patch(`/api/v1/governance/rules/${selectedId}`, {
        rule_name: editName,
        keyword_rules: [{ keywords: editKeywords, action: editAction, scopes: ["title", "description", "image"] }],
      });
      if (res.success) {
        setMessage({ type: "success", text: "Saved." });
        setRules(prev => prev.map(r => r.id === selectedId ? { ...r, name: editName, keywords: editKeywords, action: editAction } : r));
      } else {
        setMessage({ type: "error", text: res.error || "Save failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm("Delete this rule? This cannot be undone.")) return;
    setActionLoading("delete");
    try {
      const result = await api.delete(`/api/v1/governance/rules/${selectedId}`);
      if (!result.success) {
        setMessage({ type: "error", text: result.error || "Delete failed." });
        return;
      }
      const remaining = rules.filter(r => r.id !== selectedId);
      setRules(remaining);
      if (remaining.length > 0) selectRule(remaining[0]);
      else { setSelectedId(null); setEditName(""); setEditKeywords([]); setEditAction("BLOCK"); }
      setMessage({ type: "success", text: "Rule deleted." });
      setMobileView("list");
    } catch {
      setMessage({ type: "error", text: "Delete failed." });
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = rules.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  // ─── Shared sub-components ────────────────────────────────────────────────

  const RuleListCard = ({ rule, onSelect }: { rule: Rule; onSelect: (r: Rule) => void }) => {
    const isSelected = selectedId === rule.id;
    const isBlock = rule.action === "BLOCK";
    const previewKws = rule.keywords.slice(0, 3);
    const overflow = rule.keywords.length - previewKws.length;

    return (
      <button
        onClick={() => onSelect(rule)}
        className={`w-full text-left rounded-xl border border-l-[3px] p-3.5 transition-all relative overflow-hidden min-h-[80px]
          ${isSelected
            ? "bg-info-bg border-info-border border-l-info-border"
            : isBlock
              ? "bg-surface border-border border-l-error-border hover:border-border"
              : "bg-surface border-border border-l-info-border hover:border-border"
          }`}
      >
        {/* Action badge */}
        <span className={`absolute top-3 right-3 font-mono text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border
          ${isBlock ? "text-error-text bg-error-bg border-error-border" : "text-info-text bg-info-bg border-info-border"}`}>
          {ACTION_LABELS[rule.action]}
        </span>

        {/* Name */}
        <p className="text-[12px] font-semibold text-foreground mb-2 pr-16 leading-snug">{rule.name}</p>

        {/* Keyword preview */}
        <div className="flex items-center flex-wrap gap-1">
          {previewKws.map(kw => (
            <span key={kw} className="font-mono text-[9px] bg-surface-hover border border-border rounded px-1.5 py-0.5 text-foreground-muted">{kw}</span>
          ))}
          {overflow > 0 && <span className="text-[9px] text-foreground-muted">+{overflow} more</span>}
          {rule.keywords.length === 0 && <span className="text-[9px] text-foreground-muted italic">No keywords yet</span>}
        </div>

        {/* Case-weight number — large ghost numeral */}
        <span className={`absolute right-3 bottom-1.5 font-mono font-black leading-none tracking-tighter select-none pointer-events-none
          text-[32px] ${isSelected ? "text-info-border/40" : "text-border"}`}>
          {rule.keywords.length}
        </span>
      </button>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-background">

      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE — list view (< md)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={`md:hidden flex flex-col ${mobileView === "edit" ? "hidden" : ""}`}>

        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-foreground">Approval Rules</h1>
              <p className="text-[10px] text-foreground-muted truncate">Keyword rules for content scanning</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canManage && (
                <button
                  onClick={handleCreate}
                  disabled={actionLoading === "create"}
                  className="flex items-center gap-1.5 px-3 py-2 bg-foreground text-background text-xs font-bold rounded-lg disabled:opacity-40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              )}
              <button
                onClick={fetchRules}
                className="p-2 bg-surface border border-border rounded-lg text-foreground-muted"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-info-text" : ""}`} />
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search rules..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-surface border border-border text-foreground placeholder-foreground-muted focus:outline-none focus:border-info-border"
              />
            </div>
          </div>
        </div>

        {/* Toast */}
        {message && (
          <div className={`mx-4 mt-3 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
            message.type === "success"
              ? "bg-success-bg border border-success-border text-success-text"
              : "bg-error-bg border border-error-border text-error-text"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)}><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Rule list */}
        <div className="px-4 py-3 flex flex-col gap-2.5 pb-8">
          {loading ? (
            <div className="flex flex-col items-center py-16 text-foreground-muted gap-3">
              <div className="w-6 h-6 border-2 border-info-text border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Loading rules...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-foreground-muted gap-3 text-center px-6">
              <SlidersHorizontal className="w-8 h-8 opacity-20" />
              <p className="text-sm font-semibold text-foreground">No rules yet</p>
              <p className="text-xs">Create a rule to start filtering content by keyword.</p>
              {canManage && (
                <button onClick={handleCreate} className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-sm font-bold rounded-xl">
                  <Plus className="w-4 h-4" /> Create first rule
                </button>
              )}
            </div>
          ) : (
            filtered.map(rule => (
              <RuleListCard key={rule.id} rule={rule} onSelect={selectRuleMobile} />
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE — editor view (< md)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={`md:hidden flex flex-col ${mobileView !== "edit" ? "hidden" : ""}`}>

        {/* Sticky editor nav bar */}
        <div className="sticky top-0 z-20 bg-background border-b border-border flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1.5 text-info-text text-sm font-medium -ml-1 p-1.5 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Rules
          </button>
          <p className="flex-1 text-sm font-bold text-foreground truncate min-w-0">{editName || "New Rule"}</p>
          {canManage && (
            <button
              onClick={handleSave}
              disabled={actionLoading === "save"}
              className="px-4 py-1.5 bg-foreground text-background text-xs font-bold rounded-lg disabled:opacity-40 shrink-0"
            >
              {actionLoading === "save" ? "Saving..." : "Save"}
            </button>
          )}
        </div>

        {/* Toast */}
        {message && (
          <div className={`mx-4 mt-3 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
            message.type === "success"
              ? "bg-success-bg border border-success-border text-success-text"
              : "bg-error-bg border border-error-border text-error-text"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)}><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Editor content */}
        <div className="flex flex-col gap-5 px-4 pt-5 pb-28">

          {/* Rule name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-foreground-muted">Rule Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              disabled={!canManage}
              placeholder="Name this rule..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:border-info-border disabled:opacity-60 transition-colors"
            />
          </div>

          {/* Action */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-foreground-muted">Action When Triggered</label>
            <ActionPicker size="sm" editAction={editAction} canManage={canManage} setEditAction={setEditAction} />
            <p className="text-[9px] text-foreground-muted">Applied when any keyword is found in asset title, description, or image text.</p>
          </div>

          {/* AI trigger (collapsed entry point on mobile) */}
          {canManage && !showAiPanel && (
            <button
              onClick={() => { setShowAiPanel(true); setAiSuggested([]); setAiSelected(new Set()); setAiTopic(""); }}
              className="flex items-center gap-3 p-3.5 bg-info-bg border border-info-border rounded-xl text-left"
            >
              <div className="w-8 h-8 bg-info-text/15 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-info-text" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-info-text">AI Keyword Suggest</p>
                <p className="text-[9px] text-foreground-muted mt-0.5">Generate relevant keywords from a topic description</p>
              </div>
              <ChevronDown className="w-4 h-4 text-info-text shrink-0" />
            </button>
          )}
          {canManage && showAiPanel && <AiPanel aiTopic={aiTopic} setAiTopic={setAiTopic} aiContext={aiContext} setAiContext={setAiContext} aiGenerating={aiGenerating} handleAiGenerate={handleAiGenerate} aiSuggested={aiSuggested} setAiSuggested={setAiSuggested} aiSelected={aiSelected} setAiSelected={setAiSelected} editKeywords={editKeywords} toggleAiKeyword={toggleAiKeyword} addAiKeywords={addAiKeywords} showAiContext={showAiContext} setShowAiContext={setShowAiContext} setShowAiPanel={setShowAiPanel} />}

          {/* Keywords */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-foreground-muted flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Keywords
              </label>
              {editKeywords.length > 0 && (
                <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 bg-info-bg text-info-text border border-info-border rounded">
                  {editKeywords.length}
                </span>
              )}
            </div>
            <KeywordsSection editKeywords={editKeywords} canManage={canManage} removeKeyword={removeKeyword} kwInput={kwInput} setKwInput={setKwInput} addKeyword={addKeyword} />
          </div>
        </div>

        {/* Sticky save footer */}
        {canManage && (
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-border px-4 py-3 flex items-center gap-3">
            <p className="text-[9px] font-mono text-foreground-muted flex-1 min-w-0 truncate">
              {editKeywords.length} keyword{editKeywords.length !== 1 ? "s" : ""} · {ACTION_LABELS[editAction]}
            </p>
            <button
              onClick={handleSave}
              disabled={actionLoading === "save"}
              className="px-6 py-2.5 bg-foreground text-background text-sm font-bold rounded-xl disabled:opacity-40 transition-all shrink-0"
            >
              {actionLoading === "save" ? "Saving..." : "Save Rule"}
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TABLET + DESKTOP (>= md) — 2-panel layout
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col h-full">

        {/* Page header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Approval Rules</h1>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Keyword rules used by the Validation Desk to scan asset titles, descriptions, and image content
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={handleCreate}
                disabled={actionLoading === "create"}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-foreground hover:opacity-90 disabled:opacity-40 text-background text-xs font-bold rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> New Rule
              </button>
            )}
            <button
              onClick={fetchRules}
              className="p-2 bg-surface border border-border rounded-lg text-foreground-muted hover:text-foreground transition-all"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-info-text" : ""}`} />
            </button>
          </div>
        </div>

        {/* Toast */}
        {message && (
          <div className={`mx-6 mt-3 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold shrink-0 ${
            message.type === "success"
              ? "bg-success-bg border border-success-border text-success-text"
              : "bg-error-bg border border-error-border text-error-text"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* 2-panel body */}
        <div className="flex flex-1 overflow-hidden px-6 py-4 gap-5">

          {/* ── Left: rule list ─────────────────────────────────────────── */}
          <div className="w-[280px] shrink-0 flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search rules..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface border border-border text-foreground placeholder-foreground-muted focus:outline-none focus:border-info-border transition-colors"
              />
            </div>

            {/* Rule cards */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-0.5 scrollbar-none">
              {loading ? (
                <div className="flex flex-col items-center py-10 text-foreground-muted gap-2">
                  <div className="w-5 h-5 border-2 border-info-text border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px]">Loading...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center">
                  <SlidersHorizontal className="w-6 h-6 text-foreground-muted opacity-30 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground-muted">No rules yet</p>
                  {canManage && (
                    <button onClick={handleCreate} className="mt-3 text-[10px] text-info-text hover:underline">
                      Create the first rule →
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(rule => (
                  <RuleListCard key={rule.id} rule={rule} onSelect={selectRule} />
                ))
              )}
            </div>
          </div>

          {/* ── Right: editor ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 bg-surface border border-border rounded-xl overflow-y-auto">
            {!selectedRule ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 text-foreground-muted">
                <SlidersHorizontal className="w-9 h-9 opacity-15 mb-3" />
                <p className="text-sm font-semibold text-foreground">Select a rule to edit</p>
                <p className="text-xs mt-1">Choose a rule from the list, or create a new one.</p>
                {canManage && (
                  <button
                    onClick={handleCreate}
                    disabled={actionLoading === "create"}
                    className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-xs font-bold rounded-lg disabled:opacity-40 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Rule
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 flex flex-col gap-6">

                {/* ── Rule name header ────────────────────────────────── */}
                <div className="pb-5 border-b border-border">
                  <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-foreground-muted block mb-2">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    disabled={!canManage}
                    placeholder="Name this rule..."
                    className="w-full bg-transparent text-xl font-extrabold text-foreground tracking-tight focus:outline-none border-b-2 border-transparent focus:border-info-border transition-colors pb-1 disabled:opacity-60"
                  />
                </div>

                {/* ── Action when triggered ───────────────────────────── */}
                <div>
                  <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-foreground-muted block mb-2.5">
                    Action When Triggered
                  </label>
                  <ActionPicker editAction={editAction} canManage={canManage} setEditAction={setEditAction} />
                  <p className="text-[9px] text-foreground-muted mt-2">
                    Applied when any keyword matches in asset title, description, or image text.
                  </p>
                </div>

                {/* ── AI Keyword Generator ────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-foreground-muted flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI Keyword Generator
                    </label>
                    {canManage && !showAiPanel && (
                      <button
                        onClick={() => { setShowAiPanel(true); setAiSuggested([]); setAiSelected(new Set()); setAiTopic(""); }}
                        className="text-[10px] font-bold text-info-text hover:brightness-110 flex items-center gap-1"
                      >
                        Open <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {canManage && showAiPanel && <AiPanel aiTopic={aiTopic} setAiTopic={setAiTopic} aiContext={aiContext} setAiContext={setAiContext} aiGenerating={aiGenerating} handleAiGenerate={handleAiGenerate} aiSuggested={aiSuggested} setAiSuggested={setAiSuggested} aiSelected={aiSelected} setAiSelected={setAiSelected} editKeywords={editKeywords} toggleAiKeyword={toggleAiKeyword} addAiKeywords={addAiKeywords} showAiContext={showAiContext} setShowAiContext={setShowAiContext} setShowAiPanel={setShowAiPanel} />}
                  {!canManage && (
                    <p className="text-[10px] text-foreground-muted italic">AI suggestions require Governance Admin or above.</p>
                  )}
                </div>

                {/* ── Keywords ────────────────────────────────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-foreground-muted flex items-center gap-1.5">
                      <Tag className="w-3 h-3" /> Keywords
                    </label>
                    {editKeywords.length > 0 && (
                      <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 bg-info-bg text-info-text border border-info-border rounded">
                        {editKeywords.length}
                      </span>
                    )}
                  </div>
                  <KeywordsSection editKeywords={editKeywords} canManage={canManage} removeKeyword={removeKeyword} kwInput={kwInput} setKwInput={setKwInput} addKeyword={addKeyword} />
                </div>

                {/* ── Save row ─────────────────────────────────────────── */}
                {canManage && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="font-mono text-[9px] text-foreground-muted">
                      {editKeywords.length} keyword{editKeywords.length !== 1 ? "s" : ""} · {ACTION_LABELS[editAction]} · title + description + image
                    </p>
                    <button
                      onClick={handleSave}
                      disabled={actionLoading === "save"}
                      className="px-5 py-2 bg-foreground hover:opacity-90 disabled:opacity-40 text-background text-xs font-bold rounded-lg transition-all"
                    >
                      {actionLoading === "save" ? "Saving..." : "Save Rule"}
                    </button>
                  </div>
                )}

                {/* ── Delete zone — demoted and isolated ──────────────── */}
                {canManage && (
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading === "delete"}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 w-full border border-dashed border-border rounded-xl text-left group hover:border-error-border hover:bg-error-bg transition-all disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-foreground-muted group-hover:text-error-text transition-colors shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground-muted group-hover:text-error-text transition-colors">
                        {actionLoading === "delete" ? "Deleting..." : "Delete this rule"}
                      </p>
                      <p className="text-[9px] text-foreground-muted">Removes the rule and all its keywords permanently.</p>
                    </div>
                  </button>
                )}

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
