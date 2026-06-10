"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, RefreshCcw, Trash2, CheckCircle2, AlertCircle,
  Tag, X, SlidersHorizontal, Sparkles, Zap, ChevronDown, ChevronUp
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";

type KeywordAction = "BLOCK" | "REQUEST_REVIEW";

const ACTION_LABELS: Record<KeywordAction, string> = {
  BLOCK: "Block",
  REQUEST_REVIEW: "Request Changes",
};

const ACTION_COLOR: Record<KeywordAction, string> = {
  BLOCK: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  REQUEST_REVIEW: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
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

// â”€â”€ AI suggestion prompt examples â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

export default function ApprovalRulesPage() {
  const { role: currentRole, isSuperAdmin } = useRoles();
  const canManage = isSuperAdmin || ["GOVERNANCE_ADMIN", "ADMIN", "WORKSPACE_OWNER"].includes(currentRole ?? "");

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  function addKeyword() {
    const tokens = kwInput.split(",").map(s => s.trim()).filter(Boolean);
    if (!tokens.length) return;
    setEditKeywords(prev => Array.from(new Set([...prev, ...tokens])));
    setKwInput("");
  }

  function removeKeyword(kw: string) {
    setEditKeywords(prev => prev.filter(k => k !== kw));
  }

  // â”€â”€ AI generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (!confirm("Delete this rule?")) return;
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
    } catch {
      setMessage({ type: "error", text: "Delete failed." });
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = rules.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="pb-16 px-4">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Approval Rules</h1>
          <p className="text-[11px] text-gray-500 dark:text-zinc-500">Define keyword rules used by the Validation Desk to scan media titles, descriptions, and image content.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={handleCreate}
              disabled={actionLoading === "create"}
              className="px-3 py-1.5 bg-white hover:bg-zinc-100 disabled:opacity-40 text-black text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Rule
            </button>
          )}
          <button
            onClick={fetchRules}
            className="p-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-500 dark:text-zinc-500 hover:text-white transition-all"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2.5 text-xs font-semibold ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* â”€â”€ 2-panel layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-4 items-start">

        {/* â”€â”€ Left: rule list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="w-[280px] shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-zinc-600" />
            <input
              type="text"
              placeholder="Search rulesâ€¦"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
            {loading ? (
              <div className="flex flex-col items-center py-10 text-gray-400 dark:text-zinc-600 gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px]">Loading...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 text-center text-gray-400 dark:text-zinc-600 text-xs">
                No rules yet.
              </div>
            ) : (
              filtered.map(rule => {
                const isSelected = selectedId === rule.id;
                return (
                  <button
                    key={rule.id}
                    onClick={() => selectRule(rule)}
                    className={`w-full text-left bg-gray-50 dark:bg-zinc-900 border rounded-lg p-3 hover:border-gray-300 dark:border-zinc-700 transition-all border-l-4 ${
                      isSelected ? "border-indigo-500 bg-indigo-500/[0.03] border-l-indigo-500" : "border-gray-200 dark:border-zinc-800 border-l-slate-700"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate mb-1.5">{rule.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold ${ACTION_COLOR[rule.action]}`}>
                        {ACTION_LABELS[rule.action]}
                      </span>
                      <span className="text-[9px] text-gray-400 dark:text-zinc-600">{rule.keywords.length} keyword{rule.keywords.length !== 1 ? "s" : ""}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* â”€â”€ Right: editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-1 min-w-0 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 min-h-[420px]">
          {!selectedRule ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 text-gray-400 dark:text-zinc-600">
              <SlidersHorizontal className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs font-semibold">Select a rule or create a new one</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Rule Name + Delete */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#222]">
                <div className="flex-1">
                  <label className="text-[9px] text-gray-400 dark:text-zinc-600 font-bold uppercase tracking-wider block mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    disabled={!canManage}
                    placeholder="Rule nameâ€¦"
                    className="w-full bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none border-b border-transparent focus:border-indigo-500/40 transition-colors"
                  />
                </div>
                {canManage && (
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading === "delete"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {actionLoading === "delete" ? "Deletingâ€¦" : "Delete"}
                  </button>
                )}
              </div>

              {/* Action */}
              <div>
                <label className="text-[9px] text-gray-400 dark:text-zinc-600 font-bold uppercase tracking-wider block mb-2">Action When Triggered</label>
                <div className="flex gap-2">
                  {(["BLOCK", "REQUEST_REVIEW"] as KeywordAction[]).map(a => (
                    <button
                      key={a}
                      disabled={!canManage}
                      onClick={() => setEditAction(a)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        editAction === a
                          ? ACTION_COLOR[a] + " border-current"
                          : "bg-white/[0.02] text-gray-400 dark:text-zinc-600 border-[#222] hover:text-white hover:border-gray-300 dark:border-zinc-700"
                      }`}
                    >
                      {ACTION_LABELS[a]}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-[#444] mt-1.5">Applied when any keyword is found in asset title, description, or image text.</p>
              </div>

              {/* â”€â”€ Keywords section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] text-gray-400 dark:text-zinc-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3 h-3" />
                    Keywords
                    {editKeywords.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded text-[8px]">
                        {editKeywords.length}
                      </span>
                    )}
                  </label>
                  {canManage && (
                    <button
                      onClick={() => { setShowAiPanel(p => !p); setAiSuggested([]); setAiSelected(new Set()); setAiTopic(""); }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        showAiPanel
                          ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                          : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      AI Suggest
                    </button>
                  )}
                </div>

                {/* â”€â”€ AI Suggestion Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {showAiPanel && (
                  <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-500/[0.04] p-4 space-y-3">

                    {/* Panel header */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-violet-200">AI Keyword Generator</p>
                      </div>
                      <button onClick={() => setShowAiPanel(false)} className="ml-auto text-gray-400 dark:text-zinc-600 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Topic input */}
                    <div>
                      <label className="text-[9px] text-violet-400/60 font-semibold uppercase tracking-wider block mb-1.5">
                        What should the AI generate keywords for?
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={aiTopic}
                          onChange={e => setAiTopic(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !aiGenerating) handleAiGenerate(); }}
                          placeholder="e.g. profanity, competitor brands, violence, gamblingâ€¦"
                          className="flex-1 px-3 py-2 bg-[#0d0d0d] border border-gray-200 dark:border-zinc-800 rounded-lg text-xs text-gray-900 dark:text-white placeholder-[#444] focus:outline-none focus:border-violet-500/40 transition-colors"
                        />
                        <button
                          onClick={handleAiGenerate}
                          disabled={!aiTopic.trim() || aiGenerating}
                          className="px-4 py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-gray-900 dark:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
                        >
                          {aiGenerating
                            ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                            : <Zap className="w-3.5 h-3.5" />}
                          {aiGenerating ? "Generatingâ€¦" : "Generate"}
                        </button>
                      </div>
                    </div>

                    {/* Example chips */}
                    {!aiSuggested.length && !aiGenerating && (
                      <div>
                        <p className="text-[9px] text-gray-400 dark:text-zinc-600 mb-1.5">Quick examples:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {AI_EXAMPLES.map(ex => (
                            <button
                              key={ex}
                              onClick={() => setAiTopic(ex)}
                              className="px-2 py-0.5 bg-gray-200 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-500 hover:text-white hover:border-violet-500/30 rounded-full text-[9px] transition-colors"
                            >
                              {ex}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optional context toggle */}
                    {!aiSuggested.length && !aiGenerating && (
                      <button
                        onClick={() => setShowAiContext(p => !p)}
                        className="flex items-center gap-1.5 text-[9px] text-gray-400 dark:text-zinc-600 hover:text-violet-400 transition-colors"
                      >
                        {showAiContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Add context (platform, audience, industryâ€¦)
                      </button>
                    )}
                    {showAiContext && !aiSuggested.length && (
                      <input
                        value={aiContext}
                        onChange={e => setAiContext(e.target.value)}
                        placeholder="e.g. children's education platform, luxury brand, B2B SaaSâ€¦"
                        className="w-full px-3 py-2 bg-[#0d0d0d] border border-gray-200 dark:border-zinc-800 rounded-lg text-xs text-gray-900 dark:text-white placeholder-[#444] focus:outline-none focus:border-violet-500/40"
                      />
                    )}

                    {/* Generating state */}
                    {aiGenerating && (
                      <div className="flex items-center gap-2 text-[10px] text-violet-400 py-1">
                        <div className="w-3.5 h-3.5 border border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        Analyzing topic, generating smart keyword variantsâ€¦
                      </div>
                    )}

                    {/* Generated keywords */}
                    {aiSuggested.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-violet-400/60">
                            {aiSuggested.length} keywords generated â€” click to toggle
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAiSelected(new Set(aiSuggested))}
                              className="text-[9px] text-violet-400 hover:text-violet-300"
                            >
                              Select all
                            </button>
                            <span className="text-[#444]">Â·</span>
                            <button
                              onClick={() => setAiSelected(new Set())}
                              className="text-[9px] text-gray-400 dark:text-zinc-600 hover:text-white"
                            >
                              None
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto scrollbar-none">
                          {aiSuggested.map(kw => {
                            const selected = aiSelected.has(kw);
                            const alreadyExists = editKeywords.includes(kw);
                            return (
                              <button
                                key={kw}
                                onClick={() => !alreadyExists && toggleAiKeyword(kw)}
                                disabled={alreadyExists}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                                  alreadyExists
                                    ? "bg-white/[0.02] text-[#444] border-white/5 cursor-default"
                                    : selected
                                      ? "bg-violet-500/20 text-violet-200 border-violet-500/40 hover:bg-violet-500/30"
                                      : "bg-white/[0.03] text-gray-500 dark:text-zinc-500 border-white/10 line-through hover:no-underline hover:text-white"
                                }`}
                              >
                                {kw}
                                {alreadyExists && <span className="ml-1 text-[7px] text-gray-400 dark:text-zinc-600">exists</span>}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={addAiKeywords}
                            disabled={aiSelected.size === 0}
                            className="px-4 py-1.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-gray-900 dark:text-white text-xs font-bold rounded-lg transition-all"
                          >
                            Add {aiSelected.size} keyword{aiSelected.size !== 1 ? "s" : ""}
                          </button>
                          <button
                            onClick={() => handleAiGenerate()}
                            disabled={aiGenerating}
                            className="px-3 py-1.5 bg-white/[0.04] border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-500 hover:text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <RefreshCcw className="w-3 h-3" /> Regenerate
                          </button>
                          <button
                            onClick={() => { setAiSuggested([]); setAiSelected(new Set()); setAiTopic(""); }}
                            className="text-[9px] text-gray-400 dark:text-zinc-600 hover:text-white ml-auto transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Keyword chips */}
                <div className="flex flex-wrap gap-2 min-h-[36px] mb-3 p-3 bg-[#0d0d0d] border border-gray-200 dark:border-zinc-800 rounded-lg">
                  {editKeywords.length === 0 ? (
                    <span className="text-[10px] text-[#333] italic self-center">No keywords yet â€” add manually or use AI Suggest.</span>
                  ) : (
                    editKeywords.map(kw => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full text-[10px] font-medium"
                      >
                        {kw}
                        {canManage && (
                          <button onClick={() => removeKeyword(kw)} className="text-indigo-400 hover:text-rose-400 transition-colors">
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
                      placeholder="Type keyword and press Enter or comma to addâ€¦"
                      className="flex-1 px-3 py-2 bg-[#0d0d0d] border border-[#222] rounded-lg text-xs text-gray-900 dark:text-white placeholder-[#444] focus:outline-none focus:border-indigo-500/40 transition-colors"
                    />
                    <button
                      onClick={addKeyword}
                      className="px-3 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold hover:bg-indigo-500/20 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Save */}
              {canManage && (
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-[9px] text-[#444]">
                    {editKeywords.length} keyword{editKeywords.length !== 1 ? "s" : ""} Â· {ACTION_LABELS[editAction]} action
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={actionLoading === "save"}
                    className="px-5 py-2 bg-white hover:bg-zinc-100 disabled:opacity-40 text-black text-xs font-bold rounded-lg transition-all"
                  >
                    {actionLoading === "save" ? "Savingâ€¦" : "Save Rule"}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}


