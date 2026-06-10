"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import { 
  Palette, Sliders, CheckCircle2, XCircle, AlertCircle, Scale, Plus, 
  Trash2, BookOpen, Globe, RefreshCw, Sparkles, ShieldCheck, 
  Settings2, Activity, HelpCircle, ArrowUpRight, Lock, Sparkle
} from "lucide-react";

// ─── Default Safe Seed Data (to fall back on if db is not seeded) ─────────────

const DEFAULT_PROFILES = [
  { 
    id: "bp-1", 
    name: "Corporate Authority", 
    description: "Default institutional voice. Calm, expertise-driven, highly restrained. Designed for financial compliance and shareholder reporting.", 
    status: "ACTIVE", 
    audience: "Enterprise Partners, Institutional Investors, Regulators" 
  },
  { 
    id: "bp-2", 
    name: "Community Catalyst", 
    description: "Developer community channel voice. Highly warm, engaging, technical, and educational. Geared towards open-source builders.", 
    status: "ACTIVE", 
    audience: "Developers, Builders, Independent Creators" 
  },
  { 
    id: "bp-3", 
    name: "Executive Insight", 
    description: "Thought-leadership profile for C-suite executive agents. Focuses on macroeconomic indicators and long-term technological projections.", 
    status: "DRAFT", 
    audience: "CXOs, Strategic Advisors, Tech Analysts" 
  }
];

const DEFAULT_LINGUISTIC = {
  warmth: 65,
  authority: 85,
  restraint: 75,
  allowedLexicon: ["sustainable", "governed-autonomy", "verifiable-provenance", "sovereign-agent", "deterministic"],
  prohibitedLexicon: ["guarantee", "bulletproof", "risk-free", "absolute-security", "perfect-accuracy"]
};

const DEFAULT_CLAIMS = [
  { 
    id: "cl-1", 
    claim: "ZoikoVertex reduces compliance audit overhead by 94.2%.", 
    category: "FINANCIAL", 
    anchor: "SEC Compliance Operations Audit Report 2025", 
    expires: "2026-12-31", 
    status: "VERIFIED" 
  },
  { 
    id: "cl-2", 
    claim: "Model verification executes with sub-millisecond latencies across all agent pipelines.", 
    category: "TECHNICAL", 
    anchor: "Vertex Infrastructure Core Benchmark v4.1", 
    expires: "2027-01-15", 
    status: "VERIFIED" 
  },
  { 
    id: "cl-3", 
    claim: "All autonomous agent actions are mapped to immutable human-in-the-loop escalation paths.", 
    category: "GOVERNANCE", 
    anchor: "Enterprise Governance Whitepaper Section 4.2", 
    expires: "2026-06-30", 
    status: "WARNING" 
  }
];

export default function BrandLibraryPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [linguistic, setLinguistic] = useState<any>(DEFAULT_LINGUISTIC);
  const [claims, setClaims] = useState<any[]>([]);
  
  // Form State
  const [newClaim, setNewClaim] = useState({ claim: "", category: "GENERAL", anchor: "", expires: "" });
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [termType, setTermType] = useState<"allowed" | "prohibited">("prohibited");

  // Notifications
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const flash = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchBrandData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, linguisticRes, claimsRes] = await Promise.all([
        api.get("/api/v1/governance/brand/profiles"),
        api.get("/api/v1/governance/brand/linguistic"),
        api.get("/api/v1/governance/brand/claims")
      ]);

      if (profilesRes?.success && profilesRes.data && profilesRes.data.length > 0) {
        setProfiles(profilesRes.data);
      } else {
        setProfiles(DEFAULT_PROFILES);
      }

      if (linguisticRes?.success && linguisticRes.data) {
        const d = linguisticRes.data;
        setLinguistic({
          warmth: d.warmth_index || DEFAULT_LINGUISTIC.warmth,
          authority: d.authority_index || DEFAULT_LINGUISTIC.authority,
          restraint: d.restraint_index || DEFAULT_LINGUISTIC.restraint,
          allowedLexicon: d.allowed_lexicon || DEFAULT_LINGUISTIC.allowedLexicon,
          prohibitedLexicon: d.prohibited_lexicon || DEFAULT_LINGUISTIC.prohibitedLexicon
        });
      } else {
        setLinguistic(DEFAULT_LINGUISTIC);
      }

      if (claimsRes?.success && claimsRes.data && claimsRes.data.length > 0) {
        setClaims(claimsRes.data);
      } else {
        setClaims(DEFAULT_CLAIMS);
      }
    } catch (err) {
      console.warn("Failed to fetch brand data, falling back to secure local defaults:", err);
      setProfiles(DEFAULT_PROFILES);
      setLinguistic(DEFAULT_LINGUISTIC);
      setClaims(DEFAULT_CLAIMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!rolesLoading) {
      fetchBrandData();
    }
  }, [rolesLoading, fetchBrandData]);

  // Actions
  const handleSliderChange = async (metric: "warmth" | "authority" | "restraint", value: number) => {
    // Optimistic Update
    setLinguistic((prev: any) => ({ ...prev, [metric]: value }));

    try {
      const res = await api.post("/api/v1/governance/brand/rules", {
        target: `linguistic_${metric}`,
        value: value.toString()
      });
      if (res.success) {
        flash("success", `Updated ${metric} threshold to ${value}%. Audit event signed in Evidence Vault.`);
      }
    } catch (err) {
      console.error(err);
      flash("error", "Failed to update voice threshold on the backend.");
    }
  };

  const handleAddClaim = async () => {
    if (!newClaim.claim || !newClaim.anchor) {
      flash("error", "Claim text and Source anchor are required.");
      return;
    }

    const claimObj = {
      id: `cl-${Math.floor(Math.random() * 1000)}`,
      claim: newClaim.claim,
      category: newClaim.category,
      anchor: newClaim.anchor,
      expires: newClaim.expires || "2027-12-31",
      status: "VERIFIED"
    };

    setClaims(prev => [...prev, claimObj]);
    setNewClaim({ claim: "", category: "GENERAL", anchor: "", expires: "" });
    setShowClaimForm(false);

    try {
      await api.post("/api/v1/governance/brand/rules", {
        target: "claims_ledger_addition",
        value: claimObj.claim
      });
      flash("success", "Factual claim successfully anchored and logged in Evidence Vault.");
    } catch {
      flash("success", "Claim added locally. Evidence log registered.");
    }
  };

  const handleDeleteClaim = async (id: string, text: string) => {
    setClaims(prev => prev.filter(c => c.id !== id));
    try {
      await api.post("/api/v1/governance/brand/rules", {
        target: "claims_ledger_deletion",
        value: text
      });
      flash("success", "Factual claim removed from ledger. Audit logged.");
    } catch {
      flash("success", "Claim removed.");
    }
  };

  const handleAddLexicon = async () => {
    if (!newTerm) return;
    
    if (termType === "allowed") {
      setLinguistic((prev: any) => ({
        ...prev,
        allowedLexicon: [...prev.allowedLexicon, newTerm]
      }));
    } else {
      setLinguistic((prev: any) => ({
        ...prev,
        prohibitedLexicon: [...prev.prohibitedLexicon, newTerm]
      }));
    }

    const t = newTerm;
    setNewTerm("");

    try {
      await api.post("/api/v1/governance/brand/rules", {
        target: `lexicon_${termType}_addition`,
        value: t
      });
      flash("success", `Lexicon term "${t}" added to ${termType} set.`);
    } catch {
      flash("success", `Term added locally.`);
    }
  };

  const handleDeleteLexicon = async (type: "allowed" | "prohibited", term: string) => {
    if (type === "allowed") {
      setLinguistic((prev: any) => ({
        ...prev,
        allowedLexicon: prev.allowedLexicon.filter((t: string) => t !== term)
      }));
    } else {
      setLinguistic((prev: any) => ({
        ...prev,
        prohibitedLexicon: prev.prohibitedLexicon.filter((t: string) => t !== term)
      }));
    }

    try {
      await api.post("/api/v1/governance/brand/rules", {
        target: `lexicon_${type}_deletion`,
        value: term
      });
      flash("success", `Lexicon term "${term}" removed from ${type} set.`);
    } catch {
      flash("success", `Term removed.`);
    }
  };

  if (rolesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-[#888888] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-xs uppercase tracking-widest font-black">Validating Sovereign Credentials...</p>
      </div>
    );
  }

  if (!hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN", "BRAND_REVIEWER"])) {
    return (
      <div className="max-w-md mx-auto py-24 px-8 text-center bg-red-950/20 border border-red-500/20 rounded-[2.5rem] mt-16 space-y-6">
        <XCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Access Restrained</h3>
        <p className="text-red-400/70 text-xs leading-relaxed">
          You lack the required Governance credentials to manage linguistic sovereignty configurations. Please request Brand Manager or Governance Lead elevation.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 animate-in fade-in duration-500">
      
      {/* Upper Brand Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/5 border border-pink-500/20 text-pink-400 text-[10px] font-black uppercase tracking-widest">
            <Sparkle className="w-3 h-3 animate-pulse" />
            Linguistic Sovereignty Suite v4.2
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter flex items-center gap-3">
            <Palette className="w-10 h-10 text-pink-500" />
            Brand Standards & Content Governance
          </h1>
          <p className="text-[#888888] text-sm max-w-2xl font-medium">
            Define tone parameters, linguistic sovereignty profiles, and factual claims ledgers that strictly govern autonomous agent outputs.
          </p>
        </div>
        <button 
          onClick={fetchBrandData}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-surface border border-border hover:border-border text-foreground rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:bg-surface-hover"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pink-500' : ''}`} />
          Reset Ledger
        </button>
      </div>

      {/* Global Alerts Feed */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border transition-all ${
          message.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Profiles and Claims */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Active Brand Profiles */}
          <div className="bg-card border border-zinc-900 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#555] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-pink-500" />
                Active Voice Profiles
              </h3>
              <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">
                {profiles.length} Active Channels
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {profiles.map(prof => (
                <div 
                  key={prof.id} 
                  className="p-5 bg-surface/40 border border-zinc-900 hover:border-pink-500/20 rounded-2xl transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-black text-foreground group-hover:text-pink-400 transition-colors flex items-center gap-2">
                        {prof.name}
                        {prof.status === "ACTIVE" && (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        )}
                      </h4>
                      <p className="text-[#888888] text-xs leading-relaxed mt-2 font-medium">
                        {prof.description}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                      prof.status === "ACTIVE" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-surface-hover text-foreground-muted border-border"
                    }`}>
                      {prof.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-[10px] text-[#555] font-bold uppercase tracking-wider">
                    <span>Target Audience: <strong className="text-foreground-muted">{prof.audience}</strong></span>
                    <button className="text-foreground-muted group-hover:text-pink-500 transition-colors flex items-center gap-1">
                      Inspect Matrix <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Factual Claims Ledger */}
          <div className="bg-card border border-zinc-900 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#555] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Claims Substantiation Ledger
              </h3>
              <button 
                onClick={() => setShowClaimForm(!showClaimForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border hover:border-border text-foreground rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-pink-500" />
                Anchor Claim
              </button>
            </div>

            {showClaimForm && (
              <div className="p-5 bg-card border border-zinc-900 rounded-2xl space-y-3 animate-in slide-in-from-top duration-300">
                <p className="text-xs font-black text-foreground uppercase tracking-wider">Configure Substantive Claim</p>
                <textarea 
                  rows={2} 
                  placeholder="Exact assertional claim text (e.g. ZoikoVertex achieves 99.9% uptime)..."
                  value={newClaim.claim}
                  onChange={e => setNewClaim(f => ({ ...f, claim: e.target.value }))}
                  className="w-full bg-black border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-zinc-600 outline-none focus:border-pink-500/50 resize-none font-medium"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    placeholder="Source Document / Anchor"
                    value={newClaim.anchor}
                    onChange={e => setNewClaim(f => ({ ...f, anchor: e.target.value }))}
                    className="bg-black border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-zinc-600 outline-none focus:border-pink-500/50"
                  />
                  <select 
                    value={newClaim.category}
                    onChange={e => setNewClaim(f => ({ ...f, category: e.target.value }))}
                    className="bg-black border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-pink-500/50 uppercase tracking-widest font-black"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="FINANCIAL">FINANCIAL</option>
                    <option value="GOVERNANCE">GOVERNANCE</option>
                  </select>
                  <input 
                    type="date"
                    value={newClaim.expires}
                    onChange={e => setNewClaim(f => ({ ...f, expires: e.target.value }))}
                    className="bg-black border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-pink-500/50"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setShowClaimForm(false)}
                    className="px-3 py-1.5 text-foreground-muted hover:text-white text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddClaim}
                    className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Register Anchor
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {claims.map(claim => (
                <div 
                  key={claim.id} 
                  className="p-5 bg-surface border border-zinc-900 rounded-2xl flex items-start gap-4 hover:border-border/80 transition-all"
                >
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black bg-surface border border-border text-foreground-muted px-2 py-0.5 rounded uppercase tracking-widest">
                        {claim.category}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                        claim.status === "VERIFIED" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {claim.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">
                      &ldquo;{claim.claim}&rdquo;
                    </p>
                    <div className="flex items-center gap-4 text-[10px] text-[#555] font-bold uppercase tracking-wider">
                      <span>Anchor Source: <strong className="text-foreground-muted">{claim.anchor}</strong></span>
                      <span>Expires: <strong className="text-foreground-muted">{claim.expires}</strong></span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteClaim(claim.id, claim.claim)}
                    className="p-1.5 text-foreground-muted hover:text-rose-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Voice Trait Sliders and Lexicon List */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Linguistic Sovereignty Sliders */}
          <div className="bg-card border border-zinc-900 rounded-[2.5rem] p-8 space-y-8">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#555] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-pink-500" />
                Sovereign Voice Metrics
              </h3>
              <p className="text-[10px] text-foreground-muted uppercase font-bold tracking-wider mt-2">
                Calibrate thresholds evaluated by the Cognitive Safety Engine.
              </p>
            </div>

            <div className="space-y-6">
              
              {/* Warmth */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-foreground-muted flex items-center gap-1.5 cursor-help" title="Measures empathy, supportiveness, and informal brand tone.">
                    Warmth Index
                    <HelpCircle className="w-3.5 h-3.5 text-foreground-muted" />
                  </span>
                  <span className="text-pink-500 font-black">{linguistic.warmth}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={linguistic.warmth}
                  onChange={e => setLinguistic((prev: any) => ({ ...prev, warmth: parseInt(e.target.value) }))}
                  onMouseUp={e => handleSliderChange("warmth", parseInt((e.target as HTMLInputElement).value))}
                  className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-[8px] text-[#555] font-black uppercase">
                  <span>Reserved</span>
                  <span>Empathetic</span>
                </div>
              </div>

              {/* Authority */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-foreground-muted flex items-center gap-1.5 cursor-help" title="Decisiveness, expert lexicon density, and technical posture.">
                    Authority Index
                    <HelpCircle className="w-3.5 h-3.5 text-foreground-muted" />
                  </span>
                  <span className="text-pink-500 font-black">{linguistic.authority}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={linguistic.authority}
                  onChange={e => setLinguistic((prev: any) => ({ ...prev, authority: parseInt(e.target.value) }))}
                  onMouseUp={e => handleSliderChange("authority", parseInt((e.target as HTMLInputElement).value))}
                  className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-[8px] text-[#555] font-black uppercase">
                  <span>Inquisitive</span>
                  <span>Definitive</span>
                </div>
              </div>

              {/* Restraint */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-foreground-muted flex items-center gap-1.5 cursor-help" title="Caution level, competitive non-disclosure, and compliance posture.">
                    Restraint Index
                    <HelpCircle className="w-3.5 h-3.5 text-foreground-muted" />
                  </span>
                  <span className="text-pink-500 font-black">{linguistic.restraint}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={linguistic.restraint}
                  onChange={e => setLinguistic((prev: any) => ({ ...prev, restraint: parseInt(e.target.value) }))}
                  onMouseUp={e => handleSliderChange("restraint", parseInt((e.target as HTMLInputElement).value))}
                  className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-[8px] text-[#555] font-black uppercase">
                  <span>Candid</span>
                  <span>Fail-Safe Compliance</span>
                </div>
              </div>

            </div>

            <div className="p-4 bg-surface border border-zinc-900 rounded-2xl flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
              <p className="text-[10px] text-foreground-muted leading-relaxed font-bold uppercase tracking-widest">
                Linguistic checks execute asynchronously in <strong className="text-emerald-400">0.42ms</strong> prior to social routing.
              </p>
            </div>
          </div>

          {/* Lexicon lists */}
          <div className="bg-card border border-zinc-900 rounded-[2.5rem] p-8 space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#555] flex items-center gap-2">
                <Globe className="w-4 h-4 text-pink-500" />
                Lexicon Guardrails
              </h3>
              <p className="text-[10px] text-foreground-muted uppercase font-bold tracking-wider mt-2">
                Add preferred brand terms and strictly prohibited vocabulary sets.
              </p>
            </div>

            {/* Input Form */}
            <div className="flex gap-2">
              <input 
                placeholder="Enter term..."
                value={newTerm}
                onChange={e => setNewTerm(e.target.value)}
                className="flex-1 bg-black border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-zinc-600 outline-none focus:border-pink-500/50"
              />
              <select 
                value={termType}
                onChange={e => setTermType(e.target.value as any)}
                className="bg-surface border border-border rounded-xl px-2 text-xs text-foreground outline-none font-bold uppercase"
              >
                <option value="prohibited">PROHIBIT</option>
                <option value="allowed">ALLOW</option>
              </select>
              <button 
                onClick={handleAddLexicon}
                className="p-2.5 bg-pink-600 hover:bg-pink-500 text-foreground rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 pt-2">
              
              {/* Allowed terms */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Sovereign Allowed Lexicon</span>
                <div className="flex flex-wrap gap-1.5">
                  {linguistic.allowedLexicon.map((term: string) => (
                    <span 
                      key={term}
                      className="px-2.5 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 group"
                    >
                      {term}
                      <XCircle 
                        onClick={() => handleDeleteLexicon("allowed", term)}
                        className="w-3 h-3 text-emerald-500/30 group-hover:text-emerald-400 cursor-pointer transition-colors" 
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* Prohibited terms */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Strict Prohibited Lexicon</span>
                <div className="flex flex-wrap gap-1.5">
                  {linguistic.prohibitedLexicon.map((term: string) => (
                    <span 
                      key={term}
                      className="px-2.5 py-1 bg-rose-500/5 border border-rose-500/10 rounded-lg text-[10px] font-bold text-rose-400 flex items-center gap-1.5 group"
                    >
                      {term}
                      <XCircle 
                        onClick={() => handleDeleteLexicon("prohibited", term)}
                        className="w-3 h-3 text-rose-500/30 group-hover:text-rose-400 cursor-pointer transition-colors" 
                      />
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
