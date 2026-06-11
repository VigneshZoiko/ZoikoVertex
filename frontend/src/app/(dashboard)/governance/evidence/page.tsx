"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Archive,
  Lock,
  Download,
  AlertTriangle,
  CheckCircle,
  Search,
  RefreshCw,
  Hash,
  Clock,
  Filter,
  Package,
  ChevronRight,
  Gavel,
  X
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────


interface Artifact {
  id: string;
  artifact_uuid: string;
  platform: string;
  status: string;
  risk_level: string;
  risk_score: number;
  defensibility_index: number;
  defensibility_label: string;
  defensibility_color: string;
  is_on_legal_hold: boolean;
  created_at: string;
  content?: string;
  decision_id?: string;
}

interface EvidencePack {
  id: string;
  purpose: string;
  scope_description: string;
  format: string;
  status: string;
  artifact_count: number;
  created_at: string;
  export_hash: string;
}

interface LegalHold {
  id: string;
  object_id: string;
  object_type: string;
  matter_ref: string;
  reason: string;
  applied_by: string;
  workspace_id: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defensibilityBar(score: number) {
  const color =
    score >= 95 ? "bg-emerald-500" :
    score >= 85 ? "bg-amber-400" :
    score >= 70 ? "bg-orange-500" :
    "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#222] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-mono text-[#888] w-7 text-right">{score}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EvidenceVaultPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [packs, setPacks] = useState<EvidencePack[]>([]);
  const [holds, setHolds] = useState<LegalHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"artifacts" | "packs" | "holds">("artifacts");

  // Pack Builder state
  const [showPackBuilder, setShowPackBuilder] = useState(false);
  const [packPurpose, setPackPurpose] = useState("INTERNAL_AUDIT");
  const [packScope, setPackScope] = useState("");
  const [packFormat, setPackFormat] = useState("JSON");
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<EvidencePack | null>(null);

  // Legal Hold state
  const [holdObjectId, setHoldObjectId] = useState("");
  const [holdMatter, setHoldMatter] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [applyingHold, setApplyingHold] = useState(false);

  const fetchAll = async () => {
    try {
      const [artRes, packRes, holdsRes] = await Promise.allSettled([
        api.get("/api/v1/governance/evidence/artifacts"),
        api.get("/api/v1/governance/evidence/packs"),
        api.get("/api/v1/governance/evidence/holds"),
      ]);
      const arts: Artifact[] = artRes.status === "fulfilled" && artRes.value?.success
        ? (Array.isArray(artRes.value.data) ? artRes.value.data : [])
        : [];
      const packsData: EvidencePack[] = packRes.status === "fulfilled" && packRes.value?.success
        ? (Array.isArray(packRes.value.data) ? packRes.value.data : [])
        : [];
      const holdsData: LegalHold[] = holdsRes.status === "fulfilled" && holdsRes.value?.success
        ? (Array.isArray(holdsRes.value.data) ? holdsRes.value.data : [])
        : [];
      setArtifacts(arts);
      setPacks(packsData);
      setHolds(holdsData);
    } catch (err: any) {
      setError(err?.message || "Failed to load evidence data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const buildPack = async () => {
    if (!packScope.trim()) return;
    setBuilding(true);
    try {
      const res = await api.post("/api/v1/governance/evidence/packs", {
        purpose: packPurpose,
        scope_description: packScope,
        format: packFormat
      });
      if (res.success) {
        setBuildResult(res.data.pack);
        fetchAll();
      }
    } catch (err: any) { setError(err?.message || "Failed to build pack"); }
    finally { setBuilding(false); }
  };

  const applyHold = async () => {
    if (!holdObjectId || !holdMatter || !holdReason) return;
    setApplyingHold(true);
    try {
      await api.post("/api/v1/governance/evidence/holds", {
        object_id: holdObjectId,
        object_type: "PUBLISH_INTENT",
        matter_ref: holdMatter,
        reason: holdReason
      });
      setHoldObjectId(""); setHoldMatter(""); setHoldReason("");
      fetchAll();
    } catch (err: any) { setError(err?.message || "Failed to apply hold"); }
    finally { setApplyingHold(false); }
  };

  const downloadPack = async (packId: string, format?: string) => {
    try {
      const blob = await api.getBlob(`/api/v1/governance/evidence/packs/${packId}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence_pack_${packId.slice(0, 8)}.${(format || 'json').toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Download failed');
    }
  };

  const filtered = artifacts.filter(a =>
    !search ||
    a.artifact_uuid?.toLowerCase().includes(search.toLowerCase()) ||
    a.platform?.toLowerCase().includes(search.toLowerCase()) ||
    a.status?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
        <p className="text-[#888] font-mono text-sm">Loading Evidence Vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ddd] p-6 font-sans selection:bg-blue-500/30">

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Archive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">Evidence Vault</h1>
              <p className="text-xs text-[#666]">Sovereign Immutable Audit Chain · Tier-0 Safety Layer</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchAll} className="p-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPackBuilder(!showPackBuilder)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-foreground text-xs font-bold rounded-lg transition-colors"
          >
            <Package className="w-4 h-4" />
            Build Evidence Pack
          </button>
        </div>
      </div>

      {/* ── Evidence Pack Builder ────────────────────────────────────────── */}
      {showPackBuilder && (
        <div className="bg-[#111] border border-blue-500/20 rounded-2xl p-6 mb-8 shadow-[0_0_30px_rgba(59,130,246,0.08)]">
          <h3 className="text-sm font-black text-foreground mb-5 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            Build Compliance Evidence Pack
          </h3>
          {buildResult ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-400 mb-1">Evidence Pack Ready</p>
                <div className="font-mono text-[10px] text-[#888] space-y-1">
                  <p>Pack ID: <span className="text-foreground">{buildResult.id}</span></p>
                  <p>Artifacts: <span className="text-foreground">{buildResult.artifact_count}</span></p>
                  <p>Hash: <span className="text-blue-400 break-all">{buildResult.export_hash}</span></p>
                </div>
                <div className="flex gap-3 mt-3">
                  <button onClick={() => downloadPack(buildResult.id, buildResult.format)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg">
                    <Download className="w-3.5 h-3.5" /> Download {buildResult.format}
                  </button>
                  <button onClick={() => { setBuildResult(null); setPackScope(""); }} className="text-xs text-[#666] hover:text-white">
                    Build Another
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-[#888] mb-1.5 uppercase">Compliance Purpose</label>
                <select value={packPurpose} onChange={e => setPackPurpose(e.target.value)}
                  className="w-full bg-black border border-[#333] focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none">
                  {["INTERNAL_AUDIT","REGULATOR_REQUEST","LITIGATION","CUSTOMER_REVIEW","INCIDENT_REVIEW","EXECUTIVE_REVIEW","LEGAL_DISCOVERY"].map(p => (
                    <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#888] mb-1.5 uppercase">Scope Description</label>
                <input value={packScope} onChange={e => setPackScope(e.target.value)}
                  placeholder="e.g. Q2 2026 finance content review"
                  className="w-full bg-black border border-[#333] focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder-[#555] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#888] mb-1.5 uppercase">Export Format</label>
                <select value={packFormat} onChange={e => setPackFormat(e.target.value)}
                  className="w-full bg-black border border-[#333] focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none">
                  {["JSON","PDF","CSV","ZIP"].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <button onClick={buildPack} disabled={building || !packScope.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-foreground text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-2">
                {building ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                {building ? "Building..." : "Build Pack"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-6 w-fit">
        {(["artifacts", "packs", "holds"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? "bg-[#222] text-foreground shadow" : "text-[#666] hover:text-white"}`}>
            {tab === "artifacts" ? `Artifacts (${artifacts.length})` : tab === "packs" ? `Evidence Packs (${packs.length})` : "Legal Holds"}
          </button>
        ))}
      </div>

      {/* ── Artifacts Tab ──────────────────────────────────────────────────── */}
      {activeTab === "artifacts" && (
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#222] flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search artifacts..." 
                className="w-full bg-black border border-[#2d2d2d] focus:border-[#555] rounded-lg pl-9 pr-4 py-1.5 text-xs text-foreground placeholder-[#555] focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#666]">
              <Filter className="w-3 h-3" /> {filtered.length} results
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#222] bg-[#141414]">
                  {["Artifact ID", "Platform", "Status", "Risk Level", "Defensibility", "Legal Hold", "Created", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[#666] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#666] text-xs">No artifacts found.</td></tr>
                ) : filtered.map((art) => (
                  <tr key={art.id} className="border-b border-[#1a1a1a] hover:bg-[#141414] transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-mono text-blue-400 text-[10px]">{art.artifact_uuid}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-[#222] text-[#ccc] text-[10px] rounded font-medium uppercase">{art.platform || "–"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        art.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" :
                        art.status === "REJECTED" ? "bg-rose-500/10 text-rose-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>{art.status || "–"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold ${
                        art.risk_level === "HIGH" || art.risk_level === "CRITICAL" ? "text-rose-400" :
                        art.risk_level === "MEDIUM" ? "text-amber-400" : "text-emerald-400"
                      }`}>{art.risk_level || "–"} {art.risk_score ? `(${art.risk_score}%)` : ""}</span>
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      {defensibilityBar(art.defensibility_index || 0)}
                    </td>
                    <td className="px-4 py-3">
                      {art.is_on_legal_hold ? (
                        <span className="flex items-center gap-1 text-[10px] text-purple-400 font-bold">
                          <Lock className="w-3 h-3" /> HOLD
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#555]">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-[#666] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(art.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-white transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Packs Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "packs" && (
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#222] bg-[#141414]">
                  {["Pack ID", "Purpose", "Scope", "Format", "Artifacts", "Status", "Hash", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[#666] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#666] text-xs">No evidence packs built yet.</td></tr>
                ) : packs.map(pack => (
                  <tr key={pack.id} className="border-b border-[#1a1a1a] hover:bg-[#141414] transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-blue-400">{pack.id.slice(0,8).toUpperCase()}</td>
                    <td className="px-4 py-3"><span className="text-[10px] text-[#ccc] font-medium">{pack.purpose.replace(/_/g," ")}</span></td>
                    <td className="px-4 py-3 max-w-[200px]"><span className="text-[10px] text-[#888] line-clamp-1">{pack.scope_description}</span></td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-[#222] text-[#ccc] text-[10px] rounded font-bold">{pack.format}</span></td>
                    <td className="px-4 py-3 text-foreground font-bold">{pack.artifact_count}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded font-bold">{pack.status}</span></td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[9px] text-[#666] flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />{pack.export_hash.slice(0,20)}…
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadPack(pack.id, pack.format)} className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-[10px] font-bold rounded transition-colors">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Legal Holds Tab ───────────────────────────────────────────────── */}
      {activeTab === "holds" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111] border border-purple-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-black text-foreground mb-5 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-purple-400" />
              Apply Legal Hold
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#888] mb-1.5 uppercase">Object / Artifact ID</label>
                <input value={holdObjectId} onChange={e => setHoldObjectId(e.target.value)}
                  placeholder="e.g. artifact UUID or publish intent ID"
                  className="w-full bg-black border border-[#333] focus:border-purple-500/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder-[#555] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#888] mb-1.5 uppercase">Matter Reference</label>
                <input value={holdMatter} onChange={e => setHoldMatter(e.target.value)}
                  placeholder="e.g. CASE-2026-1142"
                  className="w-full bg-black border border-[#333] focus:border-purple-500/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder-[#555] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#888] mb-1.5 uppercase">Reason (min 10 chars)</label>
                <textarea value={holdReason} onChange={e => setHoldReason(e.target.value)}
                  placeholder="State grounds for legal preservation..."
                  className="w-full h-20 bg-black border border-[#333] focus:border-purple-500/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder-[#555] resize-none focus:outline-none" />
              </div>
              <button onClick={applyHold} disabled={applyingHold || !holdObjectId || !holdMatter || holdReason.length < 10}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-foreground text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                {applyingHold ? "Applying Hold..." : "Apply Legal Hold"}
              </button>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            <h3 className="text-sm font-black text-foreground mb-5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#888]" />
              Active Legal Holds
            </h3>
            {holds.length === 0 ? (
              <div className="text-center py-10 text-[#666]">
                <Lock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-xs">No active legal holds in this workspace.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holds.map(h => (
                  <div key={h.id} className="p-3 bg-[#0a0a0a] rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-purple-300">{h.matter_ref}</span>
                      <span className="text-[10px] text-[#555]">{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-[#888] mb-1">{h.reason}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[#555]">
                      <span>Object: {h.object_type} · {h.object_id.slice(0, 16)}…</span>
                      <span>· Applied by: {h.applied_by}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
